# DoBetter Viber — Agents

## Platform
DoBetter Viber is a Next.js 16 App Router platform where users request projects and the AI generates complete implementations.

## Authority docs (must be read before build generation)
1. `.github/copilot-instructions.md`
2. `.github/agents/project-builder.md`
3. `AGENTS.md`
4. `.dobetter/PROJECT_TRAINING.md`
5. `DOBETTER_DESIGN_SYSTEM.md`

## Agents

### 1) Project Builder Agent
- Activated in `build` and `saas-upgrade` modes
- Generates user projects with the mandatory 8-file HTML/CSS/JS structure
- Applies DoBetter Design System v2 tokens, layout hierarchy, and component rules
- Uses dynamic state-driven data flows (no dummy/placeholder scaffolding)

### 2) Chat Agent
- Activated in `chat` mode
- Handles explanations, planning, architecture, troubleshooting

### 3) SaaS Upgrade Agent
- Activated in `saas-upgrade`
- Rebuilds existing projects into higher-fidelity SaaS implementations while preserving the 8-file user-project output contract

## Generate-page preset templates
The Generate page now maps to architecture templates:
- SaaS Dashboard
- E-Commerce
- AI Tool
- Blog/CMS
- Booking App
- Static/Landing
- PWA/Mobile-first
- DoBetter Design System

## Key source files
- `src/lib/ai/prompts.ts` — system/build instructions
- `src/lib/ai/agent.ts` — agent loop + tool execution
- `src/lib/ai/tools.ts` — tool schema
- `src/app/api/chat/route.ts` — streaming chat endpoint
- `src/app/api/generate/route.ts` — template generation endpoint
- `src/app/generate/page.tsx` — template selection UI
- `.dobetter/PROJECT_TRAINING.md` — training guide
- `DOBETTER_DESIGN_SYSTEM.md` — canonical UX/design system spec
