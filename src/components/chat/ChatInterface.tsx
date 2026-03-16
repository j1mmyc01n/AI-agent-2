"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { toast } from "@/components/ui/use-toast";
import { type AIModel, DEFAULT_MODEL, AI_PROVIDERS } from "./ModelSelector";
import { type PanelView } from "@/components/layout/MainLayout";
import CodePanel from "@/components/workspace/CodePanel";
import TodoPanel, { type TodoItem } from "@/components/workspace/TodoPanel";
import PreviewPanel from "@/components/workspace/PreviewPanel";
import { Button } from "@/components/ui/button";
import { Code2, ListTodo, Eye, MessageSquare } from "lucide-react";

interface ToolCallData {
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: string | ToolCallData[] | null;
  isStreaming?: boolean;
  streamingToolCalls?: { name: string; args: Record<string, unknown> }[];
}

interface CodeBlock {
  language: string;
  filename?: string;
  content: string;
}

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
}

// Extract code blocks from assistant messages
function extractCodeBlocks(messages: Message[]): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeRegex = /```(\w+)?(?::([^\n]+))?\n([\s\S]*?)```/g;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    let match;
    while ((match = codeRegex.exec(msg.content)) !== null) {
      blocks.push({
        language: match[1] || "text",
        filename: match[2] || undefined,
        content: match[3].trim(),
      });
    }
  }
  return blocks;
}

// Extract todo items from assistant messages
function extractTodos(messages: Message[]): TodoItem[] {
  const todos: TodoItem[] = [];
  let idCounter = 0;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    // Match lines like: - [ ] task, - [x] task, 1. task, ✅ task
    const lines = msg.content.split("\n");
    for (const line of lines) {
      const pendingMatch = line.match(/^[-*]\s+\[\s\]\s+(.+)$/);
      const doneMatch = line.match(/^[-*]\s+\[x\]\s+(.+)$/i);
      const inProgressMatch = line.match(/^[-*]\s+\[~\]\s+(.+)$/i);
      const numberedMatch = line.match(/^\d+\.\s+(?:\*\*)?(.+?)(?:\*\*)?$/);

      if (pendingMatch) {
        todos.push({ id: `todo-${idCounter++}`, title: pendingMatch[1].trim(), status: "pending" });
      } else if (doneMatch) {
        todos.push({ id: `todo-${idCounter++}`, title: doneMatch[1].trim(), status: "done" });
      } else if (inProgressMatch) {
        todos.push({ id: `todo-${idCounter++}`, title: inProgressMatch[1].trim(), status: "in-progress" });
      } else if (numberedMatch && todos.length === 0) {
        // Only add numbered lists if no checkbox todos found yet
        todos.push({ id: `todo-${idCounter++}`, title: numberedMatch[1].trim(), status: "pending" });
      }
    }
  }

  return todos;
}

const panelTabs = [
  { id: "chat" as PanelView, label: "Chat", icon: MessageSquare },
  { id: "code" as PanelView, label: "Code", icon: Code2 },
  { id: "todo" as PanelView, label: "Tasks", icon: ListTodo },
  { id: "preview" as PanelView, label: "Preview", icon: Eye },
];

export default function ChatInterface({
  conversationId: initialConversationId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [activePanel, setActivePanel] = useState<PanelView>("chat");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();

  const sendMessage = useCallback(
    async (content: string, model: AIModel) => {
      if (isLoading) return;

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId: currentConversationId,
            model: model.id,
            provider: model.provider,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        if (!response.body) throw new Error("No response body");

        const assistantMessageId = `streaming-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            isStreaming: true,
            streamingToolCalls: [],
          },
        ]);
        setIsLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let newConversationId = currentConversationId;
        const activeToolCalls: ToolCallData[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const chunk = JSON.parse(jsonStr);

              if (chunk.type === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk.content }
                      : m
                  )
                );
              } else if (chunk.type === "tool_call") {
                const newTc = { name: chunk.toolName, args: chunk.toolArgs };
                activeToolCalls.push({ ...newTc });
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          streamingToolCalls: [
                            ...(m.streamingToolCalls || []),
                            newTc,
                          ],
                        }
                      : m
                  )
                );
              } else if (chunk.type === "tool_result") {
                const tc = activeToolCalls.find(
                  (t) => t.name === chunk.toolName && !t.result
                );
                if (tc) tc.result = chunk.toolResult;
              } else if (chunk.type === "done") {
                newConversationId = chunk.conversationId;
                setCurrentConversationId(chunk.conversationId);
                if (chunk.previewUrl) setPreviewUrl(chunk.previewUrl);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          isStreaming: false,
                          streamingToolCalls: undefined,
                          toolCalls: activeToolCalls.length > 0 ? activeToolCalls : null,
                        }
                      : m
                  )
                );

                if (!initialConversationId && newConversationId) {
                  router.push(`/chat/${newConversationId}`);
                }
              } else if (chunk.type === "error") {
                throw new Error(chunk.error);
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }
      } catch (error) {
        setIsLoading(false);
        setMessages((prev) => prev.filter((m) => !m.isStreaming));

        const errorMsg = error instanceof Error ? error.message : "An error occurred";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [isLoading, currentConversationId, initialConversationId, router]
  );

  const codeBlocks = extractCodeBlocks(messages);
  const todos = extractTodos(messages);

  return (
    <div className="flex flex-col h-full">
      {/* In-panel view tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b bg-muted/20 shrink-0">
        {panelTabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            variant={activePanel === id ? "default" : "ghost"}
            size="sm"
            className={`gap-1.5 px-3 h-8 text-xs font-medium ${
              activePanel === id ? "shadow-sm" : ""
            }`}
            onClick={() => setActivePanel(id)}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
            {id === "code" && codeBlocks.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold">
                {codeBlocks.length}
              </span>
            )}
            {id === "todo" && todos.length > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold">
                {todos.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === "chat" && (
          <div className="flex flex-col h-full">
            <MessageList messages={messages} isLoading={isLoading} />
            <MessageInput
              onSend={sendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
          </div>
        )}
        {activePanel === "code" && <CodePanel codeBlocks={codeBlocks} />}
        {activePanel === "todo" && <TodoPanel todos={todos} />}
        {activePanel === "preview" && (
          <PreviewPanel previewUrl={previewUrl} projectName="Current Project" />
        )}
      </div>
    </div>
  );
}
