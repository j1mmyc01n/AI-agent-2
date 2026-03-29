"use client";

import { useState, useEffect } from "react";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronLeft, ChevronRight, Code2, ListTodo, Eye, MessageSquare, Bot } from "lucide-react";

export type PanelView = "chat" | "code" | "todo" | "preview";

interface MainLayoutProps {
  children: React.ReactNode;
  currentConversationId?: string;
  activePanel?: PanelView;
  onPanelChange?: (panel: PanelView) => void;
  showPanelTabs?: boolean;
}

export default function MainLayout({
  children,
  currentConversationId,
  activePanel = "chat",
  onPanelChange,
  showPanelTabs = false,
}: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  const panelTabs = [
    { id: "chat" as PanelView, label: "Chat", icon: MessageSquare },
    { id: "code" as PanelView, label: "Code", icon: Code2 },
    { id: "todo" as PanelView, label: "Tasks", icon: ListTodo },
    { id: "preview" as PanelView, label: "Preview", icon: Eye },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ height: "100dvh" }}>
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${
            isMobile
              ? sidebarOpen
                ? "translate-x-0 w-64"
                : "-translate-x-full w-64"
              : sidebarCollapsed
              ? "w-16"
              : "w-64"
          }
        `}
      >
        <ConversationSidebar
          currentConversationId={currentConversationId}
          collapsed={!isMobile && sidebarCollapsed}
        />

        {/* Desktop collapse toggle */}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-accent"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="relative flex items-center justify-between px-4 border-b bg-background shrink-0 h-14">
          {/* Left: mobile menu toggle + title */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2 md:hidden">
              <Bot className="h-5 w-5 text-primary" />
              <span className="font-bold text-base bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                DoBetter Viber
              </span>
            </div>
          </div>

          {/* Center: DoBetter Viber title on desktop */}
          <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
              DoBetter Viber
            </span>
          </div>

          {/* Right: Panel view tabs */}
          <div className="ml-auto">
            {showPanelTabs ? (
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {panelTabs.map(({ id, label, icon: Icon }) => (
                  <Button
                    key={id}
                    variant={activePanel === id ? "default" : "ghost"}
                    size="sm"
                    className={`gap-1.5 px-2.5 h-8 text-xs font-medium transition-all ${
                      activePanel === id ? "shadow-sm" : "hover:bg-background/60"
                    }`}
                    onClick={() => onPanelChange?.(id)}
                    title={label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{label}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <div />
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
