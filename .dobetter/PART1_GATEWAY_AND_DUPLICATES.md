# PART 1 — GATEWAY AND DUPLICATES

> DoBetter Viber Training Document  
> Covers: Netlify AI Gateway detection, provider fallback, code panel deduplication, canonical path enforcement, and task filtering.

---

## 1. NETLIFY AI GATEWAY — PROVIDER DETECTION

### How It Works

Netlify AI Gateway **auto-injects** API keys and base URLs for both Claude and GPT into the environment:

```
ANTHROPIC_API_KEY=<gateway-managed>
ANTHROPIC_BASE_URL=https://<gateway-endpoint>
OPENAI_API_KEY=<gateway-managed>
OPENAI_BASE_URL=https://<gateway-endpoint>
```

No user API keys are required for AI functionality when deployed on Netlify. The platform detects the gateway automatically.

### Detection Logic (`src/lib/ai/agent.ts`)

```
detectAvailableProvider(config):
  1. Check Anthropic first (preferred):
     - config.anthropicKey  OR  process.env.ANTHROPIC_API_KEY
     - Return { provider: "anthropic", apiKey, baseURL }
  2. Check OpenAI second:
     - config.openaiKey  OR  process.env.OPENAI_API_KEY
     - Return { provider: "openai", apiKey, baseURL }
  3. If neither → return null (no provider available)
```

### User Key vs Gateway Key

When a user provides their own API key (saved in Settings > Integrations), the agent uses it **directly** — bypassing the gateway (cheaper for the platform). When no user key exists, it falls back to the gateway-provided keys.

```
const hasUserKey = !!config.anthropicKey && config.anthropicKey !== envKey;
const useGateway = !hasUserKey && !!(envKey && envBase);
```

- **User key set** → `new Anthropic({ apiKey: config.anthropicKey })` (direct)
- **No user key** → `new Anthropic()` (uses env vars from gateway)

### Integration Status in Prompt

`buildSystemPrompt()` in `src/lib/ai/prompts.ts` adds an **Integration Availability** section telling the AI exactly what is connected:

```
## Platform Integration Status
- Anthropic (Claude): ✅ Connected via Netlify AI Gateway (auto-provided)
- OpenAI (GPT): ✅ Connected via Netlify AI Gateway (auto-provided)
- GitHub: ❌ Not connected
- Vercel: ❌ Not connected
- Database: ✅ Connected (Neon PostgreSQL)
```

This prevents the AI from trying to use tools for integrations that aren't available.

---

## 2. CODE PANEL DEDUPLICATION

### The Problem

When the AI agent generates code, it may emit the same file multiple times — especially after a nudge or continuation. Without deduplication, the Code tab would show "20/8 FILES" with duplicate entries for `app.js`, `styles.css`, etc.

### The 8 Canonical Paths

Every user-project build uses EXACTLY these 8 file paths:

```
index.html
src/css/styles.css
src/css/components.css
src/js/config.js
src/js/state.js
src/js/router.js
src/js/components.js
src/js/app.js
```

These are enforced in **three places**:

| Location | Purpose |
|---|---|
| `src/lib/ai/agent.ts` — `CANONICAL_BUILD_PATHS` | Server-side: `save_artifact` rejects files not in this set |
| `src/components/chat/ChatInterface.tsx` — `CANONICAL_BUILD_PATHS` | Client-side: `extractCodeBlocks` filters wrong-path files from UI |
| `src/lib/ai/prompts.ts` — `BUILD_MODE_INSTRUCTIONS` | Prompt-side: AI is instructed to use ONLY these paths |

### Deduplication Algorithm (`extractCodeBlocks`)

Located in `src/components/chat/ChatInterface.tsx`:

```
Step 1: Parse all fenced code blocks from assistant messages
        Regex: /```(\w+)?(?::([^\n]+))?\n([\s\S]*?)```/g
        Skip empty blocks and .gitkeep/.keep files

Step 2: Record last index of each canonical file
        for each block with a filename:
          normalize(filename) → lowercase, strip "(generating...)"
          if filename is in CANONICAL_BUILD_PATHS:
            lastCanonicalIdx.set(clean, i)  // always overwrites → keeps LAST

Step 3: Filter blocks
        - Keep unnamed snippets (no filename)
        - Drop .gitkeep/.keep files
        - Drop wrong-path files (has "/" but NOT a canonical path)
        - Drop "file.txt" entries (tool-call artifacts)
        - For canonical files: keep ONLY the last occurrence
```

### What Gets Filtered Out

