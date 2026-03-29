"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExternalLink, Github, Zap, Plus, FolderOpen, MessageSquare, X, Loader2, Pencil, Trash2, Check } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  githubRepo: string | null;
  vercelUrl: string | null;
  createdAt: string;
}

const typeColors: Record<string, string> = {
  saas: "border-blue-500/20 text-blue-400 bg-blue-500/10",
  mvp: "border-purple-500/20 text-purple-400 bg-purple-500/10",
  "landing-page": "border-green-500/20 text-green-400 bg-green-500/10",
  api: "border-orange-500/20 text-orange-400 bg-orange-500/10",
  tool: "border-yellow-500/20 text-yellow-400 bg-yellow-500/10",
  other: "border-muted-foreground/20 text-muted-foreground bg-muted",
};

const projectTypes = [
  { value: "saas", label: "SaaS" },
  { value: "mvp", label: "MVP" },
  { value: "landing-page", label: "Landing Page" },
  { value: "api", label: "API" },
  { value: "tool", label: "Tool" },
  { value: "other", label: "Other" },
];

export default function ProjectsList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "saas",
  });
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      const newProject = await res.json();
      setProjects((prev) => [newProject, ...prev]);
      setFormData({ name: "", description: "", type: "saas" });
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (projectId: string) => {
    if (!editName.trim()) return;
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) {
        setProjects((prev) =>
          prev.map((p) => (p.id === projectId ? { ...p, name: editName.trim() } : p))
        );
      }
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = async (projectId: string) => {
    setDeletingId(projectId);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
    setDeletingId(null);
  };

  return (
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
          <Button
            onClick={() => setShowCreateForm(true)}
            className="gap-2 shadow-md shadow-primary/10"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Create project form */}
        {showCreateForm && (
          <Card className="mb-6 border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Create New Project</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="text-sm font-medium mb-1.5 block">
                    Project Name *
                  </label>
                  <input
                    id="project-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="My Awesome SaaS"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="project-description" className="text-sm font-medium mb-1.5 block">
                    Description
                  </label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of what this project does..."
                    rows={2}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none"
                  />
                </div>
                <div>
                  <label htmlFor="project-type" className="text-sm font-medium mb-1.5 block">
                    Type
                  </label>
                  <select
                    id="project-type"
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                  >
                    {projectTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setShowCreateForm(false);
                      setError(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="gap-2">
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    Create Project
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-primary opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Create a project here or start a chat with DoBetter Viber and ask it to build
              something. Projects will appear here once created.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => setShowCreateForm(true)} className="gap-2 shadow-md shadow-primary/10">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
              <Link href="/chat">
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Start Building with AI
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card key={project.id} className="border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all group">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    {editingId === project.id ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(project.id);
                            if (e.key === "Escape") { setEditingId(null); setEditName(""); }
                          }}
                          className="flex-1 min-w-0 px-2 py-1 rounded border border-primary/30 bg-background text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleRename(project.id)}
                        >
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => { setEditingId(null); setEditName(""); }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle className="text-lg leading-tight flex items-center gap-1.5">
                        <span className="truncate">{project.name}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => { setEditingId(project.id); setEditName(project.name); }}
                          title="Rename project"
                        >
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={() => handleDelete(project.id)}
                          disabled={deletingId === project.id}
                          title="Delete project"
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="h-3 w-3 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </Button>
                      </CardTitle>
                    )}
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
  );
}
