"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  SendHorizonal,
  Wand2,
  Loader2,
  Layout,
  ShoppingCart,
  BarChart3,
  MessageSquare as ChatIcon,
  FileText,
  Music,
  Lightbulb,
  Palette,
  Globe,
} from "lucide-react";
import ModelSelector, { AIModel, DEFAULT_MODEL } from "./ModelSelector";

interface MessageInputProps {
  onSend: (message: string, model: AIModel) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  selectedModel?: AIModel;
  onModelChange?: (model: AIModel) => void;
  showSuggestions?: boolean;
}

const BUILD_IDEAS = [
  {
    label: "SaaS Dashboard",
    prompt:
      "Build a premium SaaS analytics dashboard using DoBetter Design System v2 (light theme: #F4F6FB bg, #FFFFFF sidebar, #5B6EF5 accent, Syne headings + DM Sans body). Sidebar: logo + 'MAIN MENU' label + 5 routes (Dashboard, Projects, Analytics, Team, Settings) + user footer. 4 KPI stat cards with Syne values, trend arrows, sparklines. SVG bar chart. Sortable searchable data table with 10+ realistic rows. Activity feed with avatars and timestamps. State-driven with localStorage persistence, CRUD on projects, toast notifications, loading skeletons. Every route must show unique content-rich pages. No placeholder names — use domain-specific realistic data.",
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20",
  },
  {
    label: "Landing Page",
    prompt:
      "Build a premium SaaS landing page using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent, Syne headlines + DM Sans body). Hero: large Syne headline, 2-line subtext, 2 CTA buttons. 6 feature cards (12px radius, 1px border, hover lift). 3-tier pricing with highlighted Pro plan and feature checklist. Testimonials from 3 named professionals with realistic quotes. Stats bar with 3 impressive metrics. FAQ accordion. Sticky nav. All sections fully populated with domain-specific realistic copy — zero placeholder text.",
    icon: Layout,
    color: "text-violet-400",
    bg: "bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20",
  },
  {
    label: "E-Commerce",
    prompt:
      "Build a premium e-commerce store using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent). Routes: Shop (product grid 12+ items with filters/search), Product Detail (image gallery, variant selectors, add to cart), Cart (items list, totals, checkout), Orders (history table), Account (profile/settings tabs). State-driven cart with CRUD, real-time quantity updates, localStorage persistence. Realistic product catalog: specific names, prices like $49.99, actual descriptions — no 'Product 1' filler. Toast on add/remove. Responsive grid layout.",
    icon: ShoppingCart,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20",
  },
  {
    label: "AI Tool",
    prompt:
      "Build a premium AI writing assistant tool using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent, Syne headings). Routes: Generator (prompt input + output display + tone/length/format controls), History (list of past runs with search/filter, delete), Templates (preset prompt library with categories), Settings (model preferences, API key placeholder). State-driven with localStorage persistence for history (10+ example entries). Copy-to-clipboard, word count badge, character counter, export button. Streaming output simulation with loading pulse animation. No dummy text — realistic AI tool domain copy.",
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20",
  },
  {
    label: "Project Manager",
    prompt:
      "Build a premium project management SaaS using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent). Routes: Board (Kanban with 4 columns: Backlog/In Progress/Review/Done, drag-drop simulation via click), Projects (card grid with progress bars and status badges), Timeline (Gantt-style bar chart), Team (member cards with roles and avatars), Reports (KPI cards + bar chart). State-driven CRUD: add/edit/delete tasks and projects. Each task has title, assignee, priority badge, due date, status. 15+ realistic tasks across projects. No 'Task 1' placeholders — use real project management domain language.",
    icon: FileText,
    color: "text-rose-400",
    bg: "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20",
  },
  {
    label: "Blog / CMS",
    prompt:
      "Build a premium blog/CMS platform using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent, Syne headlines + DM Sans body). Routes: Home (featured hero post + post grid 8+ cards with thumbnails, tags, read-time), Article View (full reading layout with author bio, share buttons, related posts), Editor (rich textarea with toolbar: bold/italic/heading/link/image), Dashboard (post list with status badges: Draft/Published/Scheduled, CRUD actions), Categories (tag manager). State-driven with localStorage. 8+ realistic posts with titles, excerpts, author names, dates, categories. No Lorem ipsum.",
    icon: Globe,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20",
  },
  {
    label: "Booking App",
    prompt:
      "Build a premium booking/scheduling SaaS using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent). Routes: Calendar (monthly/weekly view with booked slots highlighted), Book Now (service selector, date/time picker, client info form, confirmation), Appointments (upcoming/past list with status badges: Confirmed/Pending/Cancelled, cancel/reschedule actions), Services (CRUD: name, duration, price, description), Clients (searchable list with booking history). State-driven with localStorage. 10+ realistic appointments with specific services, client names, dates, times. Domain-specific copy (salon, clinic, or fitness studio).",
    icon: Music,
    color: "text-green-400",
    bg: "bg-green-500/10 hover:bg-green-500/15 border-green-500/20",
  },
  {
    label: "Finance Tracker",
    prompt:
      "Build a premium personal finance tracker using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent, Syne headings). Routes: Overview (net worth card + income/expense KPIs + SVG donut chart + monthly bar chart), Transactions (searchable/filterable table 20+ entries with category badges, amounts, dates, add/delete), Budget (category budget cards with progress bars, set limits modal), Goals (savings goal cards with progress, target dates), Reports (monthly trend line chart, category breakdown). State-driven CRUD, localStorage persistence. Realistic financial data: specific dollar amounts, merchant names, categories — no 'Transaction 1' fillers.",
    icon: Palette,
    color: "text-pink-400",
    bg: "bg-pink-500/10 hover:bg-pink-500/15 border-pink-500/20",
  },
  {
    label: "Social Network",
    prompt:
      "Build a premium social media app using DoBetter Design System v2 (light theme: #F4F6FB bg, #5B6EF5 accent). Routes: Feed (post cards with like/comment/share counts, stories bar at top, create post modal), Explore (trending posts grid + hashtag chips + search), Profile (bio card, stats: posts/followers/following, post grid), Notifications (grouped activity list: likes/comments/follows with timestamps), Messages (conversation list + chat thread view with message bubbles). State-driven with localStorage: like/unlike, post CRUD, follow/unfollow. 12+ realistic posts with specific content, user handles, timestamps. No 'User 1' placeholders.",
    icon: ChatIcon,
    color: "text-orange-400",
    bg: "bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/20",
  },
];

