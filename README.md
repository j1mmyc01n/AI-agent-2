# AgentForge - AI SaaS Builder

An AI-powered SaaS platform that helps you build, deploy, and manage SaaS products using natural language. Built with Next.js 16, OpenAI, and real integrations with GitHub and Vercel.

## 🚨 Quick Start - First Time Setup

**Are you deploying to Netlify and seeing "Application error: a server-side exception has occurred"?**

👉 **[Follow the complete setup guide](SETUP_ENVIRONMENT.md)** - it will walk you through setting up all required environment variables.

Or run this to check what's missing:
```bash
npm run check-env
```

### Quick Summary for Netlify Deployment

1. **Set these 3 CRITICAL variables** in Netlify UI (Site Settings > Environment Variables):
   - `DATABASE_URL` - Get a free PostgreSQL database from [Neon.tech](https://neon.tech)
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your Netlify site URL (e.g., `https://dobetteragent2.netlify.app`)

2. **Initialize database** (run locally):
   ```bash
   DATABASE_URL="your-postgres-url" npx prisma db push
   ```

3. **Trigger a redeploy** in Netlify

For detailed instructions, see [SETUP_ENVIRONMENT.md](SETUP_ENVIRONMENT.md) and [DEPLOYMENT.md](DEPLOYMENT.md).

## ✨ Features

- **🤖 AI Agent with Tool Calling** — GPT-4o powered agent that can search the web, create GitHub repos, push code, and deploy to Vercel
- **💬 ChatGPT-style UI** — Familiar chat interface with conversation history
- **🔍 Web Search** — Real-time web search via Tavily API
- **💻 GitHub Integration** — Create repositories and push code directly from chat
- **🚀 Vercel Deployment** — Deploy projects to Vercel with a single message
- **📁 Project Tracking** — Dashboard to view all your AI-built projects
- **�� Authentication** — Email/password + GitHub OAuth via NextAuth.js
- **⚙️ Settings Panel** — Manage your API keys and integrations
- **💳 Stripe Ready** — Billing infrastructure ready to configure

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 16 (App Router) | Full-stack React framework |
| TypeScript | Type safety |
| Tailwind CSS | Styling |
| shadcn/ui | UI components |
| OpenAI SDK | AI agent (GPT-4o) |
| Prisma + SQLite | Database ORM |
| NextAuth.js | Authentication |
| Tavily API | Web search |
| GitHub API | Repository management |
| Vercel API | Deployment |
| Stripe | Billing (ready to configure) |

## 🚀 Local Development Quick Start

### 1. Clone and Install

```bash
git clone <your-repo>
cd AI-agent-2
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Minimum required for local development:**
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-min-32-chars  # Generate with: openssl rand -base64 32
DATABASE_URL="file:./dev.db"  # SQLite for local dev
```

### 3. Check Environment Variables (Optional)

```bash
npm run check-env
```

This will validate all your environment variables and show what's missing.

### 4. Set Up the Database

```bash
npm run db:push
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔧 Environment Variables

### For Local Development (SQLite)

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXTAUTH_URL` | Your app URL (`http://localhost:3000` for dev) | ✅ |
| `NEXTAUTH_SECRET` | Random secret for JWT encryption (min 32 chars) | ✅ |
| `DATABASE_URL` | SQLite path: `file:./dev.db` | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `GITHUB_ID` | GitHub OAuth App Client ID | Optional |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret | Optional |
| `TAVILY_API_KEY` | Tavily API key for web search | Optional |

### For Netlify Deployment (PostgreSQL)

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXTAUTH_SECRET` | Random secret for JWT (32+ chars) | ✅ |
| `NEXTAUTH_URL` | Your Netlify site URL | ✅ |
| `OPENAI_API_KEY` | OpenAI API key | Optional |
| `GITHUB_ID` | GitHub OAuth App Client ID | Optional |
| `GITHUB_SECRET` | GitHub OAuth App Client Secret | Optional |
| `TAVILY_API_KEY` | Tavily API key for web search | Optional |
| `STRIPE_SECRET_KEY` | Stripe secret key | Optional |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | Optional |

**💡 Tip:** Run `npm run check-env` to validate your environment variables.

**📚 Need help?** See [SETUP_ENVIRONMENT.md](SETUP_ENVIRONMENT.md) for detailed setup instructions.

## 🔑 Setting Up Integrations

Users can add their own API keys in **Settings > Integrations**. The system also supports global fallback keys via environment variables.

### GitHub OAuth (for GitHub login)
1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create a new OAuth App
3. Set callback URL to `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and Secret to your `.env.local`

### Per-User Integration Keys
Users can add their own keys in the Settings page:
- **OpenAI** — [Get key](https://platform.openai.com/api-keys)
- **GitHub** — [Create token](https://github.com/settings/tokens) (needs `repo` scope)
- **Vercel** — [Create token](https://vercel.com/account/tokens)
- **Tavily** — [Get key](https://app.tavily.com/home)

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, register)
│   ├── api/               # API routes
│   ├── chat/              # Chat interface
│   ├── projects/          # Projects dashboard
│   └── settings/          # Settings page
├── components/
│   ├── chat/              # Chat UI components
│   ├── layout/            # Layout components
│   ├── settings/          # Settings components
│   └── ui/                # shadcn UI primitives
├── lib/
│   ├── ai/                # AI agent, prompts, tools
│   ├── integrations/      # GitHub, Vercel, Tavily
│   ├── auth.ts            # NextAuth configuration
│   └── db.ts              # Prisma client
└── types/                 # TypeScript types
```

## 🤖 How the AI Agent Works

1. User sends a message in the chat
2. The message is sent to GPT-4o with a system prompt and tool definitions
3. GPT-4o decides which tools to call (web search, GitHub, Vercel, etc.)
4. Tools are executed with real API calls
5. Results are fed back to GPT-4o for a final response
6. Everything streams to the UI in real-time

## 📝 Example Prompts

- "Build a Next.js SaaS for task management, create a GitHub repo, and deploy it to Vercel"
- "Search the web for the best pricing strategies for B2B SaaS products"
- "Create a GitHub repo called 'my-landing-page' with a complete Next.js landing page"
- "What are the latest features in Next.js 14?"

## 📄 License

MIT
