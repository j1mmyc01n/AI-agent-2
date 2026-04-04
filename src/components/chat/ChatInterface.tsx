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
import AgentMonitor from "@/components/workspace/AgentMonitor";
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
  projectDescription?: string;
  projectType?: string;
  autoInit?: boolean;
}

type AgentStatus = "idle" | "thinking" | "coding" | "searching" | "deploying" | "saving";
type ChatMode = "chat" | "build" | "saas-upgrade";

// Extract code blocks from assistant messages (including streaming/incomplete blocks)
function extractCodeBlocks(messages: Message[], includePartial = false): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  const codeRegex = /```(\w+)?(?::([^\n]+))?\n([\s\S]*?)```/g;

  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    let match;
    const content = msg.content;
    while ((match = codeRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || "text",
        filename: match[2] || undefined,
        content: match[3].trim(),
      });
    }

    // For streaming messages, also extract in-progress (unclosed) code blocks
    if (includePartial && msg.isStreaming) {
      // Only look for unclosed block if the last ``` count is odd (block still open)
      const fenceCount = (content.match(/```/g) || []).length;
      if (fenceCount % 2 === 1) {
        // Find the LAST opening ``` fence (the unclosed one)
        let lastFenceIdx = -1;
        let searchFrom = 0;
        let fencesSeen = 0;
        while (true) {
          const idx = content.indexOf("```", searchFrom);
          if (idx === -1) break;
          fencesSeen++;
          // Odd-numbered fences are opening, even are closing
          if (fencesSeen % 2 === 1) {
            lastFenceIdx = idx;
          }
          searchFrom = idx + 3;
        }
        if (lastFenceIdx >= 0) {
          const afterFence = content.slice(lastFenceIdx + 3);
          const langMatch = afterFence.match(/^(\w+)?(?::([^\n]+))?\n([\s\S]+)$/);
          if (langMatch) {
            const partialContent = langMatch[3].trim();
            if (partialContent.length > 0) {
              blocks.push({
                language: langMatch[1] || "text",
                filename: langMatch[2] ? `${langMatch[2]} (generating...)` : "(generating...)",
                content: partialContent,
              });
            }
          }
        }
      }
    }
  }

  // Deduplicate named files: keep the last occurrence of each filename across all messages.
  // This prevents files from appearing multiple times when the agent is nudged and re-generates
  // the same files in a subsequent message.
  const normalizeFilename = (name: string) =>
    name.replace(/\s*\(generating\.\.\.\)\s*/i, "").toLowerCase().trim();

  const namedLastIdx = new Map<string, number>();
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].filename) {
      namedLastIdx.set(normalizeFilename(blocks[i].filename!), i);
    }
  }
  return blocks.filter((block, i) => {
    if (!block.filename) return true; // keep unnamed blocks as-is
    return namedLastIdx.get(normalizeFilename(block.filename)) === i;
  });
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
    /\b(build|create|make|generate|develop|code|implement|design|write|scaffold|setup|set up|prototype|wireframe|mock|sketch)\b.*\b(app|application|website|site|page|landing|dashboard|project|saas|mvp|tool|platform|component|form|feature|ui|interface|layout|template|widget|module|screen|view|panel)\b/i,
    /\b(app|application|website|site|page|landing|dashboard|project|saas|mvp|tool|platform|component|form|feature|ui|interface)\b.*\b(build|create|make|generate|develop|code|implement|design|write|for me)\b/i,
    /^(build|create|make|generate|develop|code|write|design|scaffold) (me |a |an |the |my |this )/i,
    /\bstart (building|coding|creating|developing|writing|making)\b/i,
    /\blet'?s (build|create|make|code|develop|write|design|start)\b/i,
    /\bi (want|need|would like) (a |an |to build |to create |to make |to code |to develop |you to )/i,
    /\b(give me|show me|can you) (a |an |the )?(code|html|css|javascript|react|next|vue|angular|page|app|website|component|dashboard)/i,
    /\b(add|put|include|insert) (a |an |the )?(button|form|table|chart|sidebar|navbar|header|footer|modal|menu|card|grid|section|hero)/i,
    /\bwrite (the |some |me )?(code|html|css|javascript|js|typescript|ts|react|component)/i,
    /\b(html|css|javascript|react|next\.?js|vue|angular|svelte)\b.*\b(code|file|page|component)\b/i,
    /\bcode (this|that|it|the|a |an )/i,
    /\b(todo|task|project|inventory|crm|blog|portfolio|ecommerce|e-commerce|store|shop|calculator|tracker|timer|calendar|chat|messenger|social|forum|wiki|admin)\s*(app|panel|page|board|manager|tracker|system|platform)?\b/i,
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

