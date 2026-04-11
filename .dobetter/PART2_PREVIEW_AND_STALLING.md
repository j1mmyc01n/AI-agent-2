# PART 2 — PREVIEW AND STALLING

> DoBetter Viber Training Document  
> Covers: Preview panel inlining, iframe rendering, agent stalling prevention, loop guards, nudge system, and JS loading order.

---

## 1. PREVIEW PANEL — HOW IT WORKS

### The Problem

The preview panel renders user projects in a sandboxed iframe. The AI generates 8 separate files, but the iframe needs a single HTML document. If CSS/JS files aren't inlined into the HTML, the iframe shows a **blank page**.

### The Solution: `buildInlinedSrcDoc()`

Located in `src/components/workspace/PreviewPanel.tsx`, this function takes the array of code blocks and produces a single `srcdoc` string for the iframe:

```
Input: 8 code blocks (index.html + 2 CSS + 5 JS)
Output: Single HTML string with all CSS/JS inlined

Process:
1. Find the HTML entry point (index.html)
2. Build filename → content lookup map
3. Replace <link href="src/css/styles.css"> with <style>content</style>
4. Replace <script src="src/js/app.js"> with <script>content</script>
5. Keep CDN/absolute URLs (https://) unchanged
6. Return the fully inlined HTML
```

### File Map Construction

The filename lookup handles both full paths and basenames:

```
For each code block with a filename:
  1. Clean the filename: strip "(generating...)", strip leading "./"
  2. Index by full path: fileMap["src/css/styles.css"] = content
  3. Index by basename: fileMap["styles.css"] = content (if not already set)
```

This means `<link href="styles.css">` and `<link href="src/css/styles.css">` both resolve correctly.

### CSS Inlining

```html
<!-- Before -->
<link rel="stylesheet" href="src/css/styles.css">

<!-- After -->
<style>
/* inlined: src/css/styles.css */
:root { --bg-primary: #080810; ... }
</style>
```

Rules:
- CDN URLs (`https://`, `//`) → **kept as-is** (e.g., Google Fonts, Tailwind CDN)
- Local paths → replaced with inline `<style>` containing the file content
- If file not found in map → tag is removed (prevents broken links)

### JS Inlining

```html
<!-- Before -->
<script src="src/js/app.js" defer></script>

<!-- After -->
<script>
/* inlined: src/js/app.js */
const App = { init() { ... } };
</script>
```

Rules:
- CDN URLs → **kept as-is** (e.g., Chart.js, Tailwind CDN)
- Local paths → replaced with inline `<script>` containing the file content
- `src` and `defer` attributes are stripped from the inlined tag
- If file not found in map → tag is removed

### Security: Escape Closing Tags

Inlined content must be escaped to prevent breaking out of the inline block:

```javascript
// CSS: prevent </style> in content from closing the <style> tag
const safeContent = content.replace(/<\/style/gi, "<\\/style");

// JS: prevent </script> in content from closing the <script> tag
const safeContent = content.replace(/<\/script/gi, "<\\/script");
```

Without this, a string like `document.write("</script>")` would break the HTML.

### No HTML? Fallback Shell

If no `index.html` block exists, a minimal HTML shell wraps all CSS and JS:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>/* all CSS blocks concatenated */</style>
</head>
<body>
  <script>/* all JS blocks concatenated */</script>
</body>
</html>
```

---

## 2. JS LOADING ORDER

### The Problem

JavaScript files have dependencies. `app.js` depends on `components.js` which depends on `state.js` which depends on `config.js`. If they load in the wrong order, functions are undefined and the app breaks.

### Priority-Based Sorting (`sortJsBlocks`)

```
Priority 0 (load first):  config.js, constants
Priority 1:               state.js
Priority 2:               router.js
Priority 3:               components.js
Priority 4:               api.js, helpers
Priority 5 (load last):   app.js (bootstrap/init)
```

This ensures:
- Config values are available before state initializes
- State is available before router reads it
- Router is available before components register routes
- Components are available before app.js calls `init()`

---

## 3. REACT/JSX PREVIEW

For projects using React (detected by JSX syntax), `buildReactPreview()` creates a different shell:

```html
- React 18 CDN (react, react-dom)
- Babel Standalone for JSX transformation
- All CSS inlined in <style>
- All JSX inlined in <script type="text/babel">
```

This is separate from the standard 8-file HTML/CSS/JS preview and only activates when React blocks are detected.

---

## 4. AGENT STALLING PREVENTION

### The Problem

The AI agent can get stuck in several ways:
1. **Infinite tool loops** — keeps calling tools without producing code
2. **Premature project record** — calls `create_project_record` before writing any files
3. **Planning paralysis** — outputs "scope of work" text instead of actual code
4. **Partial file abandonment** — starts a file, gets interrupted, never finishes

### MAX_TOOL_LOOPS Guard

Both `runOpenAIAgent` and `runAnthropicAgent` enforce a hard limit:

```
let loopCount = 0;
const MAX_TOOL_LOOPS = 20;

