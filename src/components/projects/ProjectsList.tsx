"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
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
import { ExternalLink, Github, Zap, Plus, FolderOpen, MessageSquare, X, Loader2, Pencil, Trash2, Check, Link2, Code2, Layout, Server, Wrench, Box, Globe, Rocket, AlertTriangle, RefreshCw } from "lucide-react";

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

const typeGradients: Record<string, string> = {
  saas: "from-blue-600/20 via-blue-500/10 to-indigo-600/20",
  mvp: "from-purple-600/20 via-violet-500/10 to-fuchsia-600/20",
  "landing-page": "from-green-600/20 via-emerald-500/10 to-teal-600/20",
  api: "from-orange-600/20 via-amber-500/10 to-yellow-600/20",
  tool: "from-yellow-600/20 via-amber-500/10 to-orange-600/20",
  other: "from-gray-600/20 via-slate-500/10 to-zinc-600/20",
};

const typeIcons: Record<string, React.ReactNode> = {
  saas: <Layout className="h-8 w-8" />,
  mvp: <Box className="h-8 w-8" />,
  "landing-page": <Globe className="h-8 w-8" />,
  api: <Server className="h-8 w-8" />,
  tool: <Wrench className="h-8 w-8" />,
  other: <Code2 className="h-8 w-8" />,
};

const projectTypes = [
  { value: "saas", label: "SaaS" },
  { value: "mvp", label: "MVP" },
  { value: "landing-page", label: "Landing Page" },
  { value: "api", label: "API" },
  { value: "tool", label: "Tool" },
  { value: "other", label: "Other" },
];

function ProjectThumbnail({ project }: { project: Project }) {
  const gradient = typeGradients[project.type] || typeGradients.other;
  const icon = typeIcons[project.type] || typeIcons.other;
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Load stored HTML preview from localStorage (set when a project is built)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`project-preview-${project.id}`);
      if (stored) setPreviewHtml(stored);
    } catch {
      // localStorage not available
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ projectId: string }>).detail;
      if (detail?.projectId === project.id) {
        try {
          const stored = localStorage.getItem(`project-preview-${project.id}`);
          if (stored) setPreviewHtml(stored);
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener("dobetter-project-preview-updated", handler);
    return () => window.removeEventListener("dobetter-project-preview-updated", handler);
  }, [project.id]);

  // Generate a unique pattern based on project name for visual diversity (fallback)
  const hash = (project.name || "").split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pattern = hash % 4;

  // Thumbnail iframe scaling: container is h-32 (128px); iframe is rendered at 4× then scaled
  // down by 0.25, so the visible 128px slot shows the top 512px of the project page at 25% zoom.
  const PREVIEW_SCALE = 0.25;
  const PREVIEW_MULTIPLIER = 1 / PREVIEW_SCALE; // 4
  const CONTAINER_HEIGHT_PX = 128;

  return (
    <div className={`relative w-full h-32 rounded-t-lg overflow-hidden ${!previewHtml ? `bg-gradient-to-br ${gradient}` : "bg-background"}`}>
      {previewHtml ? (
        /* Scaled-down live HTML preview */
        <>
          <iframe
            srcDoc={previewHtml}
            sandbox="allow-scripts"
            title={`Preview of ${project.name}`}
            className="absolute top-0 left-0 border-0 pointer-events-none"
            style={{
              width: `${PREVIEW_MULTIPLIER * 100}%`,
              height: `${CONTAINER_HEIGHT_PX * PREVIEW_MULTIPLIER}px`,
              transform: `scale(${PREVIEW_SCALE})`,
              transformOrigin: "top left",
            }}
          />
          {/* Subtle overlay to prevent iframe from looking clickable */}
          <div className="absolute inset-0 bg-background/10" />
        </>
      ) : (
        <>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-30">
            {pattern === 0 && (
              <div className="absolute inset-0" style={{
                backgroundImage: "radial-gradient(circle at 25% 25%, currentColor 1px, transparent 1px), radial-gradient(circle at 75% 75%, currentColor 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }} />
            )}
            {pattern === 1 && (
              <div className="absolute inset-0" style={{
                backgroundImage: "linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%)",
                backgroundSize: "30px 30px",
                backgroundPosition: "0 0, 15px 0",
                opacity: 0.15,
              }} />
            )}
            {pattern === 2 && (
              <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id={`grid-${project.id}`} width="24" height="24" patternUnits="userSpaceOnUse">
                    <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#grid-${project.id})`} />
              </svg>
            )}
            {pattern === 3 && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-20">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-1 rounded-full bg-current" style={{ height: `${30 + (hash * (i + 1)) % 60}%` }} />
                ))}
              </div>
            )}
          </div>

          {/* Centered icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 rounded-2xl bg-background/60 backdrop-blur-sm border border-white/10 shadow-lg">
              <div className="text-foreground/70">{icon}</div>
            </div>
          </div>
        </>
      )}

      {/* Status badge overlay */}
      <div className="absolute top-2 right-2">
        <Badge
          variant={project.status === "active" ? "default" : "secondary"}
          className="text-[10px] shadow-sm"
        >
          {project.status}
        </Badge>
      </div>

      {/* Type badge overlay */}
      <div className="absolute top-2 left-2">
        <Badge
          variant="outline"
          className={`text-[10px] backdrop-blur-sm bg-background/50 ${typeColors[project.type] || typeColors.other}`}
        >
          {project.type}
        </Badge>
      </div>
    </div>
  );
}

