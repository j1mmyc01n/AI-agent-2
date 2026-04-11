# PART 3 — PROMPTS AND TRAINING

> DoBetter Viber Training Document  
> Covers: System prompt architecture, build mode instructions, premium quality standards, visual requirements, training document structure, and prompt assembly.

---

## 1. SYSTEM PROMPT ARCHITECTURE

### How the Prompt Is Built

`buildSystemPrompt()` in `src/lib/ai/prompts.ts` assembles the full system prompt from multiple pieces:

```
1. SYSTEM_PROMPT (base)
   - Identity: "You are the AI coding engine for DoBetter Viber"
   - Platform protection rules
   - Training standards (from PROJECT_TRAINING.md)
   
2. + Mode-specific instructions:
   - "build" mode     → BUILD_MODE_INSTRUCTIONS
   - "saas-upgrade"   → BUILD_MODE_INSTRUCTIONS + SAAS_UPGRADE_INSTRUCTIONS
   - "chat" mode      → CHAT_MODE_INSTRUCTIONS
   
3. + Integration status:
   - Which AI providers are active
   - Whether GitHub/Vercel/Tavily are connected
   - Whether database is connected
   
4. + User context:
   - Current project name/type
   - Project-type suggestion guide
   - Existing projects list
   - Conversation count
```

### Three Modes

| Mode | When | What it does |
|---|---|---|
| `build` | User clicks "Build" mode | Generates 8-file HTML/CSS/JS project |
| `saas-upgrade` | User clicks "SaaS Upgrade" mode | Upgrades existing project to Next.js SaaS |
| `chat` | Default | Answers questions, explains code, plans features |

---

## 2. BUILD MODE INSTRUCTIONS

### Premium Quality Override

The first section of `BUILD_MODE_INSTRUCTIONS` is a non-negotiable quality mandate:

```
## 🚨 PREMIUM QUALITY OVERRIDE — THIS OVERRIDES ALL OTHER DEFAULTS

Every project you generate MUST look like a funded startup product.
These are NON-NEGOTIABLE requirements:
```

### Required Visual Standards

Every build must include:

| Element | Requirement |
|---|---|
| **Background** | `#080810` — NEVER white, NEVER light grey |
| **Surface** | `#14142a` — card/panel backgrounds |
| **Accent** | `#6366f1` (indigo) — all buttons, active states, highlights |
| **Cards** | `background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(12px)` |
| **Gradient text** | `background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent` |
| **Hover states** | Every button, card, and interactive element has a hover transition |
| **Dashboard** | Sidebar nav + 4 KPI stat cards + data table + activity feed |
| **Landing page** | Animated gradient hero + 6 feature cards + 3-tier pricing + testimonials |

### Instant Failure Conditions

These make a build unacceptable:

```
INSTANT FAILURE:
- White or light grey background anywhere
- Plain text links as navigation (must use styled buttons/nav)
- Copyright footer with nothing else on screen
- Empty grey placeholder boxes
- Round numbers in demo data (use 47,291 not 50,000; 23.4% not 25%)
- "Lorem ipsum", "Sample Task", "User 1", "Item 2" placeholder copy
- Any route that renders a blank page
```

### Demo Data Rules

```
MINIMUM 10 items per data set, all domain-specific:
- Use realistic names: Alex Chen, Sarah Kim, Marcus Williams, Priya Patel
- Use realistic numbers: $47,291 not $50,000
- Use realistic percentages: 23.4% not 25%
- Include 30-day analytics arrays for charts
- Every dashboard KPI must show a real-looking number with trend indicator
```

---

## 3. 8-FILE STRUCTURE ENFORCEMENT

### Output Order

The AI must generate files in this exact order:

```
1. Task list checkbox (markdown checklist of what will be built)
2. index.html         — FULL complete file, 100+ lines
3. src/css/styles.css  — CSS custom properties + base styles
4. src/css/components.css — Component-specific styles
5. src/js/config.js    — App configuration, constants
6. src/js/state.js     — State management + demo data (10+ items)
7. src/js/router.js    — Client-side routing
8. src/js/components.js — All UI components
9. src/js/app.js       — Tailwind config at TOP, then init() bootstrap
10. Call save_artifact  — with all 8 files
11. Call create_project_record — LAST (only after save succeeds)
```

### What Each File Must Contain

**index.html:**
- DOCTYPE, head with meta viewport, Tailwind CDN script
- Links to both CSS files
- Script tags for all 5 JS files (in dependency order)
- Semantic `<div id="app">` root

**src/css/styles.css:**
- `:root` with all CSS custom properties (colors, spacing, radius, shadows)
- Dark theme variables
- Base reset and typography
- Utility classes

**src/css/components.css:**
- Card, button, input, badge, modal styles
- Glassmorphism effects
- Hover transitions
- Responsive breakpoints

**src/js/config.js:**
- App name, version, API endpoints
- Feature flags
- Navigation menu structure
- Theme constants

**src/js/state.js:**
- State management object (AppState)
- 10+ realistic demo data items
- CRUD methods (add, update, delete)
- 30-day analytics arrays for charts
- Event emitter for reactivity

**src/js/router.js:**
- Client-side hash router
- Route registration
- Navigation guards
- 404 handling

**src/js/components.js:**
- `createSidebar()` — with nav items matching routes
- `createNavbar()` — with user avatar and notifications
- `createStatCard()` — KPI cards with trend indicators
- `createChart()` — SVG bar/line chart with real data
- `createDataTable()` — sortable table with pagination
- Feature-specific CRUD components

