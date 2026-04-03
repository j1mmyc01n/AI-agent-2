"use client";

import {
  Eye,
  ExternalLink,
  RefreshCw,
  Code2,
  Maximize2,
  Minimize2,
  Smartphone,
  Tablet,
  Monitor,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";

interface CodeBlock {
  language: string;
  filename?: string;
  content: string;
}

interface PreviewPanelProps {
  previewUrl?: string;
  projectName?: string;
  codeBlocks?: CodeBlock[];
  isStreaming?: boolean;
}

type ViewportMode = "desktop" | "tablet" | "mobile";

const viewportSizes: Record<ViewportMode, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

/** Build a full HTML document from code blocks for inline preview */
function buildPreviewHtml(codeBlocks: CodeBlock[], selectedPage?: string): string | null {
  if (!codeBlocks || codeBlocks.length === 0) return null;

  // Find all HTML file blocks (for multi-page SaaS)
  const htmlFileBlocks = codeBlocks.filter(
    (b) =>
      b.language === "html" &&
      (b.content.includes("<!DOCTYPE") ||
        b.content.includes("<html") ||
        b.content.includes("<body"))
  );

  // If a specific page is selected, use that; otherwise use the first (or best) HTML block
  let htmlBlock: CodeBlock | undefined;
  if (selectedPage && htmlFileBlocks.length > 1) {
    htmlBlock = htmlFileBlocks.find(
      (b) => b.filename?.toLowerCase().replace(/\s*\(generating\.\.\.\)\s*/i, "").includes(selectedPage.toLowerCase())
    );
  }
  if (!htmlBlock) {
    // Prefer index.html, then dashboard.html, then the first HTML block
    htmlBlock = htmlFileBlocks.find(b => b.filename?.toLowerCase().includes("index"))
      || htmlFileBlocks.find(b => b.filename?.toLowerCase().includes("dashboard"))
      || htmlFileBlocks[0];
  }

  if (htmlBlock) {
    let html = htmlBlock.content;
    const cssBlocks = codeBlocks.filter(
      (b) => b.language === "css" && b !== htmlBlock
    );
    const jsBlocks = codeBlocks.filter(
      (b) =>
        (b.language === "javascript" ||
          b.language === "js" ||
          b.language === "typescript" ||
          b.language === "ts" ||
          b.language === "jsx" ||
          b.language === "tsx") &&
        b !== htmlBlock
    );

    if (cssBlocks.length > 0) {
      const cssTag = `<style>\n${cssBlocks.map((b) => b.content).join("\n")}\n</style>`;
      if (html.includes("</head>")) {
        html = html.replace("</head>", `${cssTag}\n</head>`);
      } else if (html.includes("<body")) {
        html = html.replace("<body", `${cssTag}\n<body`);
      }
    }

    if (jsBlocks.length > 0) {
      const jsTag = `<script>\n${jsBlocks.map((b) => b.content).join("\n")}\n</script>`;
      if (html.includes("</body>")) {
        html = html.replace("</body>", `${jsTag}\n</body>`);
      } else {
        html += jsTag;
      }
    }

    return html;
  }

  // Build HTML from individual blocks
  const cssBlocks = codeBlocks.filter((b) => b.language === "css");
  const jsBlocks = codeBlocks.filter(
    (b) =>
      b.language === "javascript" || b.language === "js" || b.language === "jsx"
  );
  const htmlSnippets = codeBlocks.filter(
    (b) =>
      b.language === "html" &&
      !b.content.includes("<!DOCTYPE") &&
      !b.content.includes("<html")
  );

  if (
    cssBlocks.length === 0 &&
    jsBlocks.length === 0 &&
    htmlSnippets.length === 0
  )
    return null;

  const css = cssBlocks.map((b) => b.content).join("\n");
  const js = jsBlocks.map((b) => b.content).join("\n");
  const htmlContent = htmlSnippets.map((b) => b.content).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; }
  ${css}
</style>
</head>
<body>
${htmlContent}
${js ? `<script>\n${js}\n</script>` : ""}
</body>
</html>`;
}

/** Extract page names from HTML file blocks */
function getPageNames(codeBlocks: CodeBlock[]): string[] {
  return codeBlocks
    .filter(
      (b) =>
        b.language === "html" &&
        b.filename &&
        (b.content.includes("<!DOCTYPE") ||
          b.content.includes("<html") ||
          b.content.includes("<body"))
    )
    .map((b) => {
      const name = b.filename?.replace(/\s*\(generating\.\.\.\)\s*/i, "").replace(/\.html$/i, "") || "page";
      return name;
    });
}

export default function PreviewPanel({
  previewUrl,
  projectName,
  codeBlocks = [],
  isStreaming = false,
}: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const [selectedPage, setSelectedPage] = useState<string | undefined>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const inlineHtml = useMemo(
    () => buildPreviewHtml(codeBlocks, selectedPage),
    [codeBlocks, selectedPage]
  );
  const pageNames = useMemo(() => getPageNames(codeBlocks), [codeBlocks]);

  const hasDeployedPreview = !!previewUrl;
  const hasInlinePreview = !!inlineHtml;
  const hasAnyPreview = hasDeployedPreview || hasInlinePreview;
  const isMultiPage = pageNames.length > 1;

  // Debounced preview refresh — update at most every 800ms during streaming,
  // but immediately when streaming stops
  const prevHtmlRef = useRef(inlineHtml);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingHtmlRef = useRef<string | null>(null);

  const applyRefresh = useCallback(() => {
    if (pendingHtmlRef.current !== null && pendingHtmlRef.current !== prevHtmlRef.current) {
      prevHtmlRef.current = pendingHtmlRef.current;
      setRefreshKey((k) => k + 1);
    }
    pendingHtmlRef.current = null;
    debounceTimerRef.current = null;
  }, []);

  useEffect(() => {
    if (inlineHtml === prevHtmlRef.current) return;

    if (!isStreaming) {
      // Not streaming — update immediately
      prevHtmlRef.current = inlineHtml;
      pendingHtmlRef.current = null;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setRefreshKey((k) => k + 1);
    } else {
      // Streaming — debounce updates
      pendingHtmlRef.current = inlineHtml;
      if (!debounceTimerRef.current) {
        debounceTimerRef.current = setTimeout(applyRefresh, 800);
      }
    }
  }, [inlineHtml, isStreaming, applyRefresh]);

  // Flush any pending update when streaming stops
  useEffect(() => {
    if (!isStreaming && pendingHtmlRef.current !== null) {
      applyRefresh();
    }
  }, [isStreaming, applyRefresh]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  if (!hasAnyPreview) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Eye className="h-8 w-8 opacity-30" />
        </div>
        <div className="text-center max-w-sm">
          <p className="font-medium mb-1">No preview available yet</p>
          <p className="text-sm opacity-70">
            Ask the AI to generate HTML, CSS, or JavaScript code and a live
            preview will appear here automatically. No GitHub or Netlify
            deployment needed!
          </p>
        </div>
      </div>
    );
  }

  const displayUrl = hasDeployedPreview
    ? previewUrl
    : selectedPage
    ? `${selectedPage}.html`
    : "Inline Preview";

  return (
    <div
      className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50 bg-background" : ""}`}
    >
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border text-xs text-muted-foreground font-mono truncate">
          {hasDeployedPreview ? (
            <Eye className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <Code2 className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className="truncate">{displayUrl}</span>
          {hasInlinePreview && !hasDeployedPreview && (
            <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              isStreaming
                ? "text-orange-500 bg-orange-500/10 animate-pulse"
                : "text-primary bg-primary/10"
            }`}>
              {isStreaming ? "BUILDING" : "LIVE"}
            </span>
          )}
        </div>

        {/* Viewport switcher */}
        <div className="hidden sm:flex items-center rounded-md border border-border/50 overflow-hidden">
          {(
            [
              { mode: "desktop" as ViewportMode, icon: Monitor },
              { mode: "tablet" as ViewportMode, icon: Tablet },
              { mode: "mobile" as ViewportMode, icon: Smartphone },
            ] as const
          ).map(({ mode, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setViewport(mode)}
              className={`p-1.5 transition-colors ${
                viewport === mode
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
              title={viewportSizes[mode].label}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setRefreshKey((k) => k + 1)}
          title="Refresh preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </Button>
        {hasDeployedPreview ? (
          <a href={previewUrl} target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              title="Open in new tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        ) : hasInlinePreview && !isStreaming ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            title="Open preview in new tab"
            onClick={() => {
              const blob = new Blob([inlineHtml!], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const win = window.open(url, "_blank");
              // Revoke after the browser has had time to load it
              if (win) {
                win.addEventListener("load", () => URL.revokeObjectURL(url), { once: true });
              } else {
                setTimeout(() => URL.revokeObjectURL(url), 10_000);
              }
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {/* Multi-page tabs for SaaS projects */}
      {isMultiPage && (
        <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-muted/20 overflow-x-auto shrink-0">
          {pageNames.map((page) => {
            const isActive = selectedPage === page || (!selectedPage && (page === "index" || pageNames.indexOf(page) === 0));
            return (
              <button
                key={page}
                onClick={() => setSelectedPage(page)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {page}.html
              </button>
            );
          })}
        </div>
      )}

      {/* Streaming progress banner */}
      {isStreaming && hasInlinePreview && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border-b border-orange-500/20 shrink-0">
          <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
          <span className="text-xs text-orange-500 font-medium">
            Building live preview — updates every moment as code is generated...
          </span>
        </div>
      )}

      {/* iFrame preview - fully interactive */}
      <div className="flex-1 overflow-hidden bg-white flex items-start justify-center">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: viewportSizes[viewport].width,
            maxWidth: "100%",
            ...(viewport !== "desktop"
              ? {
                  borderLeft: "1px solid hsl(var(--border))",
                  borderRight: "1px solid hsl(var(--border))",
                }
              : {}),
          }}
        >
          {hasDeployedPreview ? (
            <iframe
              key={`deployed-${refreshKey}`}
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-0"
              title={projectName || "Project Preview"}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
            />
          ) : (
            <iframe
              key={`inline-${refreshKey}`}
              ref={iframeRef}
              srcDoc={inlineHtml || ""}
              className="w-full h-full border-0"
              title={projectName || "Code Preview"}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}
        </div>
      </div>
    </div>
  );
}
