"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquarePlus,
  Settings,
  Trash2,
  MoreHorizontal,
  Bot,
  LogOut,
  User,
  LayoutDashboard,
  FolderOpen,
  Sparkles,
  Globe,
  History,
  MessageSquare,
  Eraser,
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  projectId?: string | null;
  _count: { messages: number };
}

interface Project {
  id: string;
  name: string;
  type?: string;
  status?: string;
}

interface ConversationSidebarProps {
  currentConversationId?: string;
  collapsed?: boolean;
}

export default function ConversationSidebar({
  currentConversationId,
  collapsed = false,
}: ConversationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch {
      // Projects not available
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchProjects();
  }, [fetchConversations, fetchProjects]);

  // Listen for project/conversation updates from chat
  useEffect(() => {
    const handleProjectUpdate = () => {
      fetchProjects();
      fetchConversations();
    };
    window.addEventListener("dobetter-projects-updated", handleProjectUpdate);
    window.addEventListener(
      "dobetter-conversations-updated",
      handleProjectUpdate
    );
    return () => {
      window.removeEventListener(
        "dobetter-projects-updated",
        handleProjectUpdate
      );
      window.removeEventListener(
        "dobetter-conversations-updated",
        handleProjectUpdate
      );
    };
  }, [fetchProjects, fetchConversations]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDeletingId(id);

    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          router.push("/chat");
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    if (conversations.length === 0) return;
    setClearingAll(true);

    try {
      // Delete all conversations one by one
      const deletePromises = conversations.map((conv) =>
        fetch(`/api/conversations/${conv.id}`, { method: "DELETE" }).catch(
          () => null
        )
      );
      await Promise.all(deletePromises);
      setConversations([]);
      if (currentConversationId) {
        router.push("/chat");
      }
    } catch (error) {
      console.error("Failed to clear conversations:", error);
    } finally {
      setClearingAll(false);
    }
  };

  const navItems = [
    { href: "/workspace", icon: LayoutDashboard, label: "Workspace" },
    { href: "/projects", icon: FolderOpen, label: "Projects" },
    { href: "/generate", icon: Sparkles, label: "Generate" },
    { href: "/connectivity", icon: Globe, label: "Connectivity" },
    { href: "/history", icon: History, label: "History" },
  ];

  const renderConversation = (conv: Conversation) => (
    <div key={conv.id} className="group relative">
      <Link
        href={`/chat/${conv.id}`}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg mx-1 transition-colors truncate ${
          currentConversationId === conv.id
            ? "bg-primary/15 text-primary border border-primary/20"
            : "text-foreground/80 hover:bg-accent hover:text-foreground"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-50" />
        <span className="truncate flex-1 text-xs">{conv.title}</span>
      </Link>
      {/* Delete button - always visible on right side */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => handleDelete(conv.id, e)}
          disabled={deletingId === conv.id}
          className="h-5 w-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete conversation"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-sidebar-bg border-r border-border/50">
      {/* Header */}
      <div className={`p-3 border-b border-border/50 ${collapsed ? "px-2" : ""}`}>
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-2 py-1.5 mb-2 ${collapsed ? "justify-center" : ""}`}
        >
          <div className="h-7 w-7 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base truncate bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              DoBetter Viber
            </span>
          )}
        </Link>
        {!collapsed ? (
          <Link href="/chat">
            <Button className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-medium text-sm h-9">
              <MessageSquarePlus className="h-4 w-4 flex-shrink-0" />
              New Chat
            </Button>
          </Link>
        ) : (
          <Link href="/chat">
            <Button
              variant="outline"
              size="icon"
              className="w-full border-primary/20 hover:bg-primary/10"
            >
              <MessageSquarePlus className="h-4 w-4 text-primary" />
            </Button>
          </Link>
        )}
      </div>

      {/* Projects & Conversations list */}
      {!collapsed && (
        <ScrollArea className="flex-1 py-2">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-primary agent-dot-1" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary agent-dot-2" />
                <div className="h-1.5 w-1.5 rounded-full bg-primary agent-dot-3" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Projects section - prominently listed */}
              {projects.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-3 mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                      Projects ({projects.length})
                    </span>
                    <Link href="/projects">
                      <span className="text-[10px] text-primary/60 hover:text-primary transition-colors cursor-pointer">View all</span>
                    </Link>
                  </div>
                  <div className="space-y-0.5">
                    {projects.map((project) => {
                      const projectConvs = conversations.filter(c => c.projectId === project.id);
                      const isOnProjectPage = pathname === `/projects/${project.id}`;
                      return (
                        <div key={project.id}>
                          <Link
                            href={`/projects/${project.id}`}
                            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg mx-1 transition-colors ${
                              isOnProjectPage
                                ? "bg-primary/15 text-primary border border-primary/20"
                                : "text-foreground/80 hover:bg-accent hover:text-foreground"
                            }`}
                          >
                            <FolderOpen className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                            <span className="truncate flex-1 text-xs font-medium">{project.name}</span>
                            {project.status && (
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                project.status === "active" ? "bg-green-400" : "bg-muted-foreground/40"
                              }`} />
                            )}
                          </Link>
                          {/* Conversations belonging to this project - nested */}
                          {projectConvs.length > 0 && (
                            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-border/30 pl-2">
                              {projectConvs.map((conv) => (
                                <div key={conv.id} className="group relative">
                                  <Link
                                    href={`/chat/${conv.id}`}
                                    className={`flex items-center gap-2 px-2 py-1 text-xs rounded-md transition-colors ${
                                      currentConversationId === conv.id
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    }`}
                                  >
                                    <MessageSquare className="h-3 w-3 shrink-0 opacity-50" />
                                    <span className="truncate flex-1">{conv.title}</span>
                                  </Link>
                                  <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={(e) => handleDelete(conv.id, e)}
                                      disabled={deletingId === conv.id}
                                      className="h-4 w-4 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                      title="Delete conversation"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unlinked conversations (not attached to a project) */}
              {(() => {
                const projectIds = new Set(projects.map(p => p.id));
                const unlinkedConvs = conversations.filter(c => !c.projectId || !projectIds.has(c.projectId));
                if (unlinkedConvs.length === 0 && projects.length > 0) return null;
                return (
                  <div>
                    <div className="flex items-center justify-between px-3 mb-1">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                        Chats ({unlinkedConvs.length})
                      </span>
                      {unlinkedConvs.length > 0 && (
                        <button
                          onClick={handleClearAll}
                          disabled={clearingAll}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-destructive transition-colors"
                          title="Clear all conversations"
                        >
                          <Eraser className="h-3 w-3" />
                          <span>{clearingAll ? "Clearing..." : "Clear all"}</span>
                        </button>
                      )}
                    </div>
                    {unlinkedConvs.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">No conversations yet</p>
                        <p className="text-xs opacity-60 mt-0.5">Start a new chat!</p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {unlinkedConvs.map(renderConversation)}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Main Navigation */}
      <div
        className={`px-2 py-2 border-t border-border/50 ${collapsed ? "px-1" : ""}`}
      >
        <div className="space-y-0.5">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href}>
              <Button
                variant="ghost"
                className={`w-full gap-2 h-9 ${
                  pathname === href
                    ? "bg-primary/10 text-primary hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                } ${collapsed ? "justify-center px-2" : "justify-start"}`}
                size={collapsed ? "icon" : "default"}
              >
                <Icon
                  className={`h-4 w-4 flex-shrink-0 ${pathname === href ? "text-primary" : ""}`}
                />
                {!collapsed && (
                  <span className="truncate text-sm">{label}</span>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Nav */}
      <div
        className={`p-2 border-t border-border/50 space-y-0.5 ${collapsed ? "px-1" : ""}`}
      >
        <Link href="/settings">
          <Button
            variant="ghost"
            className={`w-full gap-2 h-9 ${
              pathname === "/settings"
                ? "bg-primary/10 text-primary hover:bg-primary/15"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            } ${collapsed ? "justify-center px-2" : "justify-start"}`}
            size={collapsed ? "icon" : "default"}
          >
            <Settings
              className={`h-4 w-4 flex-shrink-0 ${pathname === "/settings" ? "text-primary" : ""}`}
            />
            {!collapsed && <span className="truncate text-sm">Settings</span>}
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full gap-2 h-9 text-muted-foreground hover:text-foreground hover:bg-accent ${collapsed ? "justify-center px-2" : "justify-start"}`}
              size={collapsed ? "icon" : "default"}
            >
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              {!collapsed && (
                <span className="truncate text-sm">Profile</span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="flex items-center cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
