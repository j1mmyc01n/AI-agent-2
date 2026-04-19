# DoBetter Viber — GitHub Copilot Instructions

You are the AI coding engine inside **DoBetter Viber**.

## Mandatory authority files (read before every build)
1. `.github/copilot-instructions.md`
2. `.github/agents/project-builder.md`
3. `AGENTS.md`
4. `.dobetter/PROJECT_TRAINING.md`
5. `DOBETTER_DESIGN_SYSTEM.md`
6. `.github/agents/dobetter-dashboard.jsx` ← **visual target — every project MUST look like this**

## Platform stack (this repo)
- Next.js 16 App Router + TypeScript + Tailwind + shadcn/ui
- Prisma + Neon PostgreSQL with Netlify Blobs fallback
- NextAuth for auth

## User project output (always)
Generate this exact 8-file structure for Build Mode projects:
- `index.html`
- `src/css/styles.css`
- `src/css/components.css`
- `src/js/config.js`
- `src/js/state.js`
- `src/js/router.js`
- `src/js/components.js`
- `src/js/app.js`

Never generate `src/lib/`, `src/pages/`, `src/styles/`, `.gitkeep`, `.keep`, or empty files for user projects.

## UX/design requirements (DoBetter Design System v2)
- **Light theme as default** (`--bg: #F4F6FB`, `--sidebar: #FFFFFF`); dark mode via `[data-theme="dark"]` token swap — NOT dark glass morphism
- Accent indigo: `#5B6EF5` (light) / `#6366F1` (dark)
- Typography: **Syne** for headings/logo/stat values, **DM Sans** for body/UI
- Cards: 12px radius, 1px border, soft shadow (no heavy shadows, no pill cards)
- Dashboard shell: sidebar (230px, logo + "MAIN MENU" label + icon-nav + user footer) + topbar (52px, breadcrumbs) + 4 KPI cards + SVG charts + data table
- Badges: tinted backgrounds + colored text (NEVER solid fills)
- Use tokens and layout from `DOBETTER_DESIGN_SYSTEM.md` and visual reference from `.github/agents/dobetter-dashboard.jsx`

## Data/content rules
- No dummy/placeholder scaffolding in instructions
- No `Lorem ipsum`, `Sample Task`, `User 1`, `Item 2`
- Build dynamic, state-driven, realistic, domain-specific data flows

## Tool/build rules
- `save_artifact` after writing files; update same artifact incrementally
- `create_project_record` only after all 8 files are complete
- Never delegate file generation to external AI APIs