while (continueLoop && loopCount < MAX_TOOL_LOOPS) {
  loopCount++;
  // ... process streaming response and tool calls ...
}

if (loopCount >= MAX_TOOL_LOOPS) {
  // Warn user and stop
  finalResponse += "⚠️ Build Complete — All files have been generated.
    Check the Code and Preview tabs.
    Use the Nudge button if anything is missing.";
  onChunk(msg);  // Stream to client
}
```

The limit was set at 20 (reduced from 25) because:
- A typical 8-file build needs 2-3 loops (code + save_artifact + create_project_record)
- 20 is generous enough for complex projects with web searches
- Anything beyond 20 indicates the agent is stuck

### Tool Ordering Enforcement

`create_project_record` before `save_artifact` → rejected with 11-step instructions (see PART 1).

### Prompt-Level Anti-Stall

The `BUILD_MODE_INSTRUCTIONS` in `prompts.ts` contains explicit anti-stall rules:

```
NEVER DO:
- Output a "scope of work" document before code
- Output planning text before the first code block
- Leave any file partially written
- Create a file that imports from a non-existent module
- Use placeholder text: "TODO", "Coming soon", "FIXME"
```

### Anti-Stall Protocol (from PROJECT_TRAINING.md Part 13)

When the agent gets stuck, these rules activate:

```
- Partial file? → Finish it completely NOW
- Missing import? → Create the imported file immediately
- Unclear feature? → Pick simplest interpretation and build it
- Unfamiliar library? → Use the most popular option
- Task too large? → Split into layers (DB → API → Hook → Component)
- Something broken? → Fix it before creating any new files
```

---

## 5. NUDGE SYSTEM

### What It Does

When the agent appears stuck (long silence, no new code), the user can click the **Nudge** button. This sends a continuation prompt to the agent.

### Cycling Nudge Prompts

Instead of one generic nudge, the system cycles through targeted prompts based on the agent's progress:

```
Nudge 1 (few tool calls, no code): "Continue building — write the next code file"
Nudge 2 (some tool calls, some code): "Keep going — complete the remaining files"
Nudge 3 (many tool calls, most code): "Almost done — finish the last files and call save_artifact"
Nudge 4 (save done, no record): "Files saved — now call create_project_record to finish"
Nudge 5 (everything done): "Build complete — check the Code and Preview tabs"
```

### Continuation Guard

When the nudge triggers `sendMessage` in build/saas-upgrade mode:
- It passes `isAutoContinuation = true`
- This prevents resetting `agentTodos`, `workflowTodos`, and `buildContinuationCountRef`
- Without this guard, every nudge would wipe the task progress

---

## 6. WHY THE PREVIEW WAS BLANK

### Root Cause

The old code used `stripLocalExternalRefs()` which **deleted** local `<link>` and `<script src>` tags instead of inlining their content. Since the iframe can't make file requests, nothing loaded.

### Fix

Replace `stripLocalExternalRefs()` with `buildInlinedSrcDoc()`:

```
Before: <link href="styles.css">  →  (removed)     → blank page
After:  <link href="styles.css">  →  <style>...</style>  → styled page
```

### All 8 Files Must Be Complete

The preview only works when ALL 8 files contain real code. If `buildInlinedSrcDoc()` can't find a file in `fileMap`, it strips the tag and that part doesn't load. This is why:

- The agent must NOT call `create_project_record` until all 8 files are written
- Every file must contain complete, working code (no stubs, no TODO)
- The `save_artifact` tool must receive all 8 files in a single call

---

## CHECKLIST

When implementing changes related to preview or stalling:

- [ ] `buildInlinedSrcDoc()` inlines ALL local CSS via `<style>` replacement
- [ ] `buildInlinedSrcDoc()` inlines ALL local JS via `<script>` replacement
- [ ] CDN URLs (https://, //) are preserved as-is in both CSS and JS
- [ ] `</style>` and `</script>` in inlined content are escaped
- [ ] File map handles both full paths and basenames
- [ ] JS files load in correct dependency order (config → state → router → components → app)
- [ ] `MAX_TOOL_LOOPS = 20` in both OpenAI and Anthropic agent loops
- [ ] Loop exhaustion streams a warning message to the client via `onChunk()`
- [ ] Nudge prompts cycle based on agent progress (not generic)
- [ ] Nudge passes `isAutoContinuation = true` to prevent state reset
- [ ] Anti-stall protocol rules are in SYSTEM_PROMPT
- [ ] No file is ever left partially written
