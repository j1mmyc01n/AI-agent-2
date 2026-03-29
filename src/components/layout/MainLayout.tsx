"use client";

import { useState, useEffect } from "react";
import ConversationSidebar from "@/components/chat/ConversationSidebar";
import { Button } from "@/components/ui/button";
import { Menu, X, ChevronLeft, ChevronRight, Bot } from "lucide-react";

export type PanelView = "chat" | "code" | "todo" | "preview";

interface MainLayoutProps {
  children: React.ReactNode;
  currentConversationId?: string;
}

export default function MainLayout({
  children,
  currentConversationId,
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

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={{ height: "100dvh", maxHeight: "100dvh" }}>
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
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
            className="absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border border-border/50 bg-background shadow-md hover:bg-accent hover:shadow-lg transition-all"
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
        <header className="relative flex items-center justify-between px-4 border-b border-border/50 bg-card/30 backdrop-blur-sm shrink-0 h-12">
          {/* Left: mobile menu toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center gap-2 md:hidden">
              <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                DoBetter Viber
              </span>
            </div>
          </div>

          {/* Center: title on desktop */}
          <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <div className="h-6 w-6 rounded-md bg-primary/15 flex items-center justify-center">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              DoBetter Viber
            </span>
          </div>

          <div className="ml-auto" />
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
