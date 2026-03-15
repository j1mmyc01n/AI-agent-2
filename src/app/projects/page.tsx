import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/layout/MainLayout";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Github, Zap, Plus, FolderOpen } from "lucide-react";

const typeColors: Record<string, string> = {
  saas: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  mvp: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "landing-page": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  api: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  tool: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;

  const projects = await db.project.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground mt-1">
                Track and manage your AI-built SaaS projects
              </p>
            </div>
            <Link href="/chat">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Start a chat with AgentForge and ask it to build a SaaS product
                or MVP. Projects will appear here once created.
              </p>
              <Link href="/chat">
                <Button>Start Building</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <Card key={project.id} className="hover:shadow-md transition-shadow">
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
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 hover:bg-muted transition-colors"
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
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-md px-2 py-1 hover:bg-muted transition-colors"
                        >
                          <Zap className="h-3 w-3" />
                          Live
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
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