| Pattern | Why |
|---|---|
| `src/lib/*.ts` | Next.js-style path — wrong structure |
| `src/pages/*.tsx` | Next.js pages — wrong structure |
| `src/components/Widget.tsx` | Next.js component folder — wrong structure |
| `public/logo.svg` | Wrong — no public/ folder in 8-file structure |
| `file.txt` | Tool-call artifact, not real code |
| `.gitkeep` / `.keep` | Scaffold placeholder, not real content |
| Duplicate `app.js` | Kept only as last occurrence |

---

## 3. SAVE_ARTIFACT PATH VALIDATION

### Server-Side Enforcement (`agent.ts`)

When the AI calls `save_artifact`, the tool handler:

1. **Strips placeholders**: Removes `.gitkeep` and `.keep` files
2. **Validates paths**: Every file path must be in `CANONICAL_BUILD_PATHS`
3. **Rejects invalid**: If ALL files have wrong paths, returns an error with the exact 8 paths the AI must use
4. **Logs skipped**: Valid files are saved; invalid paths are logged and skipped

```
ERROR: All N file(s) have invalid paths: src/lib/db.ts, src/pages/index.tsx.
You MUST use ONLY these 8 exact paths:
  index.html
  src/css/styles.css
  src/css/components.css
  src/js/config.js
  src/js/state.js
  src/js/router.js
  src/js/components.js
  src/js/app.js
```

### Forbidden Paths

These paths indicate the AI tried to generate a Next.js project instead of an HTML/CSS/JS project:

```
FORBIDDEN:
  src/lib/          → use src/js/
  src/pages/        → use Router.register() in router.js
  src/styles/       → use src/css/
  public/           → no public/ folder
  src/components/   → use src/js/components.js (single file)
  .gitkeep, .keep   → never generate these
```

---

## 4. TOOL ORDERING ENFORCEMENT

### The Rule

`create_project_record` must ALWAYS come AFTER `save_artifact`. If the AI tries to create the project record before saving files, the agent rejects it with a detailed 11-step ordering instruction:

```
STOP. You called create_project_record before saving files.
Follow this EXACT order:
1. Output the task list checkbox
2. Write index.html — FULL complete file, 100+ lines
3. Write src/css/styles.css — FULL complete file
4. Write src/css/components.css — FULL component styles
5. Write src/js/config.js
6. Write src/js/state.js — with 10+ realistic demo data items
7. Write src/js/router.js
8. Write src/js/components.js — with createSidebar, createNavbar, createStatCard, createChart
9. Write src/js/app.js — tailwind.config at TOP, then init()
10. Call save_artifact with all 8 files
11. THEN call create_project_record
```

### Implementation

Both `runOpenAIAgent` and `runAnthropicAgent` track an `artifactSaved` flag:

- Starts `false`
- Set to `true` when `save_artifact` returns "Saved ..." or "Updated ..."
- `create_project_record` is rejected while `artifactSaved === false`

---

## 5. BLOCKED TASK PATTERNS

### The Problem

The AI sometimes includes meta-tasks in its task list that describe internal behavior rather than user-visible work — e.g., "Delegate files to Claude API" or "Create folder scaffold". These confuse users.

### Solution

`BLOCKED_TASK_PATTERNS` in `ChatInterface.tsx` is an array of regex patterns that suppress these tasks from the UI:

```
Blocked categories:
- Scope of work docs: "scope of work", "build scope"
- AI delegation: "delegate", "files to Claude/GPT/AI"
- Using AI to generate: "using Claude API to generate"
- Calling AI APIs: "call Claude API"
- Scaffold tasks: "scaffold project", "folder scaffold", "boilerplate"
- Folder setup: "creating folder structure", "initializing project skeleton"
- Tool noise: "file.txt", "artifact saved", "save_artifact", "create_project_record"
```

### Todo Deduplication

`extractTodos` also deduplicates task items:

```
Strategy: LAST SEEN STATUS WINS
- Map normalized title → { title, status, insertOrder }
- If task "index.html" appears first as [ ] then as [x], result shows [x]
- Re-sorts by insertion order to preserve task sequence
```

---

## CHECKLIST

When implementing changes related to gateway or deduplication:

- [ ] Gateway env vars detected: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`
- [ ] User key takes priority over gateway key
- [ ] `detectAvailableProvider()` checks Anthropic first, OpenAI second
- [ ] Integration status section in system prompt reflects actual state
- [ ] `CANONICAL_BUILD_PATHS` is identical in agent.ts, ChatInterface.tsx, and prompts.ts
- [ ] `extractCodeBlocks` deduplicates: last occurrence wins for canonical files
- [ ] Wrong-path files (Next.js-style) are filtered from UI and rejected by save_artifact
- [ ] `.gitkeep`, `.keep`, `file.txt` are always filtered
- [ ] `create_project_record` is blocked until `save_artifact` succeeds
- [ ] `BLOCKED_TASK_PATTERNS` suppress all meta-task noise
