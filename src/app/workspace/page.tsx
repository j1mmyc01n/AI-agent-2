import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  Settings,
  Bot,
  CheckCircle2,
  AlertCircle,
  Plus,
  TrendingUp,
} from "lucide-react";

export default async function WorkspacePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  // Fetch user with integration status
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      openaiKey: true,
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

  // Get recent conversations
  const recentConversations = await db.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    include: {
      _count: {
        select: { messages: true },
      },
    },
  });

  // Get recent projects
  const recentProjects = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  const connectedIntegrations = [
    user?.openaiKey,
    user?.githubToken,
    user?.vercelToken,
    user?.tavilyKey,
  ].filter(Boolean).length;

  const totalIntegrations = 4;
  const isFullySetup = connectedIntegrations === totalIntegrations;

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 sm:h-8 sm:w-8" />
              Workspace
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Overview of your AI agent development workspace
            </p>
          </div>

          {/* Setup Status Banner */}
          {!isFullySetup && (
            <Card className="mb-6 border-orange-200 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">Setup Required</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Connect {totalIntegrations - connectedIntegrations} more integration
                      {totalIntegrations - connectedIntegrations !== 1 ? "s" : ""} to unlock full
                      functionality
                    </CardDescription>
                  </div>
                  <Link href="/settings">
                    <Button size="sm" variant="outline" className="flex-shrink-0">
                      Configure
                    </Button>
                  </Link>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Total Conversations</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl">
                  {user?._count.conversations || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>Chat sessions</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Active Projects</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl">
                  {user?._count.projects || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FolderOpen className="h-3 w-3" />
                  <span>Built by AI</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">Integrations</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl">
                  {connectedIntegrations}/{totalIntegrations}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {isFullySetup ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">All connected</span>
                    </>
                  ) : (
                    <>
                      <Settings className="h-3 w-3" />
                      <span>Setup needed</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">AI Status</CardDescription>
                <CardTitle className="text-2xl sm:text-3xl">
                  {user?.openaiKey ? (
                    <span className="text-green-600">Ready</span>
                  ) : (
                    <span className="text-orange-600">Setup</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Bot className="h-3 w-3" />
                  <span>Agent power</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Conversations */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Recent Conversations</CardTitle>
                  <Link href="/chat">
                    <Button size="sm" variant="outline" className="gap-2">
                      <Plus className="h-3 w-3" />
                      New Chat
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Start a new chat to get started</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentConversations.map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/chat/${conv.id}`}
                        className="block p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {conv._count.messages} messages •{" "}
                              {new Date(conv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="flex-shrink-0 text-xs">
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
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg sm:text-xl">Recent Projects</CardTitle>
                  <Link href="/projects">
                    <Button size="sm" variant="ghost">
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {recentProjects.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No projects yet</p>
                    <p className="text-xs mt-1">Build your first SaaS</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentProjects.map((project) => (
                      <div key={project.id} className="p-3 rounded-lg border">
                        <p className="font-medium text-sm truncate">{project.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {project.type}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Link href="/chat">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <MessageSquare className="h-4 w-4" />
                    New Chat
                  </Button>
                </Link>
                <Link href="/projects">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <FolderOpen className="h-4 w-4" />
                    View Projects
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                </Link>
                <Link href="/chat">
                  <Button className="w-full justify-start gap-2">
                    <Plus className="h-4 w-4" />
                    Build New SaaS
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
