"use client";

import { useState, useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTodo, CheckCircle2, Circle, Clock, SkipForward, X, ChevronDown, ChevronUp, Loader2, Brain, Code2, Sparkles } from "lucide-react";

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  description?: string;
}

type AgentStatus = "idle" | "thinking" | "coding" | "searching" | "deploying" | "saving";

interface TodoPanelProps {
  todos?: TodoItem[];
  agentStatus?: AgentStatus;
}

const statusConfig = {
  pending: { icon: Circle, label: "Pending", color: "text-muted-foreground", badge: "outline" as const, bg: "" },
  "in-progress": { icon: Loader2, label: "In Progress", color: "text-blue-500", badge: "default" as const, bg: "bg-blue-500/5 border-blue-500/20" },
  done: { icon: CheckCircle2, label: "Done", color: "text-green-500", badge: "secondary" as const, bg: "bg-green-500/5 border-green-500/20" },
  skipped: { icon: SkipForward, label: "Skipped", color: "text-yellow-500", badge: "outline" as const, bg: "" },
};

export default function TodoPanel({ todos: initialTodos = [], agentStatus = "idle" }: TodoPanelProps) {
  const [localOverrides, setLocalOverrides] = useState<Record<string, "skipped">>({});
  const [showSkipped, setShowSkipped] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Merge local overrides with incoming todos
  const mergedTodos = initialTodos.map((todo) => {
    if (localOverrides[todo.id]) {
      return { ...todo, status: localOverrides[todo.id] };
    }
    return todo;
  });

  const activeTodos = mergedTodos.filter((t) => t.status !== "skipped");
  const skippedTodos = mergedTodos.filter((t) => t.status === "skipped");

  // Auto-scroll to the current in-progress task
  useEffect(() => {
    const inProgressIdx = activeTodos.findIndex(t => t.status === "in-progress");
    if (inProgressIdx >= 0 && scrollRef.current) {
      const items = scrollRef.current.querySelectorAll("[data-todo-item]");
      if (items[inProgressIdx]) {
        items[inProgressIdx].scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [activeTodos]);

  const handleSkip = (id: string) => {
    setLocalOverrides(prev => ({ ...prev, [id]: "skipped" }));
  };

  const handleRestore = (id: string) => {
    setLocalOverrides(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Show active agent status even when there are no parsed tasks
  if (initialTodos.length === 0) {
    if (agentStatus !== "idle") {
      // Agent is working but no tasks parsed yet - show activity indicator
      return (
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            <div className="rounded-lg border p-4 bg-muted/30">
              <div className="flex items-center gap-3 mb-3">
                {agentStatus === "thinking" && <Brain className="h-5 w-5 text-primary animate-pulse" />}
                {agentStatus === "coding" && <Code2 className="h-5 w-5 text-primary animate-pulse" />}
                {agentStatus === "searching" && <Sparkles className="h-5 w-5 text-primary animate-pulse" />}
                {(agentStatus === "deploying" || agentStatus === "saving") && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
                <div>
                  <p className="text-sm font-medium">
                    {agentStatus === "thinking" && "Agent is analyzing your request..."}
                    {agentStatus === "coding" && "Agent is writing code..."}
                    {agentStatus === "searching" && "Agent is searching the web..."}
                    {agentStatus === "deploying" && "Agent is deploying..."}
                    {agentStatus === "saving" && "Agent is saving your project..."}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Tasks will appear here as the agent plans and executes work
                  </p>
                </div>
              </div>
              {/* Activity pulse animation */}
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 flex-1 rounded-full bg-primary/20 overflow-hidden"
                  >
                    <div
                      className="h-full bg-primary rounded-full animate-pulse"
                      style={{
                        animationDelay: `${i * 200}ms`,
                        width: `${60 + Math.random() * 40}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ListTodo className="h-8 w-8 opacity-30" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-medium mb-1">No tasks yet</p>
          <p className="text-sm opacity-70">
            Switch to <span className="font-semibold text-orange-500">Build</span> mode and describe your project.
            Tasks will appear here as the agent works through them.
          </p>
        </div>
      </div>
    );
  }

  const done = activeTodos.filter((t) => t.status === "done").length;
  const inProgress = activeTodos.filter((t) => t.status === "in-progress").length;
  const total = activeTodos.length;
  const progressPercent = total > 0 ? (done / total) * 100 : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4" ref={scrollRef}>
        {/* Progress */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Progress</span>
              {inProgress > 0 && (
                <Badge variant="default" className="bg-blue-500 text-[10px] h-5 px-1.5 animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 mr-0.5 animate-spin" />
                  Working
                </Badge>
              )}
              {done === total && total > 0 && (
                <Badge variant="default" className="bg-green-500 text-[10px] h-5 px-1.5">
                  <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                  Complete
                </Badge>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {done}/{total} tasks
              {skippedTodos.length > 0 && (
                <span className="text-xs opacity-60 ml-1">({skippedTodos.length} skipped)</span>
              )}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-primary rounded-full h-2.5 transition-all duration-700 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Status summary */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {done} done
            </span>
            {inProgress > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-500" />
                {inProgress} in progress
              </span>
            )}
            <span className="flex items-center gap-1">
              <Circle className="h-3 w-3 text-muted-foreground" />
              {total - done - inProgress} remaining
            </span>
          </div>
        </div>

        {/* Active task list */}
        <div className="space-y-2">
          {activeTodos.map((todo, idx) => {
            const config = statusConfig[todo.status] || statusConfig.pending;
            const isActive = todo.status === "in-progress";
            return (
              <div
                key={todo.id}
                data-todo-item
                className={`flex items-start gap-2.5 p-3 rounded-lg border transition-all group ${
                  todo.status === "done"
                    ? "opacity-60 bg-muted/20"
                    : isActive
                    ? `${config.bg} shadow-sm`
                    : "bg-background hover:bg-muted/20"
                }`}
              >
                {/* Step number or icon */}
                <div className={`flex items-center justify-center h-6 w-6 rounded-full shrink-0 mt-0.5 ${
                  todo.status === "done"
                    ? "bg-green-500/20"
                    : isActive
                    ? "bg-blue-500/20"
                    : "bg-muted"
                }`}>
                  {todo.status === "done" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                  ) : (
                    <span className="text-[11px] font-semibold text-muted-foreground">{idx + 1}</span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium leading-tight ${
                      todo.status === "done" ? "line-through text-muted-foreground" : ""
                    }`}>
                      {todo.title}
                    </p>
                    <Badge variant={config.badge} className={`text-[10px] shrink-0 ${
                      isActive ? "bg-blue-500 text-white" : ""
                    }`}>
                      {config.label}
                    </Badge>
                  </div>
                  {todo.description && (
                    <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                  )}
                </div>

                {/* Skip button */}
                {todo.status !== "done" && todo.status !== "in-progress" && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleSkip(todo.id)}
                      title="Skip this task"
                    >
                      <SkipForward className="h-3 w-3 text-yellow-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleSkip(todo.id)}
                      title="Remove this task"
                    >
                      <X className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Skipped tasks section */}
        {skippedTodos.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setShowSkipped(!showSkipped)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground w-full text-left px-1 py-1"
            >
              {showSkipped ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {skippedTodos.length} skipped task{skippedTodos.length !== 1 ? "s" : ""}
            </button>
            {showSkipped && (
              <div className="space-y-1 mt-1">
                {skippedTodos.map((todo) => (
                  <div
                    key={todo.id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-dashed opacity-50 hover:opacity-80 transition-opacity"
                  >
                    <SkipForward className="h-3 w-3 text-yellow-500 shrink-0" />
                    <p className="text-xs line-through flex-1 min-w-0 truncate">{todo.title}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => handleRestore(todo.id)}
                      title="Restore this task"
                    >
                      <Circle className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
