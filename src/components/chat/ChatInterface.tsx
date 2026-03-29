"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { toast } from "@/components/ui/use-toast";
import { type AIModel, DEFAULT_MODEL, AI_PROVIDERS } from "./ModelSelector";
import { type PanelView } from "@/components/layout/MainLayout";
import CodePanel from "@/components/workspace/CodePanel";
import TodoPanel, { type TodoItem } from "@/components/workspace/TodoPanel";
import PreviewPanel from "@/components/workspace/PreviewPanel";
import { Button } from "@/components/ui/button";
import { Code2, ListTodo, Eye, MessageSquare, Brain, Loader2, Sparkles, Hammer, MessageCircle } from "lucide-react";

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
type ChatMode = "chat" | "build";

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

// Detect if a message looks like a build/project request
function isBuildRequest(message: string): boolean {
  const buildKeywords = [
    /\b(build|create|make|generate|develop|code|implement|design)\b.*\b(app|application|website|site|page|landing|dashboard|project|saas|mvp|tool|platform|component|form|feature)\b/i,
    /\b(app|application|website|site|page|landing|dashboard|project|saas|mvp|tool|platform)\b.*\b(build|create|make|generate|develop|code|implement|design)\b/i,
    /^(build|create|make|generate|develop) (me |a |an |the )/i,
    /\bstart (building|coding|creating|developing)\b/i,
    /\blet'?s (build|create|make|code|develop)\b/i,
    /\bi (want|need) (a |an |to build |to create )/i,
  ];
  return buildKeywords.some(regex => regex.test(message));
}

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
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [workflowTodos, setWorkflowTodos] = useState<TodoItem[]>([]);
  const [defaultModelLoaded, setDefaultModelLoaded] = useState(false);
  const streamingContentRef = useRef("");

  // Load user's default model preference and configured keys
  useEffect(() => {
    if (defaultModelLoaded) return;
    const loadDefaultModel = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (!res.ok) return;
        const data = await res.json();

        // Check for saved default model preference
        if (data.defaultModel && data.defaultProvider) {
          const provider = AI_PROVIDERS.find(p => p.id === data.defaultProvider);
          const model = provider?.models.find(m => m.id === data.defaultModel);
          if (model) {
            setSelectedModel(model);
            setDefaultModelLoaded(true);
            return;
          }
        }

        // Auto-detect: pick the first provider that has a key configured
        if (data.hasAnthropicKey) {
          setSelectedModel(AI_PROVIDERS.find(p => p.id === "anthropic")!.models[0]);
        } else if (data.hasOpenaiKey) {
          setSelectedModel(AI_PROVIDERS.find(p => p.id === "openai")!.models[0]);
        } else if (data.hasGrokKey) {
          setSelectedModel(AI_PROVIDERS.find(p => p.id === "grok")!.models[0]);
        }
        // If none configured, keep default (Anthropic - available via Netlify AI Gateway)
      } catch {
        // Ignore - use default
      }
      setDefaultModelLoaded(true);
    };
    loadDefaultModel();
  }, [defaultModelLoaded]);

  // Auto-switch to code/preview tab when code is generated in build mode
  const codeBlocks = extractCodeBlocks(messages);
  const chatTodos = extractTodos(messages);
  // Merge workflow todos with chat-extracted todos
  const todos = workflowTodos.length > 0 ? workflowTodos : chatTodos;
  const hasPreviewableCode = codeBlocks.some(
    (b) => b.language === "html" || b.language === "css" || b.language === "javascript" || b.language === "js"
  );
  const prevCodeCount = useRef(0);

  useEffect(() => {
    if (codeBlocks.length > 0 && codeBlocks.length !== prevCodeCount.current) {
      prevCodeCount.current = codeBlocks.length;
      if (chatMode === "build") {
        // In build mode, auto-switch to code panel, then preview when previewable
        if (hasPreviewableCode) {
          setActivePanel("preview");
        } else {
          setActivePanel("code");
        }
      }
    }
  }, [codeBlocks.length, hasPreviewableCode, chatMode]);

  // Auto-switch to tasks when they appear in build mode
  useEffect(() => {
    if (chatMode === "build" && todos.length > 0 && activePanel === "chat" && codeBlocks.length === 0) {
      setActivePanel("todo");
    }
  }, [chatMode, todos.length, activePanel, codeBlocks.length]);

  // Parse streaming content for workflow tasks in real-time
  const parseWorkflowTasks = useCallback((content: string) => {
    const lines = content.split("\n");
    const newTodos: TodoItem[] = [];
    let idCounter = 0;

    for (const line of lines) {
      const pendingMatch = line.match(/^[-*]\s+\[\s\]\s+(.+)$/);
      const doneMatch = line.match(/^[-*]\s+\[x\]\s+(.+)$/i);
      const inProgressMatch = line.match(/^[-*]\s+\[~\]\s+(.+)$/i);

      if (pendingMatch) {
        newTodos.push({ id: `wf-${idCounter++}`, title: pendingMatch[1].trim(), status: "pending" });
      } else if (doneMatch) {
        newTodos.push({ id: `wf-${idCounter++}`, title: doneMatch[1].trim(), status: "done" });
      } else if (inProgressMatch) {
        newTodos.push({ id: `wf-${idCounter++}`, title: inProgressMatch[1].trim(), status: "in-progress" });
      }
    }

    if (newTodos.length > 0) {
      setWorkflowTodos(newTodos);
    }
  }, []);

  const sendMessage = useCallback(
    async (content: string, model: AIModel) => {
      if (isLoading) return;

      // Detect if this should trigger build mode
      const shouldBuild = chatMode === "build" || isBuildRequest(content);
      if (shouldBuild && chatMode !== "build") {
        setChatMode("build");
      }

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAgentStatus("thinking");
      streamingContentRef.current = "";

      // In build mode, immediately switch to tasks panel
      if (shouldBuild) {
        setActivePanel("todo");
      }

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
            mode: shouldBuild ? "build" : "chat",
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
                streamingContentRef.current += chunk.content;
                setAgentStatus("thinking");
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk.content }
                      : m
                  )
                );

                // Parse tasks in real-time during build mode
                if (shouldBuild) {
                  parseWorkflowTasks(streamingContentRef.current);
                }

                // Auto-switch to code panel when code blocks start appearing
                if (shouldBuild && chunk.content.includes("```") && activePanel === "todo") {
                  // Check if we now have code blocks
                  const currentContent = streamingContentRef.current;
                  if (currentContent.split("```").length > 2) {
                    setActivePanel("code");
                  }
                }
              } else if (chunk.type === "tool_call") {
                const newTc = { name: chunk.toolName, args: chunk.toolArgs };
                activeToolCalls.push({ ...newTc });

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

                // Final parse of tasks
                if (shouldBuild) {
                  parseWorkflowTasks(streamingContentRef.current);
                }

                // In build mode, switch to preview if we have previewable code
                if (shouldBuild) {
                  const finalBlocks = extractCodeBlocks([...messages, { role: "assistant", content: streamingContentRef.current }]);
                  const hasPreview = finalBlocks.some(
                    b => b.language === "html" || b.language === "css" || b.language === "javascript" || b.language === "js"
                  );
                  if (hasPreview) {
                    setActivePanel("preview");
                  } else if (finalBlocks.length > 0) {
                    setActivePanel("code");
                  }
                }

                // Notify sidebar to refresh
                window.dispatchEvent(new Event("dobetter-projects-updated"));
                window.dispatchEvent(new Event("dobetter-conversations-updated"));

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
    [isLoading, currentConversationId, initialConversationId, projectId, messages, chatMode, activePanel, parseWorkflowTasks]
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

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {/* Chat mode toggle */}
          <div className="flex items-center rounded-md border border-border/50 overflow-hidden">
            <button
              onClick={() => setChatMode("chat")}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors ${
                chatMode === "chat"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Discussion mode - chat about ideas and features"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setChatMode("build")}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors ${
                chatMode === "build"
                  ? "bg-orange-500 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="Build mode - generate code, tasks, and preview"
            >
              <Hammer className="h-3 w-3" />
              <span className="hidden sm:inline">Build</span>
            </button>
          </div>

          {/* Agent status indicator */}
          {agentStatus !== "idle" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium shrink-0">
              {statusLabels[agentStatus].icon}
              <span className="hidden sm:inline">{statusLabels[agentStatus].label}</span>
            </div>
          )}

          {/* Project badge */}
          {projectName && (
            <div className="hidden md:flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs shrink-0">
              <span className="opacity-60">Project:</span>
              <span className="font-medium truncate max-w-[120px]">{projectName}</span>
            </div>
          )}
        </div>
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
              placeholder={
                chatMode === "build"
                  ? "Describe what you want to build... (code will appear in Code & Preview tabs)"
                  : "Chat about your project, ask questions, suggest features..."
              }
            />
          </div>
        )}
        {activePanel === "code" && (
          <div className="flex flex-col h-full min-h-0">
            <CodePanel codeBlocks={codeBlocks} />
            {/* Input at bottom of code panel too for build mode */}
            <MessageInput
              onSend={sendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              placeholder="Request code changes or additions..."
            />
          </div>
        )}
        {activePanel === "todo" && (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              <TodoPanel todos={todos} />
            </div>
            <MessageInput
              onSend={sendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              placeholder="Ask to work on a specific task or add new ones..."
            />
          </div>
        )}
        {activePanel === "preview" && (
          <div className="flex flex-col h-full min-h-0">
            <div className="flex-1 min-h-0 overflow-hidden">
              <PreviewPanel
                previewUrl={previewUrl}
                projectName={projectName || "Current Project"}
                codeBlocks={codeBlocks}
              />
            </div>
            <MessageInput
              onSend={sendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              placeholder="Request visual changes to the preview..."
            />
          </div>
        )}
      </div>
    </div>
  );
}
