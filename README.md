# DoBetter Viber — Vibe Coding SaaS Platform

An AI-powered SaaS platform that lets you generate SaaS ideas, MVPs, landing page copy, tech-stack recommendations, feature specs, and more — all backed by OpenAI or Anthropic. Built with **Next.js 16**, **Prisma + PostgreSQL (Neon)**, and **NextAuth.js**.

---

## Table of Contents

1. [Quick Start (Local Dev)](#quick-start-local-dev)
2. [Environment Variables](#environment-variables)
3. [Database Setup](#database-setup)
4. [Prisma Commands](#prisma-commands)
5. [Netlify Deployment](#netlify-deployment)
6. [GitHub OAuth Setup](#github-oauth-setup)
7. [Features](#features)
8. [Tech Stack](#tech-stack)
9. [Project Structure](#project-structure)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file and fill in your values
cp .env.example .env.local

# 3. Push the Prisma schema to your database
npm run db:push

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **No database yet?** Use the test admin account to explore the UI:
> - **Email:** `admin@test.com`
> - **Password:** `admin123456`
>
> This bypasses the database entirely. Chat and project saving won't work, but you can explore the interface.

---

## Environment Variables

Copy `.env.example` to `.env.local` (local) or add them in the **Netlify UI → Site settings → Environment variables** (production).

### Required

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (see [Database Setup](#database-setup)) |
| `NEXTAUTH_SECRET` | Random secret ≥ 32 chars — run `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full site URL, e.g. `http://localhost:3000` or `https://yoursite.netlify.app` |

### Recommended

| Variable | Description |
|---|---|
| `DIRECT_URL` | Unpooled Neon connection string — needed when `DATABASE_URL` uses PgBouncer pooling |
| `OPENAI_API_KEY` | OpenAI key for AI chat and generation features |

### Optional

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Anthropic Claude key (users can also add their own in Settings) |
| `GITHUB_ID` | GitHub OAuth App Client ID (enables GitHub login) |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `TAVILY_API_KEY` | Tavily web-search key |
| `STRIPE_SECRET_KEY` | Stripe secret key (future billing) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (future billing) |

> Users can also add their own OpenAI / Anthropic / GitHub / Vercel / Tavily keys in **Settings → AI Models / Integrations**. Per-user keys take priority over environment-level keys.

---

## Database Setup

### Option A — Neon (recommended, free tier)

1. Create a free project at [console.neon.tech](https://console.neon.tech)
2. Copy the **Connection string** (pooled) — it looks like:
   ```
   postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Set this as `DATABASE_URL` in `.env.local`
4. If Neon shows a separate **Direct connection** URL, set that as `DIRECT_URL`
5. Run: `npm run db:push`

### Option B — Netlify Neon Integration (easiest for Netlify deployments)

1. In your Netlify dashboard → **Integrations** → enable **Neon**
2. Netlify automatically sets `NETLIFY_DATABASE_URL` — the app picks this up automatically
3. Set `NEXTAUTH_SECRET` and `NEXTAUTH_URL` in Netlify env vars
4. Redeploy — done

### Option C — Supabase / Railway

Get the PostgreSQL connection string from [supabase.com](https://supabase.com) or [railway.app](https://railway.app) and set it as `DATABASE_URL`.

---

## Prisma Commands

```bash
# Apply schema to your database (use this instead of migrate for Neon/serverless)
npm run db:push

# Open Prisma Studio (visual DB browser)
npm run db:studio

# Regenerate Prisma client after schema changes
npx prisma generate
```

> **For Neon with connection pooling:** set `DIRECT_URL` to the unpooled URL before running `db:push`.

---

## Netlify Deployment

### One-time setup

1. Push your repo to GitHub
2. Connect it to [Netlify](https://app.netlify.com) — it auto-detects Next.js
3. In **Site settings → Environment variables**, add:
   - `DATABASE_URL` — your Neon/Postgres connection string
   - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
   - `NEXTAUTH_URL` — `https://yoursite.netlify.app`
   - `OPENAI_API_KEY` — your OpenAI key (optional but needed for AI features)
   - `GITHUB_ID` / `GITHUB_SECRET` — only if you want GitHub OAuth
4. Trigger a deploy

### Build settings (auto-detected via `netlify.toml`)

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Publish directory | `.next` |
| Node version | 20 |
| Plugin | `@netlify/plugin-nextjs` |

The build command runs `prisma generate` + `prisma db push` (if `DATABASE_URL` is set) + `next build`.

---

## GitHub OAuth Setup

1. Go to [GitHub → Settings → Developer settings → OAuth Apps → New OAuth App](https://github.com/settings/applications/new)
2. Fill in:
   - **Application name**: DoBetter Viber (or anything)
   - **Homepage URL**: `https://yoursite.netlify.app`
   - **Authorization callback URL**: `https://yoursite.netlify.app/api/auth/callback/github`
     - For local dev: `http://localhost:3000/api/auth/callback/github`
3. Copy **Client ID** → `GITHUB_ID`
4. Generate a **Client secret** → `GITHUB_SECRET`
5. Add both to your environment

---

## Features

| Feature | Status |
|---|---|
| Email/password sign up & log in | ✅ |
| GitHub OAuth login | ✅ (requires `GITHUB_ID`/`GITHUB_SECRET`) |
| AI chat with tool calling (GPT-4o / Claude) | ✅ |
| **AI Generation templates** (SaaS ideas, MVP, landing page copy, etc.) | ✅ |
| Conversation history | ✅ |
| Project management | ✅ |
| Per-user API key storage | ✅ |
| Workspace dashboard | ✅ |
| Netlify + Neon integration | ✅ |
| Stripe billing | 🔜 (infrastructure ready) |

---

## Tech Stack

| Technology | Purpose |
|---|---|
| Next.js 16 (App Router) | Full-stack React framework |
| TypeScript | Type safety |
| Tailwind CSS v4 | Styling |
| shadcn/ui | UI component primitives |
| Prisma v5 | Database ORM |
| PostgreSQL (Neon) | Database |
| NextAuth.js v4 | Authentication |
| OpenAI SDK | GPT-4o AI agent + generation |
| Anthropic SDK | Claude AI (optional) |
| Tavily API | Web search in chat |
| Stripe | Billing (ready to configure) |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login & Register pages
│   ├── api/
│   │   ├── auth/        # NextAuth + register endpoint
│   │   ├── chat/        # Streaming AI chat endpoint
│   │   ├── conversations/
│   │   ├── generate/    # AI generation templates API
│   │   ├── integrations/
│   │   └── projects/
│   ├── chat/            # Chat interface
│   ├── generate/        # AI generation page (NEW)
│   ├── profile/
│   ├── projects/
│   ├── settings/
│   └── workspace/
├── components/
│   ├── chat/            # Chat UI + sidebar
│   ├── layout/
│   ├── settings/
│   └── ui/              # shadcn primitives
└── lib/
    ├── ai/              # Agent, prompts, tools
    ├── integrations/    # GitHub, Vercel, Tavily
    ├── auth.ts          # NextAuth config
    └── db.ts            # Prisma client (supports DATABASE_URL + NETLIFY_DATABASE_URL)
```

---

## Troubleshooting

### "Database credentials not available" / login fails in production

1. Open **Netlify → Site settings → Environment variables**
2. Verify `DATABASE_URL` is set to a valid PostgreSQL connection string
3. Verify `NEXTAUTH_SECRET` is set (min 32 random chars)
4. Verify `NEXTAUTH_URL` is set to your exact site URL (no trailing slash)
5. Trigger a redeploy — the build runs `prisma db push` automatically

### "Can't reach database server" in logs

- For **Neon**: make sure the connection string includes `?sslmode=require`
- For **Neon with PgBouncer pooling**: set `DIRECT_URL` to the unpooled connection string

### GitHub login shows "Configuration" error

- Double-check `GITHUB_ID` and `GITHUB_SECRET` are set
- Ensure the OAuth callback URL in your GitHub App matches exactly:
  `https://yoursite.netlify.app/api/auth/callback/github`

### Build fails with "environment variable not found: DATABASE_URL"

- The build will skip `prisma db push` if no database URL is configured — this is fine
- The error during Next.js build itself means Prisma client generation failed
- Set `DATABASE_URL` in Netlify build environment (not just runtime), **or** ensure the `postinstall` script (`prisma generate`) completes without needing a live DB (it doesn't — only `generate`, not `db push`)

### Test without a database

Login with:
- **Email**: `admin@test.com`
- **Password**: `admin123456`

This uses an in-memory test admin when `DATABASE_URL` is not configured. AI chat, project saving, and conversation history require a real database.

