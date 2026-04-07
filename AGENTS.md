# DoBetter Viber — Agents

This file describes the AI agents used in the DoBetter Viber platform and how they operate.

## Platform Overview

**DoBetter Viber** is a vibe coding SaaS platform where users describe an app idea in chat and the AI builds a complete, working web application. The platform is built with Next.js 16 App Router and deployed on Netlify. AI is powered by Netlify AI Gateway (Claude + GPT auto-provided, no user API keys required).

Repository: `j1mmyc01n/AI-agent-2`  
Deployment: Netlify (`aiagent3.netlify.app`)

---

## Agents

### 1. Project Builder Agent
**File:** `.github/agents/project-builder.md`  
**Activates:** When chat mode = `"build"` or `"saas-upgrade"`  
**Job:** Takes a user's idea and generates a complete 8-file HTML/CSS/JS web application.

**Output structure (always):**
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

**Tools available:**
- `save_artifact` — saves generated files to Netlify Blobs
- `create_project_record` — saves project metadata to DB/Blobs
- `create_github_repo` — creates GitHub repo (if connected)
- `push_code_to_github` — pushes code to GitHub (if connected)
- `web_search` — searches the web via Tavily (if connected)

---

### 2. Chat Agent
**Activates:** When chat mode = `"chat"` (default)  
**Job:** Answers questions, explains code, helps plan features, provides technical advice.

Does NOT generate full projects in this mode. Recommends switching to Build Mode for project generation.

---

### 3. SaaS Upgrade Agent
**Activates:** When chat mode = `"saas-upgrade"`  
**Job:** Takes an existing 8-file HTML/CSS/JS project and upgrades it to a full Next.js SaaS with Neon PostgreSQL, NextAuth, and optionally Stripe.

Uses `BUILD_MODE_INSTRUCTIONS` + `SAAS_UPGRADE_INSTRUCTIONS` from `src/lib/ai/prompts.ts`.

---

## Key Platform Files

| File | Purpose |
|---|---|
| `src/lib/ai/prompts.ts` | `buildSystemPrompt()` — assembles the full system prompt including training and integration status |
| `src/lib/ai/agent.ts` | `runAgent()` — executes the AI agent with tool calling loop |
| `src/lib/ai/tools.ts` | Tool definitions for the agent |
| `src/app/api/chat/route.ts` | POST `/api/chat` — SSE streaming endpoint for chat messages |
| `src/app/api/projects/route.ts` | GET/POST `/api/projects` — project CRUD (DB + Blobs fallback) |
| `src/app/api/integrations/route.ts` | GET/POST `/api/integrations` — API key management |
| `src/lib/db.ts` | Prisma client + `getDatabaseUrl()` with build-phase guards |
| `.dobetter/PROJECT_TRAINING.md` | Full project generation training (embedded in every system prompt) |
| `.github/agents/project-builder.md` | Project builder agent detailed instructions |
| `.github/copilot-instructions.md` | GitHub Copilot instructions for this repo |

---

## Integration Status Flow

1. User connects API keys in **Settings → AI Models / Integrations**
2. Keys saved to DB (if connected) or Netlify Blobs (fallback) via `/api/integrations`
3. On each chat request, `/api/chat` reads the keys and builds `projectContext`
4. `buildSystemPrompt(projectContext)` adds an **Integration Availability** section telling the AI exactly what's connected
5. AI uses only the tools for connected integrations

**Netlify AI Gateway:** Claude and GPT are auto-provided via environment variable injection. No user API key needed for AI functionality. Other integrations (GitHub, Vercel, Tavily, Neon, Netlify) require user-provided keys.

---

## Development

```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
```

**Database:** Neon PostgreSQL via `DATABASE_URL`. Enable Neon integration in Netlify dashboard for automatic provisioning.

**Auth:** NextAuth.js — requires `NEXTAUTH_SECRET` and `NEXTAUTH_URL` env vars.

See `README.md` and `DATABASE_SETUP.md` for full setup instructions.

---

## Training

The full project generation training (13 parts) lives in `.dobetter/PROJECT_TRAINING.md`. It is automatically embedded in every AI system prompt via `buildSystemPrompt()` in `src/lib/ai/prompts.ts`.

The training covers:
1. Reading user prompts
2. Stack selection rules  
3. Folder & file structures (Next.js SaaS, HTML/CSS/JS, E-Commerce, AI Tool)
4. File content standards (CSS variables, components, hooks, API routes)
5. Feature linking (DB → API → Hook → Component)
6. Navigation & routing
7. Database patterns (Neon PostgreSQL)
8. Auth wiring (NextAuth)
9. Stripe integration
10. AI feature wiring (streaming)
11. Toast notification system
12. Generation checklist
13. Anti-stall protocol