export default function ProjectsList() {
  const router = useRouter();
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
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showRecreateForm, setShowRecreateForm] = useState(false);
  const [recreateUrl, setRecreateUrl] = useState("");
  const [recreating, setRecreating] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        setError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Failed to load projects (${res.status})`);
      }
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("Could not connect to the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    // Listen for project updates from chat
    const handler = () => fetchProjects();
    window.addEventListener("dobetter-projects-updated", handler);
    return () => window.removeEventListener("dobetter-projects-updated", handler);
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
      // Notify sidebar to refresh its project list
      window.dispatchEvent(new Event("dobetter-projects-updated"));
      // Navigate to the new project and auto-initialize it
      router.push(`/projects/${newProject.id}?init=true`);
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
      } else {
        console.error("Rename failed:", await res.text());
      }
    } catch (err) {
      console.error("Failed to rename project:", err);
    }
    setEditingId(null);
    setEditName("");
  };

  const handleDelete = async (projectId: string) => {
    if (confirmDeleteId !== projectId) {
      setConfirmDeleteId(projectId);
      return;
    }
    setDeletingId(projectId);
    setConfirmDeleteId(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.id !== projectId));
      } else {
        console.error("Delete failed:", await res.text());
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
    setDeletingId(null);
  };

  const handleRecreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = recreateUrl.trim();
    if (!url) return;
    setRecreating(true);
    setError(null);

    try {
      let urlObj: URL;
      try {
        urlObj = new URL(url.startsWith("http") ? url : `https://${url}`);
      } catch {
        throw new Error("Please enter a valid URL");
      }

      const hostname = urlObj.hostname.replace("www.", "");
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const domainParts = hostname.split(".");
      const siteName = domainParts[0] === "www" ? domainParts[1] : domainParts[0];

      const descriptors = ["Inspired", "Fresh", "Original", "Custom", "Unique", "New"];
      const types = ["App", "Platform", "Tool", "Hub", "Studio", "Space"];
      const descriptor = descriptors[Math.floor(Math.random() * descriptors.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      const projectName = `${descriptor} ${siteName.charAt(0).toUpperCase() + siteName.slice(1)} ${type}`;

      let projectType = "other";
      const urlLower = url.toLowerCase();
      if (urlLower.includes("twitter.com") || urlLower.includes("x.com") || urlLower.includes("instagram") || urlLower.includes("tiktok") || urlLower.includes("facebook") || urlLower.includes("linkedin")) {
        projectType = "saas";
      } else if (pathParts.some(p => ["app", "dashboard", "admin"].includes(p))) {
        projectType = "saas";
      } else if (pathParts.length <= 1) {
        projectType = "landing-page";
      } else if (urlLower.includes("api") || urlLower.includes("docs")) {
        projectType = "api";
      } else {
        projectType = "mvp";
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          description: `Original project inspired by ${urlObj.hostname}${pathParts.length > 0 ? "/" + pathParts[0] : ""}. Built with unique ideas and a fresh approach.`,
          type: projectType,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create project");
      }

      const newProject = await res.json();
      setProjects((prev) => [newProject, ...prev]);
      setRecreateUrl("");
      setShowRecreateForm(false);
      // Navigate to the new project and auto-initialize it
      router.push(`/projects/${newProject.id}?init=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project from URL");
    } finally {
      setRecreating(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              Projects
            </h1>
            <p className="text-muted-foreground mt-1 ml-[46px] text-sm">
              Track and manage your AI-built projects
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setShowRecreateForm(true); setShowCreateForm(false); }}
              className="gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">From URL</span>
            </Button>
            <Button
              size="sm"
              onClick={() => { setShowCreateForm(true); setShowRecreateForm(false); }}
              className="gap-1.5 shadow-md shadow-primary/10"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">New Project</span>
            </Button>
          </div>
        </div>

        {/* Create project form */}
        {showCreateForm && (
          <Card className="mb-6 border-primary/30 shadow-xl shadow-primary/10 bg-gradient-to-br from-card via-card to-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Rocket className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">New Project</CardTitle>
                    <CardDescription className="text-xs mt-0.5">AI will scaffold the full structure on launch</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowCreateForm(false); setError(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="project-name" className="text-sm font-medium mb-1.5 block">Project Name *</label>
                  <input
                    id="project-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="My Awesome SaaS"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-shadow"
                    autoFocus
                  />
                </div>
                <div>
                  <label htmlFor="project-description" className="text-sm font-medium mb-1.5 block">
                    Description <span className="text-muted-foreground font-normal">(helps AI scaffold better)</span>
                  </label>
                  <textarea
                    id="project-description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="What does this project do? Who is it for?"
                    rows={2}
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 resize-none transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Project Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {projectTypes.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, type: t.value }))}
                        className={`px-3 py-2 rounded-md border text-xs font-medium transition-all ${
                          formData.type === t.value
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2 justify-end pt-1">
                  <Button type="button" variant="ghost" onClick={() => { setShowCreateForm(false); setError(null); }}>Cancel</Button>
                  <Button type="submit" disabled={creating} className="gap-2 shadow-md shadow-primary/20">
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Launch Project
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Recreate from URL form */}
        {showRecreateForm && (
          <Card className="mb-6 border-primary/20 shadow-lg shadow-primary/5">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Create from URL
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setShowRecreateForm(false); setError(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-xs">
                Paste a website URL. An original project will be created inspired by it — then open it in chat to build it out with AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecreate} className="space-y-4">
                <div>
                  <label htmlFor="recreate-url" className="text-sm font-medium mb-1.5 block">URL *</label>
                  <input
                    id="recreate-url"
                    type="text"
                    value={recreateUrl}
                    onChange={(e) => setRecreateUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
                    autoFocus
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="ghost" onClick={() => { setShowRecreateForm(false); setError(null); }}>Cancel</Button>
                  <Button type="submit" disabled={recreating || !recreateUrl.trim()} className="gap-2 shadow-md shadow-primary/20">
                    {recreating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        Launch Project
                      </>
                    )}
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
        ) : error && projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Could not load projects</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">{error}</p>
            <Button onClick={() => { setLoading(true); fetchProjects(); }} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="h-8 w-8 text-primary opacity-50" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Create a project here or start a chat and ask the AI to build something.
              Projects will appear here with visual previews.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button onClick={() => setShowCreateForm(true)} className="gap-2 shadow-md shadow-primary/10">
                <Rocket className="h-4 w-4" />
                Launch First Project
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="border-border/50 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all group overflow-hidden cursor-pointer"
                onClick={() => { if (editingId !== project.id) router.push(`/projects/${project.id}`); }}
              >
                {/* Thumbnail Link kept for accessibility/right-click; stopPropagation prevents
                    double-navigation with the card-level onClick below */}
                <Link href={`/projects/${project.id}`} className="block cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <ProjectThumbnail project={project} />
                </Link>

                <CardHeader className="pb-2 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    {editingId === project.id ? (
                      <div className="flex items-center gap-1.5 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleRename(project.id)}>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditingId(null); setEditName(""); }}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <CardTitle className="text-base leading-tight truncate flex-1 min-w-0">
                        {project.name}
                      </CardTitle>
                    )}

                    {/* Action buttons - always visible */}
                    {editingId !== project.id && (
                      <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity"
                          onClick={() => { setEditingId(project.id); setEditName(project.name); }}
                          title="Rename project"
                        >
                          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-60 hover:opacity-100 transition-opacity"
                          onClick={() => handleDelete(project.id)}
                          disabled={deletingId === project.id}
                          title={confirmDeleteId === project.id ? "Click again to confirm" : "Delete project"}
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-destructive" />
                          ) : (
                            <Trash2 className={`h-3.5 w-3.5 ${confirmDeleteId === project.id ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-destructive"}`} />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                  {project.description && (
                    <CardDescription className="mt-1 line-clamp-2 text-xs">
                      {project.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0 pb-3">
                  <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {project.githubRepo && (
                      <a
                        href={project.githubRepo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary border border-border/50 rounded-md px-2 py-0.5 hover:bg-primary/5 hover:border-primary/20 transition-all"
                      >
                        <Github className="h-3 w-3" />
                        GitHub
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    {project.vercelUrl && (
                      <a
                        href={project.vercelUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary border border-border/50 rounded-md px-2 py-0.5 hover:bg-primary/5 hover:border-primary/20 transition-all"
                      >
                        <Zap className="h-3 w-3" />
                        Live
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-[11px] text-primary border border-primary/20 rounded-md px-2 py-0.5 hover:bg-primary/10 transition-all font-medium"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Open Project
                    </Link>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
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
