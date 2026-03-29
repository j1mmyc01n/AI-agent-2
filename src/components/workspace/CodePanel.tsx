"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Code2, Copy, Check, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface CodeBlock {
  language: string;
  filename?: string;
  content: string;
}

interface CodePanelProps {
  codeBlocks?: CodeBlock[];
  isGenerating?: boolean;
}

export default function CodePanel({ codeBlocks = [], isGenerating = false }: CodePanelProps) {
  const [copied, setCopied] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  // Auto-scroll to bottom when new code is being generated
  useEffect(() => {
    if (isGenerating && scrollRef.current) {
      const viewport = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [isGenerating, codeBlocks]);

  if (codeBlocks.length === 0 && !isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <Code2 className="h-12 w-12 opacity-30" />
        <div className="text-center max-w-sm">
          <p className="font-medium">No code generated yet</p>
          <p className="text-sm mt-1 opacity-70">
            Switch to <strong>Build</strong> mode and describe what you want — the AI agent will generate code here automatically. No GitHub needed!
          </p>
        </div>
      </div>
    );
  }

  if (codeBlocks.length === 0 && isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <div className="relative">
          <Code2 className="h-12 w-12 opacity-30" />
          <Loader2 className="h-5 w-5 animate-spin text-primary absolute -bottom-1 -right-1" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-medium text-primary">Agent is writing code...</p>
          <p className="text-sm mt-1 opacity-70">
            Code will appear here as it&apos;s generated.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full" ref={scrollRef}>
      <div className="p-4 space-y-4">
        {/* Live generating indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Agent is writing code...
          </div>
        )}

        {codeBlocks.map((block, idx) => (
          <div key={idx} className={`rounded-lg border overflow-hidden bg-muted/30 ${
            block.filename?.includes("(generating...)") ? "border-primary/30 ring-1 ring-primary/20" : ""
          }`}>
            <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {block.filename || "code"}
                </span>
                <Badge variant="outline" className="text-xs">{block.language}</Badge>
                {block.filename?.includes("(generating...)") && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
              </div>
              {!block.filename?.includes("(generating...)") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleCopy(block.content, idx)}
                >
                  {copied === idx ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
            <pre className="p-4 text-xs overflow-x-auto font-mono leading-relaxed">
              <code>{block.content}</code>
            </pre>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
