"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Code2, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CodeBlock {
  language: string;
  filename?: string;
  content: string;
}

interface CodePanelProps {
  codeBlocks?: CodeBlock[];
}

export default function CodePanel({ codeBlocks = [] }: CodePanelProps) {
  const [copied, setCopied] = useState<number | null>(null);

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (codeBlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <Code2 className="h-12 w-12 opacity-30" />
        <div className="text-center max-w-sm">
          <p className="font-medium">No code generated yet</p>
          <p className="text-sm mt-1 opacity-70">
            Start a conversation and ask the AI to build something.
            Generated code will appear here automatically — no GitHub needed!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {codeBlocks.map((block, idx) => (
          <div key={idx} className="rounded-lg border overflow-hidden bg-muted/30">
            <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{block.filename || "code"}</span>
                <Badge variant="outline" className="text-xs">{block.language}</Badge>
              </div>
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