**src/js/app.js:**
- Tailwind config object at TOP (theme extensions, colors)
- `App.init()` function that wires everything together
- Event listeners for navigation
- Initial render call

---

## 4. NEVER DO LIST

### In Build Mode

```
NEVER:
- Output planning text, scope documents, or architecture diagrams before code
- Generate Next.js-style paths (src/lib/, src/pages/, src/components/)
- Use .gitkeep, .keep, or any placeholder files
- Delegate file generation to "Claude API" or "GPT-4o"
- Write TODO, FIXME, Coming soon, or Lorem ipsum
- Leave any file empty or stub-only
- Call create_project_record before save_artifact
- Use white or light grey as background color
- Use round numbers in demo data
- Create imports that reference non-existent files
```

### In Chat Mode

```
NEVER:
- Generate a full 8-file project (recommend switching to Build Mode)
- Touch DoBetter Viber platform code
- Modify the repo this chat runs on
```

### In SaaS Upgrade Mode

```
NEVER:
- Start from scratch (use the existing 8-file project as reference)
- Skip database schema
- Skip auth wiring
- Leave API routes without session checks
```

---

## 5. TRAINING DOCUMENT STRUCTURE

### Where Training Lives

```
.dobetter/PROJECT_TRAINING.md     — 13-part master training (embedded in SYSTEM_PROMPT)
.dobetter/PART1_GATEWAY_AND_DUPLICATES.md  — Gateway + deduplication training
.dobetter/PART2_PREVIEW_AND_STALLING.md    — Preview + stalling training
.dobetter/PART3_PROMPTS_AND_TRAINING.md    — This file (prompts + quality)
```

### 13-Part Training Overview (PROJECT_TRAINING.md)

```
Part 1:  Reading the User's Prompt (5-point extraction)
Part 2:  Stack Selection Rules (decision tree)
Part 3:  Folder & File Structures (Next.js SaaS, HTML/CSS/JS, E-Commerce, AI Tool)
Part 4:  File Content Standards (CSS variables, components, hooks, API routes)
Part 5:  Feature Linking (4-layer: DB → API → Hook → Component)
Part 6:  Navigation & Routing (sidebar ↔ page.tsx matching)
Part 7:  Database Patterns (Neon PostgreSQL schemas)
Part 8:  Auth Wiring (NextAuth.js config)
Part 9:  Stripe Integration (checkout + webhooks)
Part 10: AI Feature Wiring (streaming)
Part 11: Toast Notification System (zustand store)
Part 12: Generation Checklist (verification before delivery)
Part 13: Anti-Stall Protocol (what to do when stuck)
```

### How Training Is Embedded

The content of `PROJECT_TRAINING.md` is condensed and appended to the `SYSTEM_PROMPT` constant in `src/lib/ai/prompts.ts`. This means every AI session — regardless of mode — has access to the full training standards.

---

## 6. PROMPT ASSEMBLY FLOW

### End-to-End Flow

```
User sends message in Build Mode
  ↓
POST /api/chat receives message
  ↓
Reads user's API keys from DB/Blobs
  ↓
Builds projectContext:
  - projects list
  - current project name/type
  - mode: "build"
  - hasGithub, hasVercel, hasTavily, hasDatabase
  - hasAnthropicKey, hasOpenaiKey, isNetlifyGateway
  ↓
Calls runAgent(messages, config)
  ↓
runAgent calls detectAvailableProvider(config)
  ↓
Calls runAnthropicAgent or runOpenAIAgent
  ↓
Agent function calls buildSystemPrompt(projectContext)
  ↓
buildSystemPrompt assembles:
  SYSTEM_PROMPT (base + training)
  + BUILD_MODE_INSTRUCTIONS (premium quality + 8-file structure)
  + Integration Status (what's connected)
  + User Context (project name, suggestion guide)
  ↓
Full prompt sent to AI provider
  ↓
AI generates code + tool calls
  ↓
Tool calls handled: save_artifact → create_project_record
  ↓
Response streamed to client via SSE
  ↓
Client parses code blocks → Code tab + Preview tab
```

---

## 7. CSS CUSTOM PROPERTIES TEMPLATE

Every `styles.css` must start with these design tokens:

```css
:root {
  /* Colors - Dark Theme */
  --bg-primary: #080810;
  --bg-secondary: #0f0f1a;
  --bg-surface: #14142a;
  --bg-card: rgba(255, 255, 255, 0.03);
  --border-color: rgba(255, 255, 255, 0.08);
  --text-primary: #ffffff;
  --text-secondary: #a0a0b0;
  --text-muted: #6b6b80;
  --accent: #6366f1;
  --accent-hover: #818cf8;
  --accent-muted: rgba(99, 102, 241, 0.1);
  --success: #22c55e;
  --warning: #f59e0b;
  --error: #ef4444;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Border Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);

  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}
```

---

## CHECKLIST

When implementing changes related to prompts or training:

- [ ] `buildSystemPrompt()` assembles: base + mode + integrations + context
- [ ] Build mode includes PREMIUM QUALITY OVERRIDE at top
- [ ] Dark theme colors enforced (#080810 background, #6366f1 accent)
- [ ] Glassmorphism card styles required in every build
- [ ] Demo data: 10+ items, realistic names/numbers, no placeholders
- [ ] 8-file output order documented and enforced
- [ ] NEVER DO list covers all three modes (build, chat, saas-upgrade)
- [ ] Training standards from PROJECT_TRAINING.md embedded in SYSTEM_PROMPT
- [ ] CSS custom properties template included in styles.css description
- [ ] Prompt flow: message → projectContext → buildSystemPrompt → AI → SSE → client
