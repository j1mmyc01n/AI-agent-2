"use client";

import { useEffect, useRef } from "react";
import { Bot, User, Globe, Github, Zap, Database, Loader2, Brain, Code2, Sparkles, Layout, ShoppingCart, BarChart3, MessageSquare as ChatIcon, FileText, Music } from "lucide-react";
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

export default function MessageList({ messages, isLoading, agentStatus = "idle", onQuickPrompt }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-xl w-full">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-primary">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-lg sm:text-xl font-bold mb-2">
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              DoBetter Viber
            </span>
          </h2>
          <p className="text-muted-foreground mb-5 text-xs sm:text-sm leading-relaxed">
            Describe what you want to build. The agent will research, design, and code it.
          </p>
          <div className="grid grid-cols-2 gap-2 text-left">
            {[
              { icon: "🚀", text: "Build a SaaS MVP with live preview", prompt: "Build me a modern SaaS landing page with pricing table, feature grid, and hero section" },
              { icon: "🔍", text: "Research & build from best practices", prompt: "Research the best project management tools and build me a task board like Trello" },
              { icon: "💻", text: "Generate premium UI components", prompt: "Create a beautiful dashboard with analytics cards, charts, and a responsive sidebar" },
              { icon: "💡", text: "Design a complete app from an idea", prompt: "I want to build an AI-powered writing assistant tool with a clean minimal UI" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => onQuickPrompt?.(item.prompt)}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-border/50 bg-card hover:bg-primary/5 hover:border-primary/30 transition-all text-left group cursor-pointer"
              >
                <span className="text-sm shrink-0">{item.icon}</span>
                <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight">{item.text}</span>
              </button>
            ))}
          </div>

          {/* Thumbnail Gallery - Visual project templates */}
          <div className="mt-5">
            <p className="text-[11px] text-muted-foreground/70 uppercase tracking-wider font-medium mb-2.5">Or pick a template to start with</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: "SaaS Dashboard",
                  prompt: "Build me a modern SaaS analytics dashboard with a sidebar navigation, stat cards showing revenue/users/growth, a line chart area, recent activity feed, and a clean dark/light theme. Make it look like a real funded startup product.",
                  icon: BarChart3,
                  gradient: "from-blue-500/20 to-cyan-500/20",
                  border: "border-blue-500/20 hover:border-blue-400/40",
                  iconColor: "text-blue-400",
                  preview: ["Stats Cards", "Charts", "Activity Feed"],
                },
                {
                  label: "Landing Page",
                  prompt: "Build me a premium startup landing page with a hero section with gradient text, feature grid with icons, testimonials carousel, pricing table with 3 tiers, FAQ accordion, and a CTA footer. Modern SaaS style like Linear or Vercel.",
                  icon: Layout,
                  gradient: "from-violet-500/20 to-purple-500/20",
                  border: "border-violet-500/20 hover:border-violet-400/40",
                  iconColor: "text-violet-400",
                  preview: ["Hero", "Features", "Pricing"],
                },
                {
                  label: "E-Commerce",
                  prompt: "Build me a modern e-commerce product page with image gallery, size/color selectors, add to cart button, product description tabs, reviews section, and recommended products grid. Style it like a premium fashion brand.",
                  icon: ShoppingCart,
                  gradient: "from-emerald-500/20 to-green-500/20",
                  border: "border-emerald-500/20 hover:border-emerald-400/40",
                  iconColor: "text-emerald-400",
                  preview: ["Products", "Cart", "Checkout"],
                },
                {
                  label: "Chat App",
                  prompt: "Build me a real-time chat application UI with a contacts sidebar, message thread area with sent/received bubbles, typing indicators, message input with emoji picker, and online status indicators. Style it like Discord or Slack.",
                  icon: ChatIcon,
                  gradient: "from-orange-500/20 to-amber-500/20",
                  border: "border-orange-500/20 hover:border-orange-400/40",
                  iconColor: "text-orange-400",
                  preview: ["Contacts", "Messages", "Input"],
                },
                {
                  label: "Blog / CMS",
                  prompt: "Build me a modern blog platform with a featured post hero, post grid with thumbnails and categories, sidebar with tags and newsletter signup, and a clean reading view with typography. Style it like Medium or Substack.",
                  icon: FileText,
                  gradient: "from-pink-500/20 to-rose-500/20",
                  border: "border-pink-500/20 hover:border-rose-400/40",
                  iconColor: "text-pink-400",
                  preview: ["Posts", "Categories", "Reader"],
                },
                {
                  label: "Creative Portfolio",
                  prompt: "Build me a stunning creative portfolio with a full-screen hero with animated text, project showcase grid with hover effects, about section with skills, contact form, and smooth scroll navigation. Make it feel premium and artistic.",
                  icon: Music,
                  gradient: "from-fuchsia-500/20 to-purple-500/20",
                  border: "border-fuchsia-500/20 hover:border-fuchsia-400/40",
                  iconColor: "text-fuchsia-400",
                  preview: ["Hero", "Projects", "Contact"],
                },
              ].map((tmpl, i) => (
                <button
                  key={i}
                  onClick={() => onQuickPrompt?.(tmpl.prompt)}
                  className={`group relative overflow-hidden rounded-lg border ${tmpl.border} bg-gradient-to-br ${tmpl.gradient} p-2.5 text-left transition-all hover:shadow-md hover:shadow-black/5 cursor-pointer`}
                >
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <tmpl.icon className={`h-3.5 w-3.5 ${tmpl.iconColor}`} />
                    <span className="text-[11px] font-semibold text-foreground/90">{tmpl.label}</span>
                  </div>
                  {/* Mini wireframe preview */}
                  <div className="space-y-1">
                    {tmpl.preview.map((section, j) => (
                      <div key={j} className="flex items-center gap-1">
                        <div className={`h-1 rounded-full ${j === 0 ? "w-8" : j === 1 ? "w-6" : "w-5"} bg-foreground/10`} />
                        <span className="text-[9px] text-muted-foreground/50">{section}</span>
                      </div>
                    ))}
                  </div>
                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] duration-700" />
                </button>
              ))}
            </div>
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
