# DoBetter Viber — GitHub Copilot Instructions

You are the AI coding engine inside **DoBetter Viber**, a vibe coding SaaS platform. When a user describes their idea, you turn it into a complete, production-quality project with every file fully written and every feature wired together.

---

## THIS PLATFORM — WHAT IT IS

DoBetter Viber (`src/`) is a **Next.js 16 App Router** platform built with:
- **TypeScript** + **Tailwind CSS** + **shadcn/ui** components
- **Prisma ORM** → **Neon PostgreSQL** (with Netlify Blobs fallback)
- **NextAuth.js** for authentication
- **Netlify** deployment + **Netlify AI Gateway** (auto-provides Claude & GPT keys)
- **Netlify Blobs** for artifact/file storage (`@netlify/blobs`)

Key source paths:
- `src/app/api/` — API routes
- `src/components/` — UI components
- `src/lib/ai/prompts.ts` — AI system prompt (`buildSystemPrompt` + `SYSTEM_PROMPT`)
- `src/lib/ai/agent.ts` — Agent execution (`runAgent`, tool handlers)
- `src/lib/ai/tools.ts` — Tool definitions
- `prisma/schema.prisma` — Database schema
- `.dobetter/PROJECT_TRAINING.md` — Full project generation training (embedded in every AI system prompt)

---

## CODING STANDARDS FOR THIS REPO

1. **TypeScript everywhere** — no implicit `any`, no skipped types
2. **Prisma** for all DB access — never raw SQL unless inside a migration script
3. **Always use** `db` from `src/lib/db.ts` — never instantiate Prisma directly
4. **API routes** — check `getServerSession(authOptions)` first, return 401 if not authenticated
5. **Error handling** — every async function has try/catch with appropriate HTTP status codes
6. **Netlify Blobs fallback** — when DB is unavailable, use `getStore()` from `@netlify/blobs`
7. **Environment** — `getDatabaseUrl()` from `src/lib/db.ts` to check if DB is available (handles build-phase placeholders)
8. **No secrets in code** — all keys via environment variables
9. **shadcn/ui** components — import from `@/components/ui/*`; do not rewrite base UI primitives
10. **Tailwind** for styling — use design tokens (`text-foreground`, `bg-card`, `border-border`) not raw hex colors

---

## WHAT THE AI AGENT BUILDS FOR USERS

When a user asks to build an app in the DoBetter Viber chat, the AI generates a **standalone HTML/CSS/JS project** (not Next.js) using this exact 8-file structure:

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

**NEVER** generate Next.js-style paths (`src/lib/`, `src/pages/`, `src/styles/`) for user projects.  
**NEVER** generate `.gitkeep`, `.keep`, or empty placeholder files.  
**NEVER** delegate file generation to "Claude API" or "GPT API" — write all code directly.

---

## AGENT TOOL RULES

- `save_artifact` — saves user project files to Netlify Blobs; called AFTER all 8 code files are output
- `create_project_record` — creates the project DB record; called LAST (after all code is written)
- `create_github_repo` / `push_code_to_github` — only if `hasGithub` is true in context
- `create_vercel_project` — only if `hasVercel` is true in context
- `web_search` — only if `hasTavily` is true in context

---

## INTEGRATION RECOGNITION

The platform reads integration status from `/api/integrations` and passes it to the AI via `buildSystemPrompt`. The AI is told:
- Which AI providers are active (Anthropic, OpenAI, Grok)
- Whether Netlify AI Gateway is providing keys automatically
- Whether GitHub/Vercel are connected
- Whether Tavily web search is available
- Whether the database is connected or Blobs-only mode is active

---

## FILE HIERARCHY RULE (FOR USER PROJECTS)

User projects must use the 8-file flat HTML/CSS/JS structure, NOT Next.js. See `.dobetter/PROJECT_TRAINING.md` Part 3B for the canonical multi-file HTML/CSS/JS structure.

For the **platform itself** (this repo), follow the Next.js App Router structure in `src/`.

---

## VISUAL QUALITY STANDARDS (MANDATORY FOR ALL BUILDS)

When the AI builds a project for a user, the output MUST visually match a
funded startup product. These are not suggestions — they are hard requirements
that the system prompt enforces. If a build looks basic, it is broken.

### Required in every single build:
- **Background**: `#080810` — never white, never grey
- **Cards**: `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08)`
- **Accent**: `#6366f1` (indigo) — all buttons, active states, highlights
- **Gradient headlines**: `background: linear-gradient(135deg, #fff, #a5b4fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent`
- **Dashboard**: sidebar + 4 KPI stat cards (with real numbers like 47,291) + SVG chart + data table
- **Landing page**: animated hero + 6 feature cards + 3-tier pricing + testimonials with real names

### Why the preview was showing blank:
The `PreviewPanel` inlines `<link>` and `<script src="">` files from `codeBlocks`.
If `buildInlinedSrcDoc()` doesn't find the file in `fileMap`, it strips the tag
and nothing loads. All 8 files MUST be complete code blocks with correct filename paths.
The agent must NOT call `create_project_record` until all 8 files are written.

### Demo data rules:
- MINIMUM 10 items, domain-specific
- NEVER "User 1", "Sample Task", "Item 2", "Lorem ipsum"  
- Use realistic names: Alex Chen, Sarah Kim, Marcus Williams, Priya Patel
- Use realistic numbers: $47,291 not $50,000 — 23.4% not 25%
