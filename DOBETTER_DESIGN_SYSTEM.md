# DOBETTER DESIGN SYSTEM

Version: 2.1.0  
Last Updated: 2026-04-19

This is the canonical DoBetter Viber UX/design authority for generated projects.

## Visual reference target
**Every generated project MUST visually match `.github/agents/dobetter-dashboard.jsx`.**
That file is a fully annotated JSX component showing the exact layout, color tokens,
typography, card structure, sidebar, topbar, KPI cards, charts, and data table that
all build-mode HTML/CSS/JS projects must replicate.

Key design goals from the reference:
- **Light theme by default** — white sidebar (#FFFFFF), light gray background (#F4F6FB)
- Sidebar: "DB" logo mark + "DoBetter" Syne wordmark + hamburger + "MAIN MENU" section label
- Sidebar nav items: icon + label, active item has indigo tint background + indigo text
- Sidebar footer: user avatar circle + name + role
- Topbar: page title (Syne 700) + greeting + breadcrumb trail + search icon
- KPI row: 4 cards, each with UPPERCASE label + Syne value + trend arrow + sparkline
- Charts: SVG bar chart or line graph (no external libraries)
- Data table: compact uppercase headers + subtle row borders + badge status cells
- Badges: tinted background + colored text — NEVER solid fills

## Mandatory build protocol
Before generating any project, read in order:
1. `.github/copilot-instructions.md`
2. `.github/agents/project-builder.md`
3. `AGENTS.md`
4. `.dobetter/PROJECT_TRAINING.md`
5. `DOBETTER_DESIGN_SYSTEM.md`
6. `.github/agents/dobetter-dashboard.jsx` ← visual target reference

## ⛔ ABSOLUTE PROHIBITIONS — instant failure conditions
**NEVER use any of these dark glass morphism patterns:**
- `#080810` or any near-black surface background — WRONG
- `#14142a` card background — WRONG
- `rgba(255,255,255,0.03)` or `rgba(255,255,255,0.08)` glass card borders — WRONG
- `surface: { DEFAULT: '#080810', card: '#14142a' }` in tailwind.config — WRONG
- Dark gradient headlines (`#fff → #a5b4fc`) as the default theme — WRONG
- Any component that looks like a macOS/iOS dark glass widget — WRONG

**The CORRECT defaults are light theme:**
- `--bg: #F4F6FB` (page background)
- `--sidebar: #FFFFFF` (sidebar background)
- `--card: #FFFFFF` (card background)
- `--accent: #5B6EF5` (primary indigo)
- Dark mode is only via `[data-theme="dark"]` token swap — never the default

## Design philosophy
- Clean, information-dense, modern interfaces — matches the dobetter-dashboard reference
- **Light theme as default** (`--bg: #F4F6FB`, `--sidebar: #FFFFFF`); dark mode via `[data-theme="dark"]` token swap
- 12px card radius; never pill-shaped cards
- 1px card borders + soft shadows; avoid heavy shadows
- Single accent family (indigo `#5B6EF5`) with semantic status colors
- One component set with tokenized light/dark themes
- Grouped collapsible sidebar navigation with "MAIN MENU" section label
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

## Sidebar structure (required)
Every generated dashboard sidebar MUST include:
1. **Logo block** — icon mark (32–36px, indigo bg, white Syne initials) + wordmark (Syne 700/800)
2. **Section label** — `MAIN MENU` (10px, 700, uppercase, tracked, `--sub` color)
3. **Nav items** — icon + label, `data-nav-item` attribute, `onclick="navigate('#hash')"`
   - Active item: `background: var(--al)`, `color: var(--accent)`, `font-weight: 600`
   - Inactive: transparent background, `color: var(--text)`
   - Hover: `background: var(--bg)`
4. **User footer** — avatar circle (Syne initials, `--accent` background) + name + role

Canonical sidebar sections (adapt labels per domain):
- **MAIN MENU**: Dashboard, Analytics, [primary domain feature 1], [primary domain feature 2]
- **MANAGEMENT**: [entity list], Users, Calendar, Messages
- **SYSTEM**: Settings

## HTML shell pattern
```html
<div id="app" style="display:flex;height:100vh;overflow:hidden;">
  <aside id="sidebar" style="width:230px;min-height:100vh;..."></aside>
  <div id="main-wrapper" style="flex:1;display:flex;flex-direction:column;min-width:0;">
    <header id="topbar" style="height:52px;..."></header>
    <main id="main-content" style="flex:1;overflow-y:auto;padding:24px;..."></main>
  </div>
</div>
```

## Data/content rules
- Do not use dummy/placeholder scaffold content in generated instructions
- Do not use `Lorem ipsum`, `Sample Task`, `User 1`, `Item 2`
- Require dynamic, state-driven, domain-specific content flows

## Maintenance
When new UI patterns are introduced, update this file immediately (tokens, components, grids, routes, and applicable template sections).
