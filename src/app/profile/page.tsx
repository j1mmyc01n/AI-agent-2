import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  User,
  Mail,
  Calendar,
  CheckCircle2,
  XCircle,
  Settings,
  Bot,
  Github,
  Zap,
  Globe,
} from "lucide-react";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  // Fetch full user details
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
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

  if (!user) {
    redirect("/login");
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email[0].toUpperCase();

  const integrations = [
    { id: "openai", name: "OpenAI", icon: Bot, connected: !!user.openaiKey },
    { id: "github", name: "GitHub", icon: Github, connected: !!user.githubToken },
    { id: "vercel", name: "Vercel", icon: Zap, connected: !!user.vercelToken },
    { id: "tavily", name: "Tavily", icon: Globe, connected: !!user.tavilyKey },
  ];

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Your account information and settings
            </p>
          </div>

          {/* Profile Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                  <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                  <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl sm:text-2xl">
                    {user.name || "User"}
                  </CardTitle>
                  <CardDescription className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {user.email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </span>
                  </CardDescription>
                </div>
                <Link href="/settings">
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <Settings className="h-4 w-4" />
                    Edit Settings
                  </Button>
                </Link>
              </div>
            </CardHeader>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Total Conversations</CardDescription>
                <CardTitle className="text-3xl sm:text-4xl">
                  {user._count.conversations}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Chat sessions with the AI agent
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="text-xs">Total Projects</CardDescription>
                <CardTitle className="text-3xl sm:text-4xl">{user._count.projects}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  SaaS projects built by AI
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Integrations Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Connected Integrations</CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    {integrations.filter((i) => i.connected).length} of {integrations.length}{" "}
                    integrations connected
                  </CardDescription>
                </div>
                <Link href="/settings">
                  <Button size="sm" variant="outline">
                    Manage
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {integrations.map((integration) => {
                  const Icon = integration.icon;
                  return (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-background">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-sm">{integration.name}</span>
                      </div>
                      {integration.connected ? (
                        <Badge variant="default" className="bg-green-500 text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1">
                          <XCircle className="h-3 w-3" />
                          Not set
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Account Details */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Account Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between py-2 border-b">
                  <div>
                    <p className="text-sm font-medium">User ID</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your unique identifier
                    </p>
                  </div>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{user.id}</code>
                </div>

                <div className="flex items-start justify-between py-2 border-b">
                  <div>
                    <p className="text-sm font-medium">Email Address</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Used for login and notifications
                    </p>
                  </div>
                  <p className="text-sm">{user.email}</p>
                </div>

                <div className="flex items-start justify-between py-2 border-b">
                  <div>
                    <p className="text-sm font-medium">Display Name</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Your name shown in the app
                    </p>
                  </div>
                  <p className="text-sm">{user.name || "Not set"}</p>
                </div>

                <div className="flex items-start justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Account creation date
                    </p>
                  </div>
                  <p className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
