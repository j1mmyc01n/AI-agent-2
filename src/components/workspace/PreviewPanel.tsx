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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo, useEffect, useRef } from "react";

interface CodeBlock {
  language: string;
  filename?: string;
  content: string;
}

interface PreviewPanelProps {
  previewUrl?: string;
  projectName?: string;
  codeBlocks?: CodeBlock[];
}

type ViewportMode = "desktop" | "tablet" | "mobile";

const viewportSizes: Record<ViewportMode, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

/** Build a full HTML document from code blocks for inline preview */
function buildPreviewHtml(codeBlocks: CodeBlock[]): string | null {
  if (!codeBlocks || codeBlocks.length === 0) return null;

  // Check if there's already a full HTML file
  const htmlBlock = codeBlocks.find(
    (b) =>
      b.language === "html" &&
      (b.content.includes("<!DOCTYPE") ||
        b.content.includes("<html") ||
        b.content.includes("<body"))
  );
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

export default function PreviewPanel({
  previewUrl,
  projectName,
  codeBlocks = [],
}: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewport, setViewport] = useState<ViewportMode>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const inlineHtml = useMemo(() => buildPreviewHtml(codeBlocks), [codeBlocks]);

  const hasDeployedPreview = !!previewUrl;
  const hasInlinePreview = !!inlineHtml;
  const hasAnyPreview = hasDeployedPreview || hasInlinePreview;

  // Auto-refresh iframe when inline HTML changes
  const prevHtmlRef = useRef(inlineHtml);
  useEffect(() => {
    if (inlineHtml !== prevHtmlRef.current) {
      prevHtmlRef.current = inlineHtml;
      setRefreshKey((k) => k + 1);
    }
  }, [inlineHtml]);

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

  const displayUrl = hasDeployedPreview ? previewUrl : "Inline Preview";

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
            <span className="ml-auto text-[10px] text-primary font-semibold px-1.5 py-0.5 rounded-full bg-primary/10">
              LIVE
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
        {hasDeployedPreview && (
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
        )}
      </div>

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
