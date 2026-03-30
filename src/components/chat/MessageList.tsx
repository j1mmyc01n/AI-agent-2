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
  onQuickPrompt?: (prompt: string) => void;
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
    case "save_artifact":
      return <Code2 className="h-3 w-3" />;
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
    save_artifact: "Save Files",
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

// Context-aware feature suggestions based on the last assistant message
function getFeatureSuggestions(messages: Message[]): { label: string; prompt: string }[] {
  if (messages.length === 0) return [];
  const lastAssistant = [...messages].reverse().find(m => m.role === "assistant");
  if (!lastAssistant || lastAssistant.isStreaming) return [];
  const content = lastAssistant.content.toLowerCase();

  const suggestions: { label: string; prompt: string }[] = [];

  // Landing page / website - suggest additions
  if (content.includes("landing") || content.includes("hero") || content.includes("pricing")) {
    if (!content.includes("testimonial")) suggestions.push({ label: "Add testimonials section", prompt: "Add a testimonials section with user quotes and star ratings" });
    if (!content.includes("faq")) suggestions.push({ label: "Add FAQ section", prompt: "Add an FAQ accordion section with common questions" });
    if (!content.includes("newsletter") && !content.includes("subscribe")) suggestions.push({ label: "Add newsletter signup", prompt: "Add an email newsletter signup form with validation" });
  }

  // Dashboard - suggest enhancements
  if (content.includes("dashboard") || content.includes("analytics") || content.includes("stat")) {
    if (!content.includes("chart") && !content.includes("graph")) suggestions.push({ label: "Add charts & graphs", prompt: "Add interactive charts and data visualizations to the dashboard" });
    if (!content.includes("notification")) suggestions.push({ label: "Add notifications", prompt: "Add a notification bell with dropdown showing recent alerts" });
    if (!content.includes("dark mode") && !content.includes("theme toggle")) suggestions.push({ label: "Add dark/light toggle", prompt: "Add a dark mode / light mode theme toggle" });
  }

  // E-commerce suggestions
  if (content.includes("product") || content.includes("cart") || content.includes("shop")) {
    if (!content.includes("search")) suggestions.push({ label: "Add search & filters", prompt: "Add a search bar with category filters and sort options" });
    if (!content.includes("review")) suggestions.push({ label: "Add product reviews", prompt: "Add a product reviews section with star ratings and user comments" });
    if (!content.includes("wishlist")) suggestions.push({ label: "Add wishlist feature", prompt: "Add a wishlist/favorites feature with heart icon toggle" });
  }

  // Chat / social suggestions
  if (content.includes("chat") || content.includes("message") || content.includes("conversation")) {
    if (!content.includes("emoji")) suggestions.push({ label: "Add emoji picker", prompt: "Add an emoji picker to the message input" });
    if (!content.includes("file") && !content.includes("upload")) suggestions.push({ label: "Add file sharing", prompt: "Add file/image upload and sharing to the chat" });
  }

  // General suggestions if code was generated
  if (content.includes("```html") || content.includes("```css")) {
    if (!content.includes("animation") && !content.includes("transition")) suggestions.push({ label: "Add animations", prompt: "Add smooth animations and micro-interactions to enhance the UI" });
    if (!content.includes("responsive") && !content.includes("mobile")) suggestions.push({ label: "Improve mobile design", prompt: "Optimize the layout and design for mobile devices" });
    if (!content.includes("accessibility") && !content.includes("aria")) suggestions.push({ label: "Improve accessibility", prompt: "Add proper ARIA labels and keyboard navigation for accessibility" });
  }

  // Return max 3 suggestions
  return suggestions.slice(0, 3);
}

function formatContent(content: string) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLanguage = "";

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeLanguage = line.slice(3).split(":")[0].trim();
      } else {
        inCodeBlock = false;
        // Show a compact reference instead of inline code
        elements.push(
          <div key={`code-ref-${i}`} className="my-1.5 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/5 border border-primary/15 text-[11px] text-primary/80">
            <Code2 className="h-3 w-3" />
            <span>{codeLanguage || "code"} — view in Code tab</span>
          </div>
        );
        codeLanguage = "";
      }
      return;
    }

    if (inCodeBlock) {
      return; // Skip code block content in chat view
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

export default function MessageList({ messages, isLoading, agentStatus = "idle", onQuickPrompt }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const suggestions = !isLoading ? getFeatureSuggestions(messages) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-xl w-full">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-4 glow-primary shadow-premium">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-1">
            <span className="text-gradient">
              What do you want to build?
            </span>
          </h2>
          <p className="text-muted-foreground mb-5 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
            Describe your idea. The agent researches, designs, and codes it — with live preview.
          </p>
          <div className="grid grid-cols-2 gap-2 text-left mb-4">
            {[
              { icon: "🚀", text: "Build a SaaS MVP with live preview", prompt: "Build me a modern SaaS landing page with pricing table, feature grid, and hero section" },
              { icon: "🔍", text: "Research & build from best practices", prompt: "Research the best project management tools and build me a task board like Trello" },
              { icon: "💎", text: "Generate premium UI components", prompt: "Create a beautiful dashboard with analytics cards, charts, and a responsive sidebar" },
              { icon: "💡", text: "Design a complete app from an idea", prompt: "I want to build an AI-powered writing assistant tool with a clean minimal UI" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => onQuickPrompt?.(item.prompt)}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-border/50 bg-card/50 hover:bg-primary/5 hover:border-primary/30 hover:shadow-sm transition-all text-left group cursor-pointer"
              >
                <span className="text-base shrink-0">{item.icon}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{item.text}</span>
              </button>
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

      {/* AI feature suggestions */}
      {suggestions.length > 0 && !isLoading && (
        <div className="flex flex-wrap gap-1.5 px-2 py-1">
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-medium w-full mb-0.5">Suggestions</span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onQuickPrompt?.(s.prompt)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/30 text-xs text-foreground/80 transition-all cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-primary/60" />
              {s.label}
            </button>
          ))}
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