// Detect if a prompt is too vague for a quality build (short, generic, lacks specifics)
function isVaguePrompt(message: string): boolean {
  const trimmed = message.trim();
  const wordCount = trimmed.split(/\s+/).length;

  // Short messages (under 8 words) with build intent are often vague
  if (wordCount < 8) return true;

  // Check if the prompt has specific details (colors, features, sections, styles, tech)
  const specificityIndicators = [
    /\b(dark|light|gradient|neon|minimal|modern|retro|glassmorphism|neumorphism)\b/i,
    /\b(sidebar|navbar|footer|hero|modal|card|table|form|chart|grid)\b/i,
    /\b(react|next|vue|angular|tailwind|bootstrap)\b/i,
    /\b(login|signup|register|dashboard|settings|profile|pricing|checkout)\b/i,
    /\b(blue|red|green|purple|orange|#[0-9a-f]{3,6})\b/i,
    /\b(api|database|auth|payment|stripe|firebase)\b/i,
    /\b(like\s+(linear|vercel|stripe|notion|figma|spotify|twitter|airbnb|uber))\b/i,
    /\b(features?:\s|include|with\s+(a\s+)?)\b.*\b(and|,)\b/i,
    /https?:\/\//i,
  ];

  const specificCount = specificityIndicators.filter(r => r.test(trimmed)).length;
  // If they have 2+ specificity markers, it's probably not vague
  if (specificCount >= 2) return false;

  // Medium-length prompts (8-15 words) with no specific details
  if (wordCount <= 15 && specificCount === 0) return true;

  return false;
}

// Generate clarifying questions based on what the user wants to build
function getClarifyingQuestions(message: string): { intro: string; questions: { id: string; text: string; options?: string[] }[] } {
  const lower = message.toLowerCase();

  const questions: { id: string; text: string; options?: string[] }[] = [];

  // Visual style question
  questions.push({
    id: "style",
    text: "What visual style are you going for?",
    options: ["Dark & modern (Linear/Vercel style)", "Clean & minimal", "Bold & colorful", "Professional & corporate", "Playful & creative"],
  });

  // Key features/pages
  if (/dashboard|app|saas|platform|tool/i.test(lower)) {
    questions.push({
      id: "pages",
      text: "Which key pages/sections do you need?",
      options: ["Dashboard + Analytics", "User auth (login/register)", "Settings/Profile", "Pricing page", "Landing page"],
    });
  } else if (/landing|page|site|website/i.test(lower)) {
    questions.push({
      id: "sections",
      text: "What sections should the landing page include?",
      options: ["Hero + CTA", "Features grid", "Pricing table", "Testimonials", "FAQ accordion"],
    });
  } else {
    questions.push({
      id: "features",
      text: "What are the 2-3 most important features?",
    });
  }

  // Reference/inspiration
  questions.push({
    id: "reference",
    text: "Any website or app you'd like it to look similar to? (paste a link or name)",
  });

  return {
    intro: "A few quick questions to build something great:",
    questions,
  };
}

export default function ChatInterface({
  conversationId: initialConversationId,
  initialMessages = [],
  projectId,
  projectName,
  projectDescription,
  projectType,
  autoInit = false,
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
  const [toolCallCount, setToolCallCount] = useState(0);
  const [clarifyingFlow, setClarifyingFlow] = useState<{
    originalPrompt: string;
    questions: { id: string; text: string; options?: string[] }[];
    intro: string;
    answers: Record<string, string>;
    currentIdx: number;
  } | null>(null);
  const streamingContentRef = useRef("");
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Shared label map used both for display and in the init prompt
  const PROJECT_TYPE_LABELS: Record<string, string> = {
    saas: "SaaS",
    mvp: "MVP",
    "landing-page": "Landing Page",
    api: "API",
    tool: "Tool",
    other: "Project",
  };

  // Required features per project type, aligned with BUILD_MODE_INSTRUCTIONS
  const PROJECT_TYPE_FEATURES: Record<string, string> = {
    saas:
      "- User authentication UI (login/register modals, hash-routed)\n" +
      "- Dashboard with analytics stats cards, recent activity feed, and data table\n" +
      "- Pricing section with tiered plans (Free / Pro / Enterprise)\n" +
      "- Settings page with profile, billing, and notifications tabs\n" +
      "- Collapsible sidebar navigation with active state highlighting",
    mvp:
      "- Clean onboarding / welcome screen with setup steps\n" +
      "- Core feature interface with functional UI controls\n" +
      "- Stats overview section with key metrics cards\n" +
      "- Simple profile and settings panel\n" +
      "- Mobile-responsive layout throughout",
    "landing-page":
      "- Hero section with bold headline, subheadline, and primary CTA button\n" +
      "- Features section with 3-6 icon-backed feature cards\n" +
      "- Social proof / testimonials carousel or grid\n" +
      "- Pricing table with 2-3 comparison tiers\n" +
      "- FAQ accordion and newsletter signup footer",
    api:
      "- Interactive API explorer / request builder UI\n" +
      "- Endpoint reference with request/response code examples\n" +
      "- Authentication guide with token display\n" +
      "- Multi-language code snippet tabs\n" +
      "- Rate limit status indicator and usage meter",
    tool:
      "- Clean single-page tool interface with clear input controls\n" +
      "- Real-time output / preview panel\n" +
      "- Copy-to-clipboard and download result actions\n" +
      "- Usage guide and example inputs\n" +
      "- Mobile-responsive layout",
    other:
      "- Landing page with clear value proposition and CTA\n" +
      "- Core feature interface\n" +
      "- Clean navigation and responsive layout",
  };

  // Required file structure hint for the init prompt (8-file architecture)
  const BUILD_FILE_STRUCTURE =
    "```html:index.html\n```css:src/css/styles.css\n```css:src/css/components.css\n" +
    "```javascript:src/js/config.js\n```javascript:src/js/state.js\n```javascript:src/js/router.js\n" +
    "```javascript:src/js/components.js\n```javascript:src/js/app.js";

  // Build the initialization prompt for a new project — type-aware, aligned with BUILD_MODE_INSTRUCTIONS
  function buildProjectInitPrompt(name: string, type?: string, description?: string): string {
    const typeLabel = PROJECT_TYPE_LABELS[type ?? ""] ?? "SaaS";
    const descPart = description ? `\n\nProject Description: ${description}` : "";
    const features = PROJECT_TYPE_FEATURES[type ?? "other"] ?? PROJECT_TYPE_FEATURES.other;

    return (
      `Build my ${typeLabel} project "${name}" as a complete, production-quality web application.${descPart}\n\n` +
      `Generate ALL 8 files in the required multi-file folder structure:\n${BUILD_FILE_STRUCTURE}\n\n` +
      `File responsibilities:\n` +
      `- index.html: Full HTML shell with semantic structure, meta tags, and all script/link tags\n` +
      `- src/css/styles.css: CSS custom properties (--color-*, --radius, --shadow), resets, typography, layout utilities, animations\n` +
      `- src/css/components.css: Component-specific styles (cards, modals, buttons, forms, sidebar, navbar, toast)\n` +
      `- src/js/config.js: APP_CONFIG object with theme colors, feature flags, API endpoints, and localStorage keys\n` +
      `- src/js/state.js: Centralized state store with subscribe/dispatch pattern, localStorage persistence, and typed actions\n` +
      `- src/js/router.js: Hash-based SPA router with route guards, transitions, and breadcrumb support\n` +
      `- src/js/components.js: Reusable UI component factory functions (Modal, Toast, Dropdown, DataTable, Chart, etc.)\n` +
      `- src/js/app.js: App bootstrap — imports modules, wires event listeners, initializes router, renders initial view\n\n` +
      `Required features for this ${typeLabel}:\n${features}\n\n` +
      `Architecture requirements:\n` +
      `- All state changes go through state.js dispatch; no direct DOM mutation for data\n` +
      `- Router handles all view transitions; each route renders a complete view\n` +
      `- Components are pure factory functions that return DOM elements\n` +
      `- Full localStorage persistence for user preferences and session data\n` +
      `- Proper error boundaries with user-friendly error states\n` +
      `- Loading skeletons for async operations\n` +
      `- Keyboard navigation (Escape to close modals, arrow keys for lists)\n` +
      `- Responsive layout with mobile-first breakpoints\n\n` +
      `Use the dark premium color system (--color-surface, --color-accent tokens), Tailwind CDN for utility classes, ` +
      `and function declarations throughout. Make it fully functional with working navigation, forms, and interactions. ` +
      `After generating all files, call save_artifact with the full folder paths and create_project_record with type="${type ?? "saas"}".`
    );
  }

  // Parse file-level progress from streaming content — returns each named code block and whether it is complete
  function parseFileProgress(content: string): Array<{ filename: string; done: boolean }> {
    const files: Array<{ filename: string; done: boolean }> = [];
    const openFenceRe = /```[a-z]+:([^\n`]+)\n/gi;
    let match: RegExpExecArray | null;
    while ((match = openFenceRe.exec(content)) !== null) {
      const raw = match[1].trim().replace(/\s*\(generating\.\.\.\)\s*/i, "").trim();
      if (!raw) continue;
      const afterOpen = content.slice(match.index + match[0].length);
      const closingFence = /^`{3,}\s*$/m;
      const done = closingFence.test(afterOpen);
      files.push({ filename: raw, done });
    }
    // Deduplicate by filename, keeping last occurrence
    const seen = new Map<string, { filename: string; done: boolean }>();
    for (const f of files) seen.set(f.filename, f);
    return [...seen.values()];
  }

  // Auto-initialize new projects: when autoInit=true and no messages, kick off a build
  const autoInitSentRef = useRef(false);
  useEffect(() => {
    if (!autoInit || !projectName || !defaultModelLoaded) return;
    if (initialMessages.length > 0 || autoInitSentRef.current) return;
    autoInitSentRef.current = true;

    const initPrompt = buildProjectInitPrompt(projectName, projectType, projectDescription);
    sendMessageToAgent(initPrompt, selectedModel, false, true);
  // Intentionally omit sendMessageToAgent and selectedModel from deps — the ref guard
  // prevents duplicate sends and we only want this to fire once when the model loads.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInit, defaultModelLoaded, projectName, projectType, projectDescription]);

  // Extract code blocks and todos from messages (include partial for streaming)
  const isStreaming = messages.some(m => m.isStreaming);
  const codeBlocks = extractCodeBlocks(messages, true);
  const chatTodos = extractTodos(messages);
  // Merge: agent-generated activity todos + workflow parsed todos + chat-extracted todos
  const todos = agentTodos.length > 0 ? agentTodos : workflowTodos.length > 0 ? workflowTodos : chatTodos;
  const hasPreviewableCode = codeBlocks.some(
    (b) =>
      b.language === "html" ||
      b.language === "css" ||
      b.language === "javascript" ||
      b.language === "js" ||
      b.language === "jsx" ||
      b.language === "tsx" ||
      b.language === "typescript" ||
      b.language === "ts"
  );
  const prevCodeCount = useRef(0);
  const wasStreaming = useRef(false);
  const userHasManuallySelectedPanel = useRef(false);

  // Track when user manually clicks a tab - respect their choice
  const handlePanelChange = useCallback((panel: PanelView) => {
    userHasManuallySelectedPanel.current = true;
    setActivePanel(panel);
  }, []);

  // Auto-switch panels on first code appearance, and respect user's manual selections
  useEffect(() => {
    if (userHasManuallySelectedPanel.current) return;
    if (codeBlocks.length > 0 && prevCodeCount.current === 0) {
      prevCodeCount.current = codeBlocks.length;
      if (chatMode === "build" || chatMode === "saas-upgrade") {
        // During an active build, show the code tab so the user can watch generation in real-time
        setActivePanel("code");
      } else if (initialMessages.length > 0) {
        // Loading an existing project — jump straight to the preview
        setActivePanel("preview");
      }
    } else {
      prevCodeCount.current = codeBlocks.length;
    }
  }, [codeBlocks.length, chatMode, initialMessages.length]);

  // After streaming finishes in build mode, auto-switch to the preview tab so the user
  // sees the rendered result without having to click the tab manually.
  useEffect(() => {
    const justFinished = wasStreaming.current && !isStreaming;
    wasStreaming.current = isStreaming;
    if (
      justFinished &&
      hasPreviewableCode &&
      !userHasManuallySelectedPanel.current &&
      (chatMode === "build" || chatMode === "saas-upgrade")
    ) {
      setActivePanel("preview");
    }
  }, [isStreaming, hasPreviewableCode, chatMode]);

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
        // Parse file-level progress from streaming content
        if (content) {
          const fileProgress = parseFileProgress(content);
          if (fileProgress.length > 0) {
            // Build pre-tasks (research/planning/search) marked done
            const preTasks = tasks
              .filter(t =>
                t.title.includes("Researching") ||
                t.title.includes("Planning") ||
                t.title.includes("Searching")
              )
              .map(t => ({ ...t, status: "done" as const }));
            // Post-tasks (polish/saving) stay pending
            const postTasks = tasks.filter(
              t => t.title.includes("Adding polish") || t.title.includes("Saving")
            );
            // Per-file tasks: all done except the last one in-progress
            const fileTasks: TodoItem[] = fileProgress.map((f, i) => ({
              // Normalize to avoid consecutive/leading/trailing hyphens (e.g. src/js/app.js → src-js-app-js)
              id: `file-${f.filename.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "")}`,
              title: f.filename,
              status: (f.done || i < fileProgress.length - 1 ? "done" : "in-progress") as "done" | "in-progress",
            }));
            return [...preTasks, ...fileTasks, ...postTasks];
          }
        }
        // Fall back to generic coding behavior (no filenames parsed yet)
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

  const sendMessageToAgent = useCallback(
    async (content: string, model: AIModel, shouldUpgrade: boolean, shouldBuild: boolean) => {
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
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
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
                const fenceCount = (streamingContentRef.current.match(/```/g) || []).length;
                const isInsideCodeBlock = fenceCount % 2 === 1;
                setAgentStatus(isInsideCodeBlock ? "coding" : "thinking");

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk.content }
                      : m
                  )
                );

                if (shouldBuild && isInsideCodeBlock && fenceCount === 1 && !userHasManuallySelectedPanel.current) {
                  // Switch to preview so the user sees the live rendering as code streams in
                  setActivePanel("preview");
                }

                if (shouldBuild) {
                  parseWorkflowTasks(streamingContentRef.current);
                  updateAgentTasks(isInsideCodeBlock ? "coding" : "thinking", undefined, streamingContentRef.current);
                }
              } else if (chunk.type === "tool_call") {
                const newTc = { name: chunk.toolName, args: chunk.toolArgs };
                activeToolCalls.push({ ...newTc });
                setToolCallCount(prev => prev + 1);

                const status = getAgentStatusFromToolCalls([newTc]);
                setAgentStatus(status);

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

                if (shouldBuild) {
                  parseWorkflowTasks(streamingContentRef.current);
                }

                // Save first complete HTML block as project preview thumbnail.
                // Limit to MAX_PREVIEW_HTML_BYTES to stay well within localStorage quota
                // (browsers typically allow 5-10MB total, we cap at ~60KB per project preview).
                const MAX_PREVIEW_HTML_BYTES = 60_000;
                if (shouldBuild && projectId) {
                  try {
                    const htmlMatch = streamingContentRef.current.match(
                      /```html(?::[^\n]*)?\n([\s\S]*?)\n```/
                    );
                    if (htmlMatch) {
                      localStorage.setItem(
                        `project-preview-${projectId}`,
                        htmlMatch[1].slice(0, MAX_PREVIEW_HTML_BYTES)
                      );
                      window.dispatchEvent(
                        new CustomEvent("dobetter-project-preview-updated", {
                          detail: { projectId },
                        })
                      );
                    }
                  } catch {
                    // localStorage not available — ignore
                  }
                }

                // Reset manual panel tracking for next message
                userHasManuallySelectedPanel.current = false;

                // Auto-save a project record when the AI built code but didn't call
                // create_project_record (e.g. token-limit was hit, or chat-mode build).
                // Only applies when we're NOT already inside a project page.
                if (shouldBuild && !projectId) {
                  const projectAlreadySaved = activeToolCalls.some(
                    (tc) => tc.name === "create_project_record"
                  );
                  const hasCodeOutput = streamingContentRef.current.includes("```");
                  if (!projectAlreadySaved && hasCodeOutput) {
                    const rawName = content.trim().replace(/[.!?]+$/, "");
                    const projectName = rawName.length > 60 ? rawName.slice(0, 60).trim() + "…" : rawName || "My Project";
                    fetch("/api/projects", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ name: projectName, type: "saas" }),
                    })
                      .then(() => window.dispatchEvent(new Event("dobetter-projects-updated")))
                      .catch(() => {/* fire-and-forget; sidebar refreshes on next visit */});
                  }
                }

                window.dispatchEvent(new Event("dobetter-projects-updated"));
                window.dispatchEvent(new Event("dobetter-conversations-updated"));

                if (!initialConversationId && !projectId && newConversationId) {
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

        // Stream closed — ensure any message still flagged as streaming is finalized.
        // This handles the case where the connection drops or the server closes the
        // stream without sending a "done" event, which would otherwise leave the
        // "(generating...)" file permanently stuck in the sidebar and the preview
        // frozen in "BUILDING" mode.
        setMessages((prev) =>
          prev.map((m) =>
            m.isStreaming ? { ...m, isStreaming: false, streamingToolCalls: undefined } : m
          )
        );
        setAgentStatus("idle");
        setIsLoading(false);

        // Same auto-save fallback for streams that close without a "done" event
        if (shouldBuild && !projectId) {
          const projectAlreadySaved = activeToolCalls.some(
            (tc) => tc.name === "create_project_record"
          );
          const hasCodeOutput = streamingContentRef.current.includes("```");
          if (!projectAlreadySaved && hasCodeOutput) {
            const rawName = content.trim().replace(/[.!?]+$/, "");
            const projectName = rawName.length > 60 ? rawName.slice(0, 60).trim() + "…" : rawName || "My Project";
            fetch("/api/projects", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: projectName, type: "saas" }),
            })
              .then(() => window.dispatchEvent(new Event("dobetter-projects-updated")))
              .catch(() => {});
          }
        }

        // Refresh sidebar in case the agent created/modified projects before the stream ended
        window.dispatchEvent(new Event("dobetter-projects-updated"));
        window.dispatchEvent(new Event("dobetter-conversations-updated"));
      } catch (error) {
        abortControllerRef.current = null;
        setIsLoading(false);
        setAgentStatus("idle");

        // If user aborted, keep streaming content and don't show error
        if (error instanceof DOMException && error.name === "AbortError") {
          setMessages((prev) =>
            prev.map((m) =>
              m.isStreaming
                ? { ...m, isStreaming: false, streamingToolCalls: undefined }
                : m
            )
          );
          // Still refresh sidebar — agent may have saved a project before the abort
          window.dispatchEvent(new Event("dobetter-projects-updated"));
          window.dispatchEvent(new Event("dobetter-conversations-updated"));
          return;
        }

        setMessages((prev) => prev.filter((m) => !m.isStreaming));

        if (chatMode === "build") {
          setAgentTodos([]);
        }

        const errorMsg = error instanceof Error ? error.message : "An error occurred";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        // Refresh sidebar — agent may have saved a project before the error occurred
        window.dispatchEvent(new Event("dobetter-projects-updated"));
        window.dispatchEvent(new Event("dobetter-conversations-updated"));
      }
    },
    [isLoading, currentConversationId, initialConversationId, projectId, messages, chatMode, parseWorkflowTasks, updateAgentTasks]
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setAgentStatus("idle");
    // Finalize any streaming message
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming
          ? { ...m, isStreaming: false, streamingToolCalls: undefined }
          : m
      )
    );
    if (chatMode === "build" || chatMode === "saas-upgrade") {
      updateAgentTasks("idle");
    }
    userHasManuallySelectedPanel.current = false;
  }, [chatMode, updateAgentTasks]);

  const sendMessage = useCallback(
    async (content: string, model: AIModel) => {
      if (isLoading) return;

      // Detect if this should trigger build mode or saas upgrade
      const shouldUpgrade = isSaasUpgradeRequest(content);
      const shouldBuild = shouldUpgrade || chatMode === "build" || chatMode === "saas-upgrade" || isBuildRequest(content);

      // If it's a build request with a vague prompt and no clarifying flow active, ask questions first
      if (shouldBuild && !clarifyingFlow && isVaguePrompt(content) && messages.length === 0) {
        const { intro, questions } = getClarifyingQuestions(content);
        setClarifyingFlow({
          originalPrompt: content,
          questions,
          intro,
          answers: {},
          currentIdx: 0,
        });
        // Show the user's message in chat
        setMessages((prev) => [...prev, { role: "user", content }]);
        // Show clarifying questions as assistant message
        const questionText = `${intro}\n\n${questions.map((q, i) => `**${i + 1}. ${q.text}**${q.options ? "\n" + q.options.map(o => `  - ${o}`).join("\n") : ""}`).join("\n\n")}\n\nJust reply with your preferences, or say **"skip"** to build right away!`;
        setMessages((prev) => [...prev, { role: "assistant", content: questionText }]);
        return;
      }

      // If clarifying flow is active, collect the answer and either continue or build
      if (clarifyingFlow) {
        const isSkip = /^skip$/i.test(content.trim());
        if (isSkip) {
          // Build with original prompt as-is
          const buildPrompt = clarifyingFlow.originalPrompt;
          setClarifyingFlow(null);
          // Remove the clarifying messages and re-send
          setMessages((prev) => prev.filter((m) => m.role === "user" && m.content === clarifyingFlow!.originalPrompt ? true : false).slice(0, 1));
          // Fall through to normal send with original prompt
          return sendMessageToAgent(buildPrompt, model, shouldUpgrade, shouldBuild);
        }

        // Combine original prompt with all clarifying answers into an enhanced prompt
        const enhancedParts = [clarifyingFlow.originalPrompt];
        // Add all previous answers
        Object.entries(clarifyingFlow.answers).forEach(([, v]) => {
          if (v.trim()) enhancedParts.push(v.trim());
        });
        // Add current answer
        enhancedParts.push(content.trim());

        const enhancedPrompt = enhancedParts.join(". ") + ".";
        setClarifyingFlow(null);

        // Show user's answer in chat
        setMessages((prev) => [...prev, { role: "user", content }]);

        return sendMessageToAgent(enhancedPrompt, model, shouldUpgrade, true);
      }

      return sendMessageToAgent(content, model, shouldUpgrade, shouldBuild);
    },
    [isLoading, chatMode, messages.length, clarifyingFlow, sendMessageToAgent]
  );

  const handleQuickPrompt = useCallback((prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt, selectedModel);
  }, [isLoading, sendMessage, selectedModel]);

  const panelTabs = [
    { id: "chat" as PanelView, label: "Chat", icon: MessageSquare, count: messages.filter(m => m.role !== "system").length },
    { id: "code" as PanelView, label: "Code", icon: Code2, count: codeBlocks.length, pulsing: isStreaming && agentStatus === "coding" },
    { id: "todo" as PanelView, label: "Tasks", icon: ListTodo, count: todos.length },
    { id: "preview" as PanelView, label: "Preview", icon: Eye, count: previewUrl ? 1 : hasPreviewableCode ? 1 : 0, pulsing: isStreaming && hasPreviewableCode },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Agent status bar + panel tabs */}
      <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 border-b bg-card/50 shrink-0">
        {/* Panel tabs */}
        <div className="flex items-center gap-0.5 overflow-x-auto">
          {panelTabs.map(({ id, label, icon: Icon, count, pulsing }) => (
            <Button
              key={id}
              variant={activePanel === id ? "default" : "ghost"}
              size="sm"
              className={`gap-1 sm:gap-1.5 px-2 sm:px-3 h-8 text-xs font-medium shrink-0 ${
                activePanel === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => handlePanelChange(id)}
            >
              <Icon className={`h-3.5 w-3.5 ${pulsing ? "animate-pulse text-primary" : ""}`} />
              <span className="hidden sm:inline">{label}</span>
              {(count > 0 || pulsing) && id !== "chat" && (
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  pulsing
                    ? "bg-primary/20 text-primary animate-pulse"
                    : activePanel === id
                    ? "bg-primary-foreground/20"
                    : "bg-primary/15 text-primary"
                }`}>
                  {pulsing && count === 0 ? "..." : count}
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
              <span className="hidden sm:inline">Upgrade</span>
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

      {/* Agent Monitor - oversight system */}
      <AgentMonitor
        isLoading={isLoading}
        agentStatus={agentStatus}
        messageCount={messages.filter(m => m.role !== "system").length}
        codeBlockCount={codeBlocks.length}
        toolCallCount={toolCallCount}
        onNudge={handleQuickPrompt}
        onStop={handleStop}
      />

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
              showSuggestions={messages.length === 0}
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
            <CodePanel codeBlocks={codeBlocks} isGenerating={isStreaming && agentStatus === "coding"} />
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
                isStreaming={isStreaming}
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
