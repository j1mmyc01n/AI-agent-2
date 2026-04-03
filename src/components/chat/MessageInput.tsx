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
      "Build me a modern SaaS analytics dashboard with sidebar navigation, stat cards, charts, and activity feed. Premium dark theme, smooth animations.",
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20",
  },
  {
    label: "Landing Page",
    prompt:
      "Build a premium startup landing page with gradient hero, feature grid, testimonials, 3-tier pricing, FAQ, and CTA. Modern style like Linear or Vercel.",
    icon: Layout,
    color: "text-violet-400",
    bg: "bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20",
  },
  {
    label: "E-Commerce",
    prompt:
      "Build a modern e-commerce product page with image gallery, size/color selectors, cart, description tabs, reviews, and recommendations. Premium fashion brand style.",
    icon: ShoppingCart,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20",
  },
  {
    label: "Chat App",
    prompt:
      "Build a real-time chat UI with contacts sidebar, message bubbles, typing indicators, emoji picker, and status indicators. Discord/Slack style.",
    icon: ChatIcon,
    color: "text-orange-400",
    bg: "bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/20",
  },
  {
    label: "Portfolio",
    prompt:
      "Build a stunning creative portfolio with animated hero, project showcase grid with hover effects, about section, skills, and contact form. Premium artistic feel.",
    icon: Palette,
    color: "text-pink-400",
    bg: "bg-pink-500/10 hover:bg-pink-500/15 border-pink-500/20",
  },
  {
    label: "Blog / CMS",
    prompt:
      "Build a modern blog platform with featured post hero, post grid with thumbnails, sidebar with tags and newsletter signup, clean reading view. Medium/Substack style.",
    icon: FileText,
    color: "text-rose-400",
    bg: "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20",
  },
  {
    label: "Music Player",
    prompt:
      "Build a premium music player app UI with album art, playback controls, playlist sidebar, progress bar, queue, and equalizer visualization. Spotify-inspired.",
    icon: Music,
    color: "text-green-400",
    bg: "bg-green-500/10 hover:bg-green-500/15 border-green-500/20",
  },
  {
    label: "AI Tool",
    prompt:
      "Build an AI-powered writing assistant tool with a clean minimal UI, prompt input area, output display, tone selector, word count, and copy functionality.",
    icon: Lightbulb,
    color: "text-amber-400",
    bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20",
  },
  {
    label: "Social Network",
    prompt:
      "Build a social media feed page with post cards, like/comment buttons, stories bar, user profiles, trending sidebar, and create post modal. Instagram-inspired.",
    icon: Globe,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20",
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
          AI powered by Netlify AI Gateway. No API keys needed.
        </p>
      </div>
    </div>
  );
}
