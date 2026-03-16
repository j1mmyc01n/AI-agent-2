"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ListTodo, CheckCircle2, Circle, Clock } from "lucide-react";

export interface TodoItem {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "done";
  description?: string;
}

interface TodoPanelProps {
  todos?: TodoItem[];
}

const statusConfig = {
  pending: { icon: Circle, label: "Pending", color: "text-muted-foreground", badge: "outline" as const },
  "in-progress": { icon: Clock, label: "In Progress", color: "text-blue-500", badge: "default" as const },
  done: { icon: CheckCircle2, label: "Done", color: "text-green-500", badge: "secondary" as const },
};

export default function TodoPanel({ todos = [] }: TodoPanelProps) {
  if (todos.length === 0) {
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

  const done = todos.filter((t) => t.status === "done").length;
  const total = todos.length;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Progress */}
        <div className="rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">{done}/{total} tasks</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all duration-500"
              style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Task list */}
        <div className="space-y-2">
          {todos.map((todo) => {
            const { icon: StatusIcon, label, color, badge } = statusConfig[todo.status];
            return (
              <div
                key={todo.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                  todo.status === "done" ? "opacity-60 bg-muted/20" : "bg-background hover:bg-muted/20"
                }`}
              >
                <StatusIcon className={`h-4 w-4 mt-0.5 shrink-0 ${color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${todo.status === "done" ? "line-through text-muted-foreground" : ""}`}>
                      {todo.title}
                    </p>
                    <Badge variant={badge} className="text-xs shrink-0">{label}</Badge>
                  </div>
                  {todo.description && (
                    <p className="text-xs text-muted-foreground mt-1">{todo.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
