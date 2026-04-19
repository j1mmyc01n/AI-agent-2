# DOBETTER DESIGN SYSTEM

Version: 2.0.0  
Last Updated: 2026-04-19

This is the canonical DoBetter Viber UX/design authority for generated projects.

## Mandatory build protocol
Before generating any project, read in order:
1. `.github/copilot-instructions.md`
2. `.github/agents/project-builder.md`
3. `AGENTS.md`
4. `.dobetter/PROJECT_TRAINING.md`
5. `DOBETTER_DESIGN_SYSTEM.md`

## Design philosophy
- Clean, information-dense, modern interfaces
- 12px card radius; never pill-shaped cards
- 1px card borders + soft shadows; avoid heavy shadows
- Single accent family (indigo) with semantic status colors
- One component set with tokenized light/dark themes
- Grouped collapsible sidebar navigation
- Topbar breadcrumbs reflecting current route path

## Color tokens
### Light
- `--bg: #F4F6FB`
- `--sidebar: #FFFFFF`
- `--card: #FFFFFF`
- `--border: #E8ECF4`
- `--text: #1A1D23`
- `--sub: #6B7280`
- `--accent: #5B6EF5`
- `--al: #EEF0FE`
- `--success: #22C55E` / `--sl: #DCFCE7`
- `--warning: #F59E0B` / `--wl: #FEF3C7`
- `--danger: #EF4444` / `--dl: #FEE2E2`
- `--purple: #8B5CF6` / `--pl: #EDE9FE`

### Dark
- `--bg: #0F172A`
- `--sidebar: #1E293B`
- `--card: #1E293B`
- `--border: #334155`
- `--text: #F1F5F9`
- `--sub: #94A3B8`
- `--accent: #6366F1`
- `--al: #1E1B4B`
- `--success: #22C55E` / `--sl: #14532D`
- `--warning: #F59E0B` / `--wl: #78350F`
- `--danger: #EF4444` / `--dl: #7F1D1D`
- `--purple: #A78BFA` / `--pl: #4C1D95`

## Typography
- Heading/logo: **Syne** (700/800/900)
- Body/UI: **DM Sans** (400–800)
- Code: system monospace
- Do not use Inter, Roboto, Arial, or system-ui as primary face

## Layout hierarchy
- Sidebar: `230px` expanded / `60px` collapsed
- Topbar: `52px` height with breadcrumbs + utilities
- Page content area is scrollable
- KPI row uses 4 columns by default
- Sidebar supports grouped parent/child nav with active rail states

## Core components
- Card: 12px radius, 1px border, soft shadow
- KPI stat card: uppercase title, value, trend delta, sparkline
- Badge: colored text on tinted background (never solid fill)
- Data table: uppercase compact headers, subtle row borders
- Buttons: primary/secondary/ghost/danger variants
- Progress bar: neutral track + accent fill
- Charts: sparkline/bar/donut via lightweight SVG/CSS patterns

## Spacing and grid
- Use compact spacing scale (4px–24px) from tokenized increments
- Standard page grids:
  - KPI row: `repeat(4, 1fr)`
  - Main + sidebar: `1fr 290px` or `1fr 250px`
  - Two-column content: `1fr 1fr`
  - Auto card grid: `repeat(auto-fill, minmax(260px, 1fr))`
- Responsive collapse:
  - `<1100px`: KPI row to 2 cols
  - `<900px`: side layouts stack to 1 col
  - `<768px`: KPI row to 1 col and compact sidebar behavior

## Project template types
Apply the matching template spec for:
1. SaaS Dashboard
2. E-Commerce
3. AI Tool
4. Blog/CMS
5. Booking App
6. Static/Landing
7. PWA/Mobile-first

## Data/content rules
- Do not use dummy/placeholder scaffold content in generated instructions
- Do not use `Lorem ipsum`, `Sample Task`, `User 1`, `Item 2`
- Require dynamic, state-driven, domain-specific content flows

## Maintenance
When new UI patterns are introduced, update this file immediately (tokens, components, grids, routes, and applicable template sections).
