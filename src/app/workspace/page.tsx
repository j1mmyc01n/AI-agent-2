import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { db, getDatabaseUrl } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  AlertCircle,
  Plus,
  Database,
  ArrowRight,
} from "lucide-react";

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;
  const hasDb = !!getDatabaseUrl();

  let user: {
    name: string | null;
    email: string;
    openaiKey: string | null;
    anthropicKey: string | null;
    githubToken: string | null;
    vercelToken: string | null;
    tavilyKey: string | null;
    _count: { conversations: number; projects: number };
  } | null = null;

  let recentConversations: {
    id: string;
    title: string;
    updatedAt: Date;
    _count: { messages: number };
  }[] = [];

  let recentProjects: {
    id: string;
    name: string;
    type: string;
    status: string;
  }[] = [];

  if (hasDb) {
    try {
      user = await db.user.findUnique({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          openaiKey: true,
          anthropicKey: true,
          githubToken: true,
          vercelToken: true,
          tavilyKey: true,
          _count: {
            select: {
              conversations: true,
              projects: true,
            },
          },
        },
      });

      recentConversations = await db.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      recentProjects = await db.project.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 3,
      });
    } catch (err) {
      console.error("Workspace DB error:", err);
    }
  }

  // Fallback to Blobs if no DB data loaded
  if (!user || (recentConversations.length === 0 && recentProjects.length === 0)) {
    try {
      const { getStore } = await import("@netlify/blobs");

      // Load conversations from Blobs
      if (recentConversations.length === 0) {
        try {
          const convStore = getStore("conversations");
          const blobConvs = await convStore.get(`user:${userId}`, { type: "json" }) as { id: string; title: string; updatedAt: string; messageCount: number }[] | null;
          if (blobConvs && blobConvs.length > 0) {
            recentConversations = blobConvs.slice(0, 5).map((c) => ({
              id: c.id,
              title: c.title,
              updatedAt: new Date(c.updatedAt),
              _count: { messages: c.messageCount || 0 },
            }));
          }
        } catch {
          // Blobs not available for conversations
        }
      }

      // Load projects from Blobs
      if (recentProjects.length === 0) {
        try {
          const projStore = getStore("projects");
          const blobProjects = await projStore.get(`user:${userId}`, { type: "json" }) as { id: string; name: string; type: string; status: string }[] | null;
          if (blobProjects && blobProjects.length > 0) {
            recentProjects = blobProjects.slice(0, 3);
          }
        } catch {
          // Blobs not available for projects
        }
      }

      // Create a synthetic user object for display when no DB
      if (!user) {
        const convCount = recentConversations.length;
        const projCount = recentProjects.length;
        user = {
          name: session.user.name || null,
          email: session.user.email || "user@example.com",
          openaiKey: null,
          anthropicKey: null,
          githubToken: null,
          vercelToken: null,
          tavilyKey: null,
          _count: { conversations: convCount, projects: projCount },
        };
      }
    } catch {
      // Blobs import failed - continue with empty data
    }
  }

  // Check available AI keys (user-provided or deployment env vars)
  const hasAnthropicConnected = !!(user?.anthropicKey || process.env.ANTHROPIC_API_KEY);
  const hasOpenaiConnected = !!(user?.openaiKey || process.env.OPENAI_API_KEY);

  const connectedIntegrations = [
    hasAnthropicConnected || hasOpenaiConnected, // at least one AI key
    user?.githubToken,
    user?.vercelToken,
    user?.tavilyKey,
  ].filter(Boolean).length;

  const totalIntegrations = 4;
  const isFullySetup = connectedIntegrations === totalIntegrations;

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">Workspace</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base ml-[46px]">
              Overview of your AI agent development workspace
            </p>
          </div>

          {/* Database not configured banner */}
          {!hasDb && (
            <Card className="mb-6 border-blue-500/20 bg-blue-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Database className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">Local / Blobs Mode Active</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Data is stored in Netlify Blobs. Set <code className="bg-muted px-1 rounded text-xs">DATABASE_URL</code> (Neon PostgreSQL) in your Netlify environment variables to enable full persistence across devices and sessions.{" "}
                      {hasAnthropicConnected && (
                        <span className="text-green-400">✓ AI provider is configured and ready.</span>
                      )}
                    </CardDescription>
                  </div>
                  <Link href="/settings">
                    <Button size="sm" variant="outline" className="flex-shrink-0 border-blue-500/20 hover:bg-blue-500/10 text-blue-400">
                      Configure
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Setup Status Banner */}
          {hasDb && !isFullySetup && (
            <Card className="mb-6 border-primary/20 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">Setup Required</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Connect {totalIntegrations - connectedIntegrations} more integration
                      {totalIntegrations - connectedIntegrations !== 1 ? "s" : ""} to unlock full
                      functionality
                    </CardDescription>
                  </div>
                  <Link href="/settings">
                    <Button size="sm" className="flex-shrink-0 gap-1">
                      Configure
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Conversations */}
            <Card className="lg:col-span-2 border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Recent Conversations
                  </CardTitle>
                  <Link href="/chat">
                    <Button size="sm" className="gap-1.5">
                      <Plus className="h-3 w-3" />
                      New Chat
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1 opacity-60">Start a new chat to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentConversations.map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/chat/${conv.id}`}
                        className="block p-3 rounded-lg border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {conv._count.messages} messages •{" "}
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0 text-xs border-primary/20 text-primary">
                            Active
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Projects */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Projects
                  </CardTitle>
                  <Link href="/projects">
                    <Button size="sm" variant="ghost" className="text-primary">
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No projects yet</p>
                    <p className="text-xs mt-1 opacity-60">Build your first SaaS</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <Link key={project.id} href={`/projects/${project.id}`} className="block p-3 rounded-lg border border-border/50 hover:border-primary/20 hover:bg-primary/5 transition-all">
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs border-primary/20 text-primary">
                            {project.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}
