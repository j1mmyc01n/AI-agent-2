"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";

interface Conversation {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

interface ConversationSidebarProps {
  currentConversationId?: string;
}

export default function ConversationSidebar({
  currentConversationId,
}: ConversationSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
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
  };

  useEffect(() => {
    fetchConversations();
  }, [pathname]);

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

  const groupConversations = () => {
    const now = new Date();
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const older: Conversation[] = [];

    conversations.forEach((conv) => {
      const date = new Date(conv.updatedAt);
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 0) today.push(conv);
      else if (diffDays === 1) yesterday.push(conv);
      else older.push(conv);
    });

    return { today, yesterday, older };
  };

  const { today, yesterday, older } = groupConversations();

  const renderConversationGroup = (
    label: string,
    convs: Conversation[]
  ) => {
    if (convs.length === 0) return null;
    return (
      <div key={label} className="mb-2">
        <p className="px-3 py-1 text-xs font-medium text-muted-foreground">
          {label}
        </p>
        {convs.map((conv) => (
          <div key={conv.id} className="group relative">
            <Link
              href={`/chat/${conv.id}`}
              className={`flex items-center px-3 py-2 text-sm rounded-lg mx-1 hover:bg-accent transition-colors truncate ${
                currentConversationId === conv.id
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground"
              }`}
            >
              <span className="truncate flex-1 pr-6">{conv.title}</span>
            </Link>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
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
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-muted/30 border-r">
      {/* Header */}
      <div className="p-3 border-b">
        <Link href="/" className="flex items-center gap-2 px-2 py-1 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">AgentForge</span>
        </Link>
        <Link href="/chat">
          <Button variant="outline" className="w-full justify-start gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1 py-2">
        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations yet.
            <br />
            Start a new chat!
          </div>
        ) : (
          <div>
            {renderConversationGroup("Today", today)}
            {renderConversationGroup("Yesterday", yesterday)}
            {renderConversationGroup("Older", older)}
          </div>
        )}
      </ScrollArea>

      {/* Footer Nav */}
      <div className="p-3 border-t space-y-1">
        <Link href="/projects">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              pathname === "/projects" ? "bg-accent" : ""
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            Projects
          </Button>
        </Link>
        <Link href="/settings">
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 ${
              pathname === "/settings" ? "bg-accent" : ""
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2">
              <User className="h-4 w-4" />
              Account
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
