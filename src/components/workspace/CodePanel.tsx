"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Code2, Copy, Check, Loader2, FileCode, FileText, FileType, PanelLeftClose, PanelLeft } from "lucide-react";
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

function getFileIcon(language: string) {
  switch (language) {
    case "html":
      return <FileCode className="h-3.5 w-3.5 text-orange-400" />;
    case "css":
      return <FileType className="h-3.5 w-3.5 text-blue-400" />;
    case "javascript":
    case "js":
      return <FileCode className="h-3.5 w-3.5 text-yellow-400" />;
    case "typescript":
    case "ts":
    case "tsx":
      return <FileCode className="h-3.5 w-3.5 text-blue-500" />;
    case "json":
      return <FileText className="h-3.5 w-3.5 text-green-400" />;
    default:
      return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getCleanFilename(block: CodeBlock): string {
  if (block.filename) {
    return block.filename.replace(" (generating...)", "");
  }
  // Derive a name from language if no filename
  const extensions: Record<string, string> = {
    html: "index.html", css: "styles.css", javascript: "app.js", js: "app.js",
    typescript: "index.ts", tsx: "component.tsx", json: "data.json", text: "file.txt",
  };
  return extensions[block.language] || `file.${block.language}`;
}

export default function CodePanel({ codeBlocks = [], isGenerating = false }: CodePanelProps) {
  const [copied, setCopied] = useState<number | null>(null);
  const [selectedFileIdx, setSelectedFileIdx] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  // Auto-select newest file when new blocks appear
  useEffect(() => {
    if (codeBlocks.length > 0 && selectedFileIdx === null) {
      setSelectedFileIdx(0);
    }
  }, [codeBlocks.length, selectedFileIdx]);

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

  const displayBlocks = selectedFileIdx !== null && selectedFileIdx < codeBlocks.length
    ? [codeBlocks[selectedFileIdx]]
    : codeBlocks;

  const displayStartIdx = selectedFileIdx !== null && selectedFileIdx < codeBlocks.length
    ? selectedFileIdx
    : 0;

  return (
    <div className="flex h-full">
      {/* File tree sidebar */}
      <div className={`border-r border-border/50 bg-card/30 flex flex-col shrink-0 transition-all duration-200 ${
        sidebarCollapsed ? "w-10" : "w-48"
      }`}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/30">
          {!sidebarCollapsed && (
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
              Files ({codeBlocks.length})
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand file tree" : "Collapse file tree"}
          >
            {sidebarCollapsed ? (
              <PanelLeft className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* File list */}
        {!sidebarCollapsed && (
          <ScrollArea className="flex-1">
            <div className="py-1">
              {/* Show All Files option */}
              <button
                onClick={() => setSelectedFileIdx(null)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selectedFileIdx === null
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
                }`}
              >
                <Code2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium">All Files</span>
              </button>

              {/* Individual files */}
              {codeBlocks.map((block, idx) => {
                const filename = getCleanFilename(block);
                const isGeneratingFile = block.filename?.includes("(generating...)");
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedFileIdx(idx)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs transition-colors ${
                      selectedFileIdx === idx
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border-l-2 border-transparent"
                    }`}
                    title={filename}
                  >
                    {getFileIcon(block.language)}
                    <span className="truncate flex-1">{filename}</span>
                    {isGeneratingFile && (
                      <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Collapsed: show just icons */}
        {sidebarCollapsed && (
          <ScrollArea className="flex-1">
            <div className="py-1 flex flex-col items-center gap-0.5">
              {codeBlocks.map((block, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSidebarCollapsed(false); setSelectedFileIdx(idx); }}
                  className={`p-1.5 rounded transition-colors ${
                    selectedFileIdx === idx ? "bg-primary/15" : "hover:bg-muted/50"
                  }`}
                  title={getCleanFilename(block)}
                >
                  {getFileIcon(block.language)}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Code content area */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full" ref={scrollRef}>
          <div className="p-4 space-y-4">
            {/* Live generating indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Agent is writing code...
              </div>
            )}

            {displayBlocks.map((block, relIdx) => {
              const idx = displayStartIdx + relIdx;
              return (
                <div key={idx} className={`rounded-lg border overflow-hidden bg-muted/30 ${
                  block.filename?.includes("(generating...)") ? "border-primary/30 ring-1 ring-primary/20" : ""
                }`}>
                  <div className="flex items-center justify-between px-4 py-2 bg-muted border-b">
                    <div className="flex items-center gap-2">
                      {getFileIcon(block.language)}
                      <span className="text-sm font-medium">
                        {block.filename || getCleanFilename(block)}
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
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
