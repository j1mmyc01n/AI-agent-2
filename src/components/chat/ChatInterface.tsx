"use client";

import { useState, useCallback, useEffect } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { toast } from "@/components/ui/use-toast";
import { type AIModel, DEFAULT_MODEL } from "./ModelSelector";
import { type PanelView } from "@/components/layout/MainLayout";
import CodePanel from "@/components/workspace/CodePanel";
import TodoPanel, { type TodoItem } from "@/components/workspace/TodoPanel";
import PreviewPanel from "@/components/workspace/PreviewPanel";
import { Button } from "@/components/ui/button";
import { Code2, ListTodo, Eye, MessageSquare, Brain, Loader2, Sparkles } from "lucide-react";

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
  projectId?: string;
  projectName?: string;
}

type AgentStatus = "idle" | "thinking" | "coding" | "searching" | "deploying" | "saving";

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
        todos.push({ id: `todo-${idCounter++}`, title: numberedMatch[1].trim(), status: "pending" });
      }
    }
  }

  return todos;
}

function getAgentStatusFromToolCalls(streamingToolCalls: { name: string; args: Record<string, unknown> }[] | undefined): AgentStatus {
  if (!streamingToolCalls || streamingToolCalls.length === 0) return "thinking";
  const lastTool = streamingToolCalls[streamingToolCalls.length - 1].name;
  switch (lastTool) {
    case "web_search": return "searching";
    case "create_github_repo":
    case "push_code_to_github": return "coding";
    case "create_vercel_project": return "deploying";
    case "create_project_record": return "saving";
    default: return "thinking";
  }
}

const statusLabels: Record<AgentStatus, { label: string; icon: React.ReactNode }> = {
  idle: { label: "", icon: null },
  thinking: { label: "Thinking...", icon: <Brain className="h-3 w-3 animate-pulse" /> },
  coding: { label: "Writing code...", icon: <Code2 className="h-3 w-3 animate-pulse" /> },
  searching: { label: "Searching web...", icon: <Sparkles className="h-3 w-3 animate-pulse" /> },
  deploying: { label: "Deploying...", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  saving: { label: "Saving project...", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
};

export default function ChatInterface({
  conversationId: initialConversationId,
  initialMessages = [],
  projectId,
  projectName,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [selectedModel, setSelectedModel] = useState<AIModel>(DEFAULT_MODEL);
  const [activePanel, setActivePanel] = useState<PanelView>("chat");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");

  // Auto-switch to code tab when code is generated
  const codeBlocks = extractCodeBlocks(messages);
  const todos = extractTodos(messages);
  const hasPreviewableCode = codeBlocks.some(
    (b) => b.language === "html" || b.language === "css" || b.language === "javascript" || b.language === "js"
  );
  const prevCodeCount = useState(0);

  useEffect(() => {
    if (codeBlocks.length > 0 && codeBlocks.length !== prevCodeCount[0]) {
      prevCodeCount[0] = codeBlocks.length;
      // Auto-switch to preview if we have previewable code and user hasn't navigated away
      if (hasPreviewableCode && activePanel === "chat") {
        setActivePanel("preview");
      }
    }
  }, [codeBlocks.length, prevCodeCount, hasPreviewableCode, activePanel]);

  const sendMessage = useCallback(
    async (content: string, model: AIModel) => {
      if (isLoading) return;

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAgentStatus("thinking");

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId: currentConversationId,
            model: model.id,
            provider: model.provider,
            projectId,
            history: messages.filter(m => m.role === "user" || m.role === "assistant").map(m => ({
              role: m.role,
              content: m.content,
            })),
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
                setAgentStatus("thinking");
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

                // Update agent status based on tool being used
                const status = getAgentStatusFromToolCalls([newTc]);
                setAgentStatus(status);

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
                setAgentStatus("idle");
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

                // Notify sidebar to refresh projects and conversations
                window.dispatchEvent(new Event("dobetter-projects-updated"));
                window.dispatchEvent(new Event("dobetter-conversations-updated"));

                // Update URL without remounting the page so messages stay visible
                if (!initialConversationId && newConversationId) {
                  window.history.replaceState(null, "", `/chat/${newConversationId}`);
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
        setAgentStatus("idle");
        setMessages((prev) => prev.filter((m) => !m.isStreaming));

        const errorMsg = error instanceof Error ? error.message : "An error occurred";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [isLoading, currentConversationId, initialConversationId, projectId, messages]
  );

  const panelTabs = [
    { id: "chat" as PanelView, label: "Chat", icon: MessageSquare, count: messages.filter(m => m.role !== "system").length },
    { id: "code" as PanelView, label: "Code", icon: Code2, count: codeBlocks.length },
    { id: "todo" as PanelView, label: "Tasks", icon: ListTodo, count: todos.length },
    { id: "preview" as PanelView, label: "Preview", icon: Eye, count: previewUrl ? 1 : hasPreviewableCode ? 1 : 0 },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Agent status bar + panel tabs */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 border-b bg-card/50 shrink-0">
        {/* Panel tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {panelTabs.map(({ id, label, icon: Icon, count }) => (
            <Button
              key={id}
              variant={activePanel === id ? "default" : "ghost"}
              size="sm"
              className={`gap-1 sm:gap-1.5 px-2 sm:px-3 h-8 text-xs font-medium shrink-0 ${
                activePanel === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActivePanel(id)}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && id !== "chat" && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  activePanel === id
                    ? "bg-primary-foreground/20"
                    : "bg-primary/15 text-primary"
                }`}>
                  {count}
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* Agent status indicator */}
        {agentStatus !== "idle" && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium shrink-0 ml-2">
            {statusLabels[agentStatus].icon}
            <span className="hidden sm:inline">{statusLabels[agentStatus].label}</span>
          </div>
        )}

        {/* Project badge */}
        {projectName && (
          <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs shrink-0 ml-2">
            <span className="opacity-60">Project:</span>
            <span className="font-medium truncate max-w-[120px]">{projectName}</span>
          </div>
        )}
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activePanel === "chat" && (
          <div className="flex flex-col h-full min-h-0">
            <MessageList messages={messages} isLoading={isLoading} agentStatus={agentStatus} />
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
          <PreviewPanel
            previewUrl={previewUrl}
            projectName={projectName || "Current Project"}
            codeBlocks={codeBlocks}
          />
        )}
      </div>
    </div>
  );
}