// Split ideas into two rows for alternating scroll
const ROW1_IDEAS = BUILD_IDEAS.filter((_, i) => i < 5);
const ROW2_IDEAS = BUILD_IDEAS.filter((_, i) => i >= 5);
// Duplicate for seamless loop
const ROW1_DOUBLED = [...ROW1_IDEAS, ...ROW1_IDEAS];
const ROW2_DOUBLED = [...ROW2_IDEAS, ...ROW2_IDEAS];

export default function MessageInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Message DoBetter Viber... (Enter to send, Shift+Enter for new line)",
  selectedModel,
  onModelChange,
  showSuggestions = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [internalModel, setInternalModel] = useState<AIModel>(DEFAULT_MODEL);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeModel = selectedModel ?? internalModel;
  const handleModelChange = (model: AIModel) => {
    setInternalModel(model);
    onModelChange?.(model);
  };

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading || disabled) return;
    onSend(trimmed, activeModel);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      const maxH = window.innerHeight < 700 ? 120 : 200;
      el.style.height = Math.min(el.scrollHeight, maxH) + "px";
    }
  };

  const handleIdeaClick = (prompt: string) => {
    if (isLoading || disabled) return;
    onSend(prompt, activeModel);
  };

  const enhancePrompt = async () => {
    const text = message.trim();
    if (!text || isEnhancing || isLoading) return;
    setIsEnhancing(true);
    try {
      const res = await fetch("/api/enhance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.enhanced) {
          setMessage(data.enhanced);
          // Auto-resize textarea
          setTimeout(() => {
            const el = textareaRef.current;
            if (el) {
              el.style.height = "auto";
              const maxH = window.innerHeight < 700 ? 120 : 200;
              el.style.height = Math.min(el.scrollHeight, maxH) + "px";
            }
          }, 50);
        }
      }
    } catch (err) {
      console.error("Failed to enhance prompt:", err);
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div
      className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-2 sm:p-3 shrink-0"
      style={{
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))",
      }}
    >
      <div className="w-full max-w-5xl mx-auto px-2 sm:px-4">
        <div className="flex flex-col bg-background border border-border/50 rounded-xl p-2 sm:p-3 gap-1.5 shadow-sm focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
          {/* Model selector row */}
          <div className="flex items-center gap-2 px-1">
            <ModelSelector
              selectedModel={activeModel}
              onSelect={handleModelChange}
            />
          </div>
          {/* Input row */}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder={placeholder}
              disabled={isLoading || disabled}
              rows={1}
              className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[60px] max-h-[200px] py-3 px-2 text-base sm:text-base leading-relaxed"
            />
            <Button
              onClick={enhancePrompt}
              disabled={!message.trim() || isEnhancing || isLoading || disabled}
              size="icon"
              variant="ghost"
              className="h-10 w-10 shrink-0 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="Enhance prompt with AI"
            >
              {isEnhancing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading || disabled}
              size="icon"
              className="h-10 w-10 shrink-0 rounded-lg bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 disabled:shadow-none"
            >
              <SendHorizonal className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Build idea marquee - two rows scrolling in opposite directions */}
        {showSuggestions && (
          <div className="mt-3 mb-1 space-y-2 overflow-hidden">
            {/* Row 1: scrolls right to left */}
            <div className="relative overflow-hidden mask-marquee">
              <div className="flex gap-2 animate-marquee-rtl w-max">
                {ROW1_DOUBLED.map((idea, i) => (
                  <button
                    key={`r1-${i}`}
                    onClick={() => handleIdeaClick(idea.prompt)}
                    disabled={isLoading || disabled}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50 hover:scale-105 hover:shadow-md ${idea.bg}`}
                  >
                    <idea.icon className={`h-4 w-4 ${idea.color}`} />
                    <span className="text-foreground/80">{idea.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {/* Row 2: scrolls left to right */}
            <div className="relative overflow-hidden mask-marquee">
              <div className="flex gap-2 animate-marquee-ltr w-max">
                {ROW2_DOUBLED.map((idea, i) => (
                  <button
                    key={`r2-${i}`}
                    onClick={() => handleIdeaClick(idea.prompt)}
                    disabled={isLoading || disabled}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-all shrink-0 cursor-pointer disabled:opacity-50 hover:scale-105 hover:shadow-md ${idea.bg}`}
                  >
                    <idea.icon className={`h-4 w-4 ${idea.color}`} />
                    <span className="text-foreground/80">{idea.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
          DoBetter Viber uses your own API keys. Keys are stored securely and never shared.
        </p>
      </div>
    </div>
  );
}
