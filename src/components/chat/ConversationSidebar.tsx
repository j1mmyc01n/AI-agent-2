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
} from "@/components/ui/dropdown-menu";
import {
  MessageSquarePlus,
  FolderOpen,
  Settings,
  Trash2,
  MoreHorizontal,
  Bot,
  LogOut,
  User,
  LayoutDashboard,
  Sparkles,
  Globe,
  History,
  ChevronDown,
  ChevronRight,
  MessageSquare,
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
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(["unassigned"]));

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
    window.addEventListener("dobetter-conversations-updated", handleProjectUpdate);
    return () => {
      window.removeEventListener("dobetter-projects-updated", handleProjectUpdate);
      window.removeEventListener("dobetter-conversations-updated", handleProjectUpdate);
    };
  }, [fetchProjects, fetchConversations]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (currentConversationId === id) {
          router.push("/chat");
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error);
    }
  };

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  // Group conversations by project
  const projectConversations = new Map<string, Conversation[]>();
  const unassigned: Conversation[] = [];

  conversations.forEach((conv) => {
    if (conv.projectId) {
      const existing = projectConversations.get(conv.projectId) || [];
      existing.push(conv);
      projectConversations.set(conv.projectId, existing);
    } else {
      unassigned.push(conv);
    }
  });

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
      <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => handleDelete(conv.id, e)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-sidebar-bg border-r border-border/50">
      {/* Header */}
      <div className={`p-3 border-b border-border/50 ${collapsed ? "px-2" : ""}`}>
        <Link href="/" className={`flex items-center gap-2.5 px-2 py-1.5 mb-2 ${collapsed ? "justify-center" : ""}`}>
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
            <Button variant="outline" size="icon" className="w-full border-primary/20 hover:bg-primary/10">
              <MessageSquarePlus className="h-4 w-4 text-primary" />
            </Button>
          </Link>
        )}
      </div>

      {/* Conversations grouped by project */}
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
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs">No conversations yet</p>
              <p className="text-xs opacity-60 mt-0.5">Start a new chat!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {/* Project-grouped conversations */}
              {projects.filter(p => projectConversations.has(p.id)).map((project) => (
                <div key={project.id}>
                  <button
                    onClick={() => toggleProject(project.id)}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full text-left"
                  >
                    <ChevronRight className={`h-3 w-3 transition-transform ${expandedProjects.has(project.id) ? "rotate-90" : ""}`} />
                    <FolderOpen className="h-3 w-3" />
                    <span className="truncate">{project.name}</span>
                    <span className="text-[10px] ml-auto opacity-50">{projectConversations.get(project.id)?.length}</span>
                  </button>
                  {expandedProjects.has(project.id) && (
                    <div className="ml-2">
                      {projectConversations.get(project.id)?.map(renderConversation)}
                    </div>
                  )}
                </div>
              ))}

              {/* Unassigned conversations */}
              {unassigned.length > 0 && (
                <div>
                  {projects.some(p => projectConversations.has(p.id)) && (
                    <button
                      onClick={() => toggleProject("unassigned")}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground w-full text-left"
                    >
                      <ChevronRight className={`h-3 w-3 transition-transform ${expandedProjects.has("unassigned") ? "rotate-90" : ""}`} />
                      <MessageSquare className="h-3 w-3" />
                      <span>Chats</span>
                      <span className="text-[10px] ml-auto opacity-50">{unassigned.length}</span>
                    </button>
                  )}
                  {(expandedProjects.has("unassigned") || !projects.some(p => projectConversations.has(p.id))) && (
                    <div className={projects.some(p => projectConversations.has(p.id)) ? "ml-2" : ""}>
                      {unassigned.map(renderConversation)}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Main Navigation */}
      <div className={`px-2 py-2 border-t border-border/50 ${collapsed ? "px-1" : ""}`}>
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
                <Icon className={`h-4 w-4 flex-shrink-0 ${pathname === href ? "text-primary" : ""}`} />
                {!collapsed && <span className="truncate text-sm">{label}</span>}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer Nav */}
      <div className={`p-2 border-t border-border/50 space-y-0.5 ${collapsed ? "px-1" : ""}`}>
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
            <Settings className={`h-4 w-4 flex-shrink-0 ${pathname === "/settings" ? "text-primary" : ""}`} />
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
              {!collapsed && <span className="truncate text-sm">Profile</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
