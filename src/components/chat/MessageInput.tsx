"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizonal } from "lucide-react";
import ModelSelector, { AIModel, DEFAULT_MODEL } from "./ModelSelector";

interface MessageInputProps {
  onSend: (message: string, model: AIModel) => void;
  isLoading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  selectedModel?: AIModel;
  onModelChange?: (model: AIModel) => void;
}

export default function MessageInput({
  onSend,
  isLoading = false,
  disabled = false,
  placeholder = "Message DoBetter Viber... (Enter to send, Shift+Enter for new line)",
  selectedModel,
  onModelChange,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
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
      const maxH = window.innerHeight < 700 ? 80 : 120;
      el.style.height = Math.min(el.scrollHeight, maxH) + "px";
    }
  };

  return (
    <div className="border-t border-border/50 bg-card/30 backdrop-blur-sm p-2 sm:p-3 shrink-0" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0px))" }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col bg-background border border-border/50 rounded-xl p-2 gap-1.5 shadow-sm focus-within:border-primary/30 focus-within:shadow-md focus-within:shadow-primary/5 transition-all">
          {/* Model selector row */}
          <div className="flex items-center gap-2 px-1">
            <ModelSelector selectedModel={activeModel} onSelect={handleModelChange} />
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
              className="flex-1 bg-transparent border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[36px] max-h-[120px] py-1.5 px-1 text-[16px] sm:text-sm"
              style={{ fontSize: "16px" }}
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || isLoading || disabled}
              size="icon"
              className="h-9 w-9 shrink-0 rounded-lg bg-primary hover:bg-primary/90 shadow-sm shadow-primary/20 disabled:shadow-none"
            >
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60 text-center mt-1">
          DoBetter Viber can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
