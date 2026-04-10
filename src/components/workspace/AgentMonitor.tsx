"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Brain,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Clock,
  Zap,
  Shield,
  ChevronDown,
  ChevronUp,
  Square,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type AgentHealthStatus = "active" | "idle" | "stalled" | "error";

interface AgentMetrics {
  status: AgentHealthStatus;
  lastActivity: Date;
  messagesInSession: number;
  codeBlocksGenerated: number;
  toolCallsMade: number;
  avgResponseTime: number;
  stallDetected: boolean;
  projectProgress: number; // 0-100
}

interface AgentMonitorProps {
  isLoading: boolean;
  agentStatus: string;
  messageCount: number;
  codeBlockCount: number;
  toolCallCount: number;
  onRetry?: () => void;
  onNudge?: (prompt: string) => void;
  onStop?: () => void;
}

const STALL_THRESHOLD_MS = 45_000; // 45 seconds without activity = stalled

export default function AgentMonitor({
  isLoading,
  agentStatus,
  messageCount,
  codeBlockCount,
  toolCallCount,
  onRetry,
  onNudge,
  onStop,
}: AgentMonitorProps) {
  const [metrics, setMetrics] = useState<AgentMetrics>({
    status: "idle",
    lastActivity: new Date(),
    messagesInSession: 0,
    codeBlocksGenerated: 0,
    toolCallsMade: 0,
    avgResponseTime: 0,
    stallDetected: false,
    projectProgress: 0,
  });
  const [expanded, setExpanded] = useState(false);
  const [stallTimer, setStallTimer] = useState(0);

  // Update metrics when props change
  useEffect(() => {
    setMetrics((prev) => {
      const now = new Date();
      const hasNewActivity =
        messageCount !== prev.messagesInSession ||
        codeBlockCount !== prev.codeBlocksGenerated ||
        toolCallCount !== prev.toolCallsMade;

      let status: AgentHealthStatus = "idle";
      if (isLoading || agentStatus !== "idle") {
        status = "active";
      } else if (prev.stallDetected) {
        status = "stalled";
      }

      // Calculate progress based on activity
      const progress = Math.min(
        100,
        Math.round(
          (messageCount * 10 + codeBlockCount * 25 + toolCallCount * 15)
        )
      );

      return {
        ...prev,
        status,
        lastActivity: hasNewActivity ? now : prev.lastActivity,
        messagesInSession: messageCount,
        codeBlocksGenerated: codeBlockCount,
        toolCallsMade: toolCallCount,
        stallDetected: false,
        projectProgress: progress,
      };
    });
  }, [isLoading, agentStatus, messageCount, codeBlockCount, toolCallCount]);

  // Stall detection timer
  useEffect(() => {
    if (!isLoading && agentStatus === "idle") {
      const interval = setInterval(() => {
        const elapsed = Date.now() - metrics.lastActivity.getTime();
        setStallTimer(Math.floor(elapsed / 1000));

        if (elapsed > STALL_THRESHOLD_MS && messageCount > 0) {
          setMetrics((prev) => ({
            ...prev,
            status: "stalled",
            stallDetected: true,
          }));
        }
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setStallTimer(0);
    }
  }, [isLoading, agentStatus, metrics.lastActivity, messageCount]);

  const NUDGE_PROMPTS = [
    "Continue building. Write the next missing file as a complete code block. Do not summarize or describe — write the actual code now.",
    "The preview is showing a blank page. This means CSS and JS files are missing or incomplete. Re-write ALL 8 files starting with index.html. Make it premium — dark theme, sidebar, KPI cards, data table.",
    "Output is incomplete. Write the remaining files now. Start with ```javascript:src/js/components.js and include: createSidebar(), createNavbar(), createStatCard(), createModal(), createChart() functions. Then write src/js/app.js with tailwind.config at the top.",
    "The project needs premium visual quality. Rebuild src/css/styles.css with the full design token system (CSS custom properties for surface, accent, text colors). Then rebuild src/css/components.css with glass morphism cards, gradient buttons, hover effects.",
    "Complete the build. Write src/js/app.js now. It must start with tailwind.config = { theme: { extend: { colors: { surface: {...}, accent: {...} } } } }, then init() function wiring all components, then document.addEventListener('DOMContentLoaded', init).",
  ];

  const handleNudge = useCallback(() => {
    if (onNudge) {
      const nudgeIndex = Math.min(
        Math.floor((toolCallCount === 0 ? 1 : 0) + (codeBlockCount < 3 ? 1 : 0)),
        NUDGE_PROMPTS.length - 1
      );
      onNudge(NUDGE_PROMPTS[nudgeIndex]);
    }
  }, [onNudge, toolCallCount, codeBlockCount]);

  const getStatusColor = (status: AgentHealthStatus) => {
    switch (status) {
      case "active":
        return "text-green-400 bg-green-500/10 border-green-500/20";
      case "idle":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "stalled":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      case "error":
        return "text-red-400 bg-red-500/10 border-red-500/20";
    }
  };

  const getStatusIcon = (status: AgentHealthStatus) => {
    switch (status) {
      case "active":
        return <Brain className="h-3 w-3 animate-pulse" />;
      case "idle":
        return <Clock className="h-3 w-3" />;
      case "stalled":
        return <AlertTriangle className="h-3 w-3" />;
      case "error":
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getStatusLabel = (status: AgentHealthStatus) => {
    switch (status) {
      case "active":
        return "Agent Active";
      case "idle":
        return "Agent Idle";
      case "stalled":
        return "Stalled — Needs Attention";
      case "error":
        return "Error Detected";
    }
  };

  // Don't show if no activity yet
  if (messageCount === 0 && !isLoading) return null;

  return (
    <div className="border-b border-border/50 bg-card/30">
      {/* Compact bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${getStatusColor(metrics.status)}`}
          >
            {getStatusIcon(metrics.status)}
            <span>{getStatusLabel(metrics.status)}</span>
          </div>
          <Shield className="h-3 w-3 text-muted-foreground/50" />
          <span className="text-[10px] text-muted-foreground/60">
            Oversight
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <span>{metrics.messagesInSession} msgs</span>
            <span className="opacity-30">|</span>
            <span>{metrics.codeBlocksGenerated} code</span>
            <span className="opacity-30">|</span>
            <span>{metrics.toolCallsMade} actions</span>
          </div>

          {/* Progress indicator */}
          {metrics.projectProgress > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${metrics.projectProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground/60">
                {metrics.projectProgress}%
              </span>
            </div>
          )}

          {/* Always-visible action buttons */}
          <div className="flex items-center gap-1">
            {(isLoading || agentStatus !== "idle") && onStop && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] border-red-500/30 hover:bg-red-500/10 text-red-400"
                onClick={(e) => { e.stopPropagation(); onStop(); }}
                title="Stop/pause the agent"
              >
                <Square className="h-2.5 w-2.5 mr-1 fill-current" />
                Stop
              </Button>
            )}
            {!(isLoading || agentStatus !== "idle") && messageCount > 0 && onNudge && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 px-2 text-[10px] border-primary/30 hover:bg-primary/10 text-primary"
                onClick={(e) => { e.stopPropagation(); handleNudge(); }}
                title="Nudge the agent to continue working"
              >
                <Play className="h-2.5 w-2.5 mr-1 fill-current" />
                Nudge
              </Button>
            )}
          </div>

          {expanded ? (
            <ChevronUp className="h-3 w-3 text-muted-foreground/40" />
          ) : (
            <ChevronDown className="h-3 w-3 text-muted-foreground/40" />
          )}
        </div>
      </button>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-2 pt-1 border-t border-border/30 space-y-2">
          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/20">
              <Activity className="h-3 w-3 text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Messages</p>
                <p className="text-xs font-semibold">
                  {metrics.messagesInSession}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/20">
              <Zap className="h-3 w-3 text-yellow-400" />
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Code Blocks
                </p>
                <p className="text-xs font-semibold">
                  {metrics.codeBlocksGenerated}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/20">
              <Brain className="h-3 w-3 text-violet-400" />
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Tool Calls
                </p>
                <p className="text-xs font-semibold">
                  {metrics.toolCallsMade}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/20">
              <Clock className="h-3 w-3 text-blue-400" />
              <div>
                <p className="text-[10px] text-muted-foreground">
                  Idle Time
                </p>
                <p className="text-xs font-semibold">
                  {stallTimer > 60
                    ? `${Math.floor(stallTimer / 60)}m ${stallTimer % 60}s`
                    : `${stallTimer}s`}
                </p>
              </div>
            </div>
          </div>

          {/* Stall warning + actions */}
          {metrics.stallDetected && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/20">
              <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-300 flex-1">
                The AI agent appears stalled. The project may need a nudge to
                continue building.
              </p>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px] border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400"
                  onClick={handleNudge}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Nudge Agent
                </Button>
                {onRetry && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] border-yellow-500/30 hover:bg-yellow-500/10 text-yellow-400"
                    onClick={onRetry}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Health check summary */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/50 px-1">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500/50" />
              <span>Session monitored</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="h-3 w-3 text-primary/50" />
              <span>
                Auto-stall detection at {STALL_THRESHOLD_MS / 1000}s
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
