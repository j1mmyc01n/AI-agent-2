import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Bot,
  Code2,
  MessageSquare,
  Sparkles,
  Zap,
  Shield,
  Database,
  ArrowRight,
  CheckCircle2,
  Globe,
  ListTodo,
  Eye,
} from "lucide-react";

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user) {
      redirect("/workspace");
    }
  } catch {
    // Auth check failed, show landing page
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              DoBetter Viber
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Sparkles className="h-4 w-4" />
              AI Agent Workspace for Builders
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
              Build products with
              <span className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                {" "}AI agents
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Chat with AI, generate code, manage tasks, and preview results — all in one workspace.
              From idea to shipped product, powered by GPT-4, Claude, and Grok.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-6 py-3 rounded-lg text-base font-semibold w-full sm:w-auto justify-center"
              >
                Start Building Free
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 border border-border hover:bg-accent transition-colors px-6 py-3 rounded-lg text-base font-medium w-full sm:w-auto justify-center"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Workspace Preview */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="rounded-xl border bg-card shadow-2xl shadow-primary/5 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex items-center gap-1 ml-4 bg-muted rounded-lg p-0.5">
              {[
                { icon: MessageSquare, label: "Chat" },
                { icon: Code2, label: "Code" },
                { icon: ListTodo, label: "Tasks" },
                { icon: Eye, label: "Preview" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium ${
                    label === "Chat" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 min-h-[300px]">
            <div className="md:col-span-2 p-6 space-y-4">
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs shrink-0">U</div>
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
                  Build me a task management SaaS with Kanban boards
                </div>
              </div>
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm max-w-md">
                  <p className="font-medium mb-2">Here&apos;s your MVP plan:</p>
                  <div className="space-y-1 text-muted-foreground">
                    <p>1. User authentication with NextAuth</p>
                    <p>2. Project & board CRUD API</p>
                    <p>3. Drag-and-drop Kanban UI</p>
                    <p>4. Real-time status updates</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-l p-4 bg-muted/20 hidden md:block">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Agent Tasks</p>
              <div className="space-y-2">
                {["Setup project scaffold", "Create DB schema", "Build auth flow", "Design Kanban UI"].map((task, i) => (
                  <div key={task} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className={`h-4 w-4 ${i < 2 ? "text-green-500" : "text-muted-foreground/40"}`} />
                    <span className={i < 2 ? "line-through text-muted-foreground" : ""}>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t bg-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Everything you need to build</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete AI-powered workspace with chat, code generation, task management, and live preview.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageSquare,
                title: "AI Chat",
                description: "Chat with GPT-4, Claude, or Grok. Get help building, debugging, and shipping.",
              },
              {
                icon: Code2,
                title: "Code Generation",
                description: "Generate production-ready code. Copy, export, or push directly to GitHub.",
              },
              {
                icon: ListTodo,
                title: "Task Management",
                description: "Auto-generated task lists from your conversations. Track progress as you build.",
              },
              {
                icon: Eye,
                title: "Live Preview",
                description: "See your deployed projects in real-time. Refresh and iterate without leaving the workspace.",
              },
              {
                icon: Globe,
                title: "Connectivity Setup",
                description: "Enter any URL and generate integration blueprints, API pathways, and connector specs.",
              },
              {
                icon: Sparkles,
                title: "AI Templates",
                description: "SaaS ideas, MVP specs, landing page copy, PRDs, and UI components — generated instantly.",
              },
            ].map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-6">Works anywhere, with or without a database</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Start building immediately in local mode. Your data persists in the browser until you connect your own database for cloud sync.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Zap, title: "Local-first", desc: "Works instantly with IndexedDB. No setup required." },
                  { icon: Database, title: "Cloud sync", desc: "Connect PostgreSQL for persistent, multi-device storage." },
                  { icon: Shield, title: "Your keys, your data", desc: "API keys stored securely. Bring your own AI providers." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{title}</h3>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Local Mode Active</p>
                  <p className="text-xs text-muted-foreground">Data stored in browser</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <Database className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">Cloud Database</p>
                  <p className="text-xs text-muted-foreground">Connect PostgreSQL for sync</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-sm font-medium">External Database</p>
                  <p className="text-xs text-muted-foreground">Bring your own DB connection</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 sm:py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">Ready to build something?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Start with a prompt. Ship a product. No credit card required.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-8 py-3.5 rounded-lg text-base font-semibold"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">DoBetter Viber</span>
            </div>
            <p className="text-xs text-muted-foreground">
              AI agent workspace for builders. Powered by GPT-4, Claude, and Grok.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
