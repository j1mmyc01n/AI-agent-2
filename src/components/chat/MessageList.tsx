"use client";

import { useEffect, useRef } from "react";
import { Bot, User, Globe, Github, Zap, Database, Loader2, Brain, Code2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

type AgentStatus = "idle" | "thinking" | "coding" | "searching" | "deploying" | "saving";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
  agentStatus?: AgentStatus;
}

function getToolIcon(toolName: string) {
  switch (toolName) {
    case "web_search":
      return <Globe className="h-3 w-3" />;
    case "create_github_repo":
    case "push_code_to_github":
      return <Github className="h-3 w-3" />;
    case "create_vercel_project":
      return <Zap className="h-3 w-3" />;
    case "create_project_record":
      return <Database className="h-3 w-3" />;
    default:
      return <Zap className="h-3 w-3" />;
  }
}

function getToolLabel(toolName: string) {
  const labels: Record<string, string> = {
    web_search: "Web Search",
    create_github_repo: "Create GitHub Repo",
    push_code_to_github: "Push to GitHub",
    create_vercel_project: "Deploy to Vercel",
    create_project_record: "Save Project",
  };
  return labels[toolName] || toolName;
}

function parseToolCalls(toolCalls: string | ToolCallData[] | null | undefined): ToolCallData[] {
  if (!toolCalls) return [];
  if (Array.isArray(toolCalls)) return toolCalls;
  try {
    return JSON.parse(toolCalls);
  } catch {
    return [];
  }
}

function formatContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.slice(3).trim();
        codeLines = [];
      } else {
        inCodeBlock = false;
        elements.push(
          <div key={`code-${i}`} className="my-3">
            {codeLanguage && (
              <div className="bg-zinc-700 text-zinc-300 text-xs px-3 py-1 rounded-t-md flex items-center gap-1.5">
                <Code2 className="h-3 w-3" />
                {codeLanguage}
              </div>
            )}
            <pre className="bg-zinc-800 text-zinc-100 p-3 rounded-b-md overflow-x-auto text-xs leading-relaxed">
              <code>{codeLines.join("\n")}</code>
            </pre>
          </div>
        );
        codeLines = [];
        codeLanguage = "";
      }
      return;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="font-semibold text-base mt-3 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="font-semibold text-lg mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="font-bold text-xl mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc">
          <InlineFormatted text={line.slice(2)} />
        </li>
      );
    } else if (line.match(/^\d+\. /)) {
      elements.push(
        <li key={i} className="ml-4 list-decimal">
          <InlineFormatted text={line.replace(/^\d+\. /, "")} />
        </li>
      );
    } else if (line === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(
        <p key={i} className="mb-1">
          <InlineFormatted text={line} />
        </p>
      );
    }
  });

  return elements;
}

function InlineFormatted({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={i} className="bg-primary/10 text-primary px-1 py-0.5 rounded text-xs font-mono">
              {part.slice(1, -1)}
            </code>
          );
        } else if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        } else if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={i}>{part.slice(1, -1)}</em>;
        }
        return part;
      })}
    </>
  );
}

export default function MessageList({ messages, isLoading, agentStatus = "idle" }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-lg">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 glow-primary">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-3">
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              DoBetter Viber
            </span>
          </h2>
          <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
            Your AI-powered workspace. Describe what you want to build and the agent will
            help you design, code, and ship it. Ask about the platform itself for help!
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            {[
              { icon: "🚀", text: "Build a SaaS MVP with live preview" },
              { icon: "🔍", text: "Research topics with web search" },
              { icon: "💻", text: "Generate code — view it in the Code tab" },
              { icon: "💡", text: "Ask about DoBetter platform features" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/20 transition-all text-sm cursor-default"
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages
        .filter((m) => m.role !== "system" && m.role !== "tool")
        .map((message, index) => (
          <div
            key={message.id || index}
            className={`flex gap-3 ${
              message.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            {/* Avatar */}
            <div
              className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white shadow-sm ${
                message.role === "user"
                  ? "bg-gradient-to-br from-blue-500 to-blue-700"
                  : "bg-gradient-to-br from-emerald-500 to-emerald-700"
              }`}
            >
              {message.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>

            {/* Message Content */}
            <div
              className={`max-w-[80%] space-y-2 ${
                message.role === "user" ? "items-end" : "items-start"
              } flex flex-col`}
            >
              {/* Tool calls used */}
              {message.role === "assistant" && (() => {
                const toolCalls = parseToolCalls(message.toolCalls);
                return toolCalls.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {toolCalls.map((tc, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs flex items-center gap-1 bg-primary/10 text-primary border-primary/20"
                      >
                        {getToolIcon(tc.name)}
                        {getToolLabel(tc.name)}
                      </Badge>
                    ))}
                  </div>
                ) : null;
              })()}

              {/* Streaming tool calls */}
              {message.isStreaming && message.streamingToolCalls && message.streamingToolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {message.streamingToolCalls.map((tc, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="text-xs flex items-center gap-1 agent-pulse border-primary/30 text-primary"
                    >
                      {getToolIcon(tc.name)}
                      {getToolLabel(tc.name)}...
                    </Badge>
                  ))}
                </div>
              )}

              {/* Message bubble */}
              {message.content && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-tr-sm"
                      : "bg-card border border-border/50 rounded-tl-sm"
                  }`}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  ) : (
                    <div className="prose-sm max-w-none">
                      {formatContent(message.content)}
                    </div>
                  )}
                  {message.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-full" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

      {isLoading && (
        <div className="flex gap-3">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-sm">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="bg-card border border-border/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
            {agentStatus === "thinking" ? (
              <Brain className="h-4 w-4 text-primary animate-pulse" />
            ) : agentStatus === "coding" ? (
              <Code2 className="h-4 w-4 text-primary animate-pulse" />
            ) : agentStatus === "searching" ? (
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            )}
            <span className="text-sm text-muted-foreground">
              {agentStatus === "thinking" && "Thinking..."}
              {agentStatus === "coding" && "Writing code..."}
              {agentStatus === "searching" && "Searching..."}
              {agentStatus === "deploying" && "Deploying..."}
              {agentStatus === "saving" && "Saving..."}
              {agentStatus === "idle" && "Processing..."}
            </span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
