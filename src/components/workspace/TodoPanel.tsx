"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListTodo, CheckCircle2, Circle, Clock, SkipForward, X, ChevronDown, ChevronUp } from "lucide-react";

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  description?: string;
}

interface TodoPanelProps {
  todos?: TodoItem[];
}

const statusConfig = {
  pending: { icon: Circle, label: "Pending", color: "text-muted-foreground", badge: "outline" as const },
  "in-progress": { icon: Clock, label: "In Progress", color: "text-blue-500", badge: "default" as const },
  done: { icon: CheckCircle2, label: "Done", color: "text-green-500", badge: "secondary" as const },
  skipped: { icon: SkipForward, label: "Skipped", color: "text-yellow-500", badge: "outline" as const },
};

export default function TodoPanel({ todos: initialTodos = [] }: TodoPanelProps) {
  const [todos, setTodos] = useState<TodoItem[]>(initialTodos);
  const [showSkipped, setShowSkipped] = useState(false);

  // Sync with new incoming todos from messages
  const mergedTodos = initialTodos.map((incoming) => {
    const existing = todos.find((t) => t.id === incoming.id);
    if (existing && (existing.status === "skipped")) {
      return existing; // preserve user's skip/remove action
    }
    return incoming;
  });

  const activeTodos = mergedTodos.filter((t) => t.status !== "skipped");
  const skippedTodos = mergedTodos.filter((t) => t.status === "skipped");

  const handleSkip = (id: string) => {
    setTodos((prev) => {
      const exists = prev.find((t) => t.id === id);
      if (exists) {
        return prev.map((t) => (t.id === id ? { ...t, status: "skipped" as const } : t));
      }
      const incoming = initialTodos.find((t) => t.id === id);
      if (incoming) {
        return [...prev, { ...incoming, status: "skipped" as const }];
      }
      return prev;
    });
  };

  const handleRemove = (id: string) => {
    setTodos((prev) => {
      const exists = prev.find((t) => t.id === id);
      if (exists) {
        return prev.map((t) => (t.id === id ? { ...t, status: "skipped" as const } : t));
      }
      const incoming = initialTodos.find((t) => t.id === id);
      if (incoming) {
        return [...prev, { ...incoming, status: "skipped" as const }];
      }
      return prev;
    });
  };

  const handleRestore = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  };

  if (initialTodos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <ListTodo className="h-12 w-12 opacity-30" />
        <div className="text-center">
          <p className="font-medium">No tasks yet</p>
          <p className="text-sm mt-1">Ask the agent to plan a project and tasks will appear here</p>
        </div>
      </div>
    );
  }

  const done = activeTodos.filter((t) => t.status === "done").length;
  const total = activeTodos.length;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Progress */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {done}/{total} tasks
              {skippedTodos.length > 0 && (
                <span className="text-xs opacity-60 ml-1">({skippedTodos.length} skipped)</span>
              )}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Active task list */}
        <div className="space-y-2">
          {activeTodos.map((todo) => {
            const { icon: StatusIcon, label, color, badge } = statusConfig[todo.status] || statusConfig.pending;
            return (
              <div
                key={todo.id}
                className={`flex items-start gap-2 p-3 rounded-lg border transition-colors group ${
                  todo.status === "done" ? "opacity-60 bg-muted/20" : "bg-background hover:bg-muted/20"
                }`}
              >
                <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${todo.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {todo.title}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={badge} className="text-xs">{label}</Badge>
                    </div>
                  </div>
                  {todo.description && (
                    <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                  )}
                </div>
                {/* Skip and Remove buttons */}
                {todo.status !== "done" && (
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
                      onClick={() => handleRemove(todo.id)}
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
