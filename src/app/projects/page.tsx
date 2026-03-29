import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";
import { db, getDatabaseUrl } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Github, Zap, Plus, FolderOpen, MessageSquare } from "lucide-react";

const typeColors: Record<string, string> = {
  saas: "border-blue-500/20 text-blue-400 bg-blue-500/10",
  mvp: "border-purple-500/20 text-purple-400 bg-purple-500/10",
  "landing-page": "border-green-500/20 text-green-400 bg-green-500/10",
  api: "border-orange-500/20 text-orange-400 bg-orange-500/10",
  tool: "border-yellow-500/20 text-yellow-400 bg-yellow-500/10",
  other: "border-muted-foreground/20 text-muted-foreground bg-muted",
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  let projects: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    status: string;
    githubRepo: string | null;
    vercelUrl: string | null;
    createdAt: Date;
  }[] = [];

  if (getDatabaseUrl()) {
    try {
      projects = await db.project.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
    } catch (err) {
      console.error("Projects DB error:", err);
    }
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                Projects
              </h1>
              <p className="text-muted-foreground mt-1 ml-[46px] text-sm">
                Track and manage your AI-built SaaS projects
              </p>
            </div>
            <Link href="/chat">
              <Button className="gap-2 shadow-md shadow-primary/10">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <FolderOpen className="h-8 w-8 text-primary opacity-50" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                Start a chat with DoBetter Viber and ask it to build a SaaS product
                or MVP. Projects will appear here once created.
              </p>
              <Link href="/chat">
                <Button className="gap-2 shadow-md shadow-primary/10">
                  <MessageSquare className="h-4 w-4" />
                  Start Building
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <Card key={project.id} className="border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg leading-tight">
                        {project.name}
                      </CardTitle>
                      <div className="flex gap-1 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${typeColors[project.type] || typeColors.other}`}
                        >
                          {project.type}
                        </Badge>
                        <Badge
                          variant={project.status === "active" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {project.status}
                        </Badge>
                      </div>
                    </div>
                    {project.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {project.githubRepo && (
                        <a
                          href={project.githubRepo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border/50 rounded-md px-2 py-1 hover:bg-primary/5 hover:border-primary/20 transition-all"
                        >
                          <Github className="h-3 w-3" />
                          GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {project.vercelUrl && (
                        <a
                          href={project.vercelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-border/50 rounded-md px-2 py-1 hover:bg-primary/5 hover:border-primary/20 transition-all"
                        >
                          <Zap className="h-3 w-3" />
                          Live
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      <Link
                        href={`/chat?project=${project.id}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary border border-primary/20 rounded-md px-2 py-1 hover:bg-primary/10 transition-all"
                      >
                        <MessageSquare className="h-3 w-3" />
                        Chat about this project
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">
                      Created {new Date(project.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
