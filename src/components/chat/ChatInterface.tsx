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
type ChatMode = "chat" | "build" | "saas-upgrade";

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
    case "push_code_to_github":
    case "save_artifact": return "saving";
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

// Detect if a message is requesting a SaaS/MVP upgrade
function isSaasUpgradeRequest(message: string): boolean {
  const upgradeKeywords = [
    /\bupgrade\s+(to\s+)?saas\b/i,
    /\bupgrade\s+(to\s+)?mvp\b/i,
    /\bupgrade\s+(to\s+)?(full|proper|production)\b/i,
    /\bconvert\s+(to\s+)?saas\b/i,
    /\bfull\s+(saas|mvp)\s+(version|structure|upgrade)\b/i,
    /\bmulti[- ]?page\s+(version|structure|upgrade)\b/i,
    /\bproduction[- ]?ready\b/i,
    /\bproper\s+file\s+structure\b/i,
  ];
  return upgradeKeywords.some(regex => regex.test(message));
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
  const [agentTodos, setAgentTodos] = useState<TodoItem[]>([]);
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

        if (data.defaultModel && data.defaultProvider) {
          const provider = AI_PROVIDERS.find(p => p.id === data.defaultProvider);
          const model = provider?.models.find(m => m.id === data.defaultModel);
          if (model) {
            setSelectedModel(model);
            setDefaultModelLoaded(true);
            return;
          }
        }

        if (data.hasAnthropicKey) {
          setSelectedModel(AI_PROVIDERS.find(p => p.id === "anthropic")!.models[0]);
        } else if (data.hasOpenaiKey) {
          setSelectedModel(AI_PROVIDERS.find(p => p.id === "openai")!.models[0]);
        }
      } catch {
        // Ignore - use default
      }
      setDefaultModelLoaded(true);
    };
    loadDefaultModel();
  }, [defaultModelLoaded]);

  // Extract code blocks and todos from messages
  const codeBlocks = extractCodeBlocks(messages);
  const chatTodos = extractTodos(messages);
  // Merge: agent-generated activity todos + workflow parsed todos + chat-extracted todos
  const todos = agentTodos.length > 0 ? agentTodos : workflowTodos.length > 0 ? workflowTodos : chatTodos;
  const hasPreviewableCode = codeBlocks.some(
    (b) => b.language === "html" || b.language === "css" || b.language === "javascript" || b.language === "js"
  );
  const prevCodeCount = useRef(0);

  // Auto-switch panels when code appears in build mode
  useEffect(() => {
    if (codeBlocks.length > 0 && codeBlocks.length !== prevCodeCount.current) {
      prevCodeCount.current = codeBlocks.length;
      if (chatMode === "build") {
        if (hasPreviewableCode) {
          setActivePanel("preview");
        } else {
          setActivePanel("code");
        }
      }
    }
  }, [codeBlocks.length, hasPreviewableCode, chatMode]);

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

  // Generate activity-based tasks from agent status changes
  const updateAgentTasks = useCallback((status: AgentStatus, toolName?: string, content?: string) => {
    setAgentTodos(prev => {
      const tasks = [...prev];

      // Auto-generate tasks based on what the agent is doing
      if (status === "thinking" && tasks.length === 0 && content) {
        // First thinking phase - create research-first tasks
        return [
          { id: "agent-1", title: "Researching best practices & design patterns", status: "in-progress" },
          { id: "agent-2", title: "Planning architecture & UX approach", status: "pending" },
          { id: "agent-3", title: "Generating premium code", status: "pending" },
          { id: "agent-4", title: "Adding polish & micro-interactions", status: "pending" },
          { id: "agent-5", title: "Saving project files", status: "pending" },
        ];
      }

      if (status === "searching") {
        // Mark analysis done, add search task
        const updated = tasks.map(t => {
          if (t.id === "agent-1") return { ...t, status: "done" as const };
          return t;
        });
        const hasSearch = updated.some(t => t.title.includes("Searching"));
        if (!hasSearch) {
          const insertIdx = updated.findIndex(t => t.status === "pending");
          if (insertIdx >= 0) {
            updated.splice(insertIdx, 0, { id: `agent-search-${Date.now()}`, title: "Searching the web for context", status: "in-progress" });
          }
        }
        return updated;
      }

      if (status === "coding") {
        return tasks.map(t => {
          if (t.title.includes("Searching")) return { ...t, status: "done" as const };
          if (t.title.includes("Researching")) return { ...t, status: "done" as const };
          if (t.title.includes("Planning")) return { ...t, status: "done" as const };
          if (t.title.includes("Generating")) return { ...t, status: "in-progress" as const };
          return t;
        });
      }

      if (status === "saving") {
        return tasks.map(t => {
          if (t.title.includes("Generating")) return { ...t, status: "done" as const };
          if (t.title.includes("Adding polish")) return { ...t, status: "done" as const };
          if (t.title.includes("Saving")) return { ...t, status: "in-progress" as const };
          return t;
        });
      }

      if (status === "idle") {
        // Complete all tasks
        return tasks.map(t => ({ ...t, status: "done" as const }));
      }

      // When we detect code blocks in streaming content, update code task
      if (content && content.includes("```")) {
        const codeBlockCount = (content.match(/```\w/g) || []).length;
        if (codeBlockCount > 0) {
          return tasks.map(t => {
            if (t.title.includes("Researching")) return { ...t, status: "done" as const };
            if (t.title.includes("Planning")) return { ...t, status: "done" as const };
            if (t.title.includes("Generating")) return { ...t, status: "in-progress" as const, description: `${codeBlockCount} file${codeBlockCount > 1 ? "s" : ""} generated` };
            return t;
          });
        }
      }

      return tasks;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, model: AIModel) => {
      if (isLoading) return;

      // Detect if this should trigger build mode or saas upgrade
      const shouldUpgrade = isSaasUpgradeRequest(content);
      const shouldBuild = shouldUpgrade || chatMode === "build" || chatMode === "saas-upgrade" || isBuildRequest(content);
      if (shouldUpgrade) {
        setChatMode("saas-upgrade");
      } else if (shouldBuild && chatMode !== "build" && chatMode !== "saas-upgrade") {
        setChatMode("build");
      }

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setAgentStatus("thinking");
      streamingContentRef.current = "";
      // Reset agent todos for new messages in build mode
      if (shouldBuild) {
        setAgentTodos([]);
        setWorkflowTodos([]);
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
            mode: shouldUpgrade ? "saas-upgrade" : shouldBuild ? "build" : "chat",
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

        // In build mode, start tracking tasks immediately
        if (shouldBuild) {
          updateAgentTasks("thinking", undefined, content);
        }

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
                  // Update agent tasks based on streaming content
                  updateAgentTasks("thinking", undefined, streamingContentRef.current);
                }
              } else if (chunk.type === "tool_call") {
                const newTc = { name: chunk.toolName, args: chunk.toolArgs };
                activeToolCalls.push({ ...newTc });

                const status = getAgentStatusFromToolCalls([newTc]);
                setAgentStatus(status);

                // Update tasks based on tool calls
                if (shouldBuild) {
                  updateAgentTasks(status, chunk.toolName);
                }

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

                // Complete all agent tasks
                if (shouldBuild) {
                  updateAgentTasks("idle");
                }

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

        // Clear agent tasks on error
        if (chatMode === "build") {
          setAgentTodos([]);
        }

        const errorMsg = error instanceof Error ? error.message : "An error occurred";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [isLoading, currentConversationId, initialConversationId, projectId, messages, chatMode, parseWorkflowTasks, updateAgentTasks]
  );

  const handleQuickPrompt = useCallback((prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt, selectedModel);
  }, [isLoading, sendMessage, selectedModel]);

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
            <button
              onClick={() => setChatMode("saas-upgrade")}
              className={`flex items-center gap-1 px-2 py-1 text-[11px] font-medium transition-colors ${
                chatMode === "saas-upgrade"
                  ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title="SaaS upgrade - convert to full multi-page SaaS structure"
            >
              <Sparkles className="h-3 w-3" />
              <span className="hidden sm:inline">SaaS</span>
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
            <MessageList messages={messages} isLoading={isLoading} agentStatus={agentStatus} onQuickPrompt={handleQuickPrompt} />
            <MessageInput
              onSend={sendMessage}
              isLoading={isLoading}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              placeholder={
                chatMode === "build"
                  ? "Describe what you want to build... (code will appear in Code & Preview tabs)"
                  : "Chat about your project, ask questions, or describe what to build..."
              }
            />
          </div>
        )}
        {activePanel === "code" && (
          <div className="flex flex-col h-full min-h-0">
            <CodePanel codeBlocks={codeBlocks} />
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
              <TodoPanel todos={todos} agentStatus={agentStatus} />
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
