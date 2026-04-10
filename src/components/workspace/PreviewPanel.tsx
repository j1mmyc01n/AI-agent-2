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

/** Returns true if the URL is absolute / CDN (should be kept in srcDoc iframes). */
function isAbsoluteUrl(url: string): boolean {
  return /^(https?:|\/\/)/.test(url);
}

/**
 * Build a fully self-contained srcDoc by inlining all local CSS and JS files
 * referenced by index.html. CDN scripts (https://) are preserved as-is.
 * This is the ONLY correct way to render multi-file projects in a sandboxed iframe.
 */
function buildInlinedSrcDoc(codeBlocks: CodeBlock[]): string {
  // Find the HTML entry point
  const htmlBlock = codeBlocks.find(
    (b) =>
      b.filename === "index.html" ||
      normalizePreviewName(b.filename || "") === "index.html" ||
      (!b.filename && b.language === "html")
  );

  if (!htmlBlock) {
    // No HTML — wrap all CSS + JS in a minimal shell
    const css = codeBlocks
      .filter((b) => b.language === "css")
      .map((b) => b.content)
      .join("\n");
    const js = codeBlocks
      .filter((b) => b.language === "javascript" || b.language === "js")
      .map((b) => b.content)
      .join("\n\n");
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><script>${js}<\/script></body></html>`;
  }

  // Build filename → content lookup (handles both "src/css/styles.css" and "./src/css/styles.css")
  const fileMap = new Map<string, string>();
  for (const block of codeBlocks) {
    if (block.filename && block.content) {
      const cleanName = block.filename
        .replace(/\s*\(generating\.\.\.\)\s*/i, "")
        .replace(/^\.\//, "")
        .trim();
      fileMap.set(cleanName, block.content);
      // Also index by basename so "styles.css" matches "src/css/styles.css"
      const basename = cleanName.split("/").pop() || cleanName;
      if (!fileMap.has(basename)) fileMap.set(basename, block.content);
    }
  }

  let html = htmlBlock.content;

  // Inline CSS: <link rel="stylesheet" href="src/css/styles.css"> → <style>...</style>
  html = html.replace(
    /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/gi,
    (match, href) => {
      // Keep CDN / absolute URLs as-is
      if (/^(https?:)?\/\//.test(href)) return match;
      const cleanHref = href.replace(/^\.\//, "");
      const content =
        fileMap.get(cleanHref) ||
        fileMap.get(cleanHref.split("/").pop() || cleanHref);
      return content ? `<style>\n/* inlined: ${cleanHref} */\n${content}\n</style>` : "";
    }
  );

  // Inline JS: <script src="src/js/app.js" defer></script> → <script>...</script>
  html = html.replace(
    /<script\b([^>]*)\bsrc=["']([^"']+)["'][^>]*><\/script>/gi,
    (match, attrs, src) => {
      // Keep CDN / absolute URLs as-is
      if (/^(https?:)?\/\//.test(src)) return match;
      const cleanSrc = src.replace(/^\.\//, "");
      const content =
        fileMap.get(cleanSrc) ||
        fileMap.get(cleanSrc.split("/").pop() || cleanSrc);
      // Strip `src` and `defer` from inlined script tag attrs
      const cleanAttrs = (attrs || "")
        .replace(/\bsrc=["'][^"']*["']/g, "")
        .replace(/\bdefer\b/g, "")
        .trim();
      return content
        ? `<script${cleanAttrs ? " " + cleanAttrs : ""}>\n/* inlined: ${cleanSrc} */\n${content}\n<\/script>`
        : "";
    }
  );

  return html;
}

// Helper used by buildInlinedSrcDoc
function normalizePreviewName(name: string): string {
  return name.replace(/\s*\(generating\.\.\.\)\s*/i, "").toLowerCase().trim();
}

/** Build a React/JSX preview wrapper using Babel standalone + React 18 CDN. */
function buildReactPreview(reactBlocks: CodeBlock[], cssBlocks: CodeBlock[]): string {
  const cssContent = cssBlocks.map((b) => b.content).join("\n");
  const jsxContent = reactBlocks.map((b) => b.content).join("\n\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-height: 100vh; }
  ${cssContent}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react,env">
${jsxContent}

// Auto-render the top-level component if the root is still empty
try {
  const rootEl = document.getElementById('root');
  if (rootEl && !rootEl.hasChildNodes()) {
    const Component =
      typeof App !== 'undefined' ? App
      : typeof Dashboard !== 'undefined' ? Dashboard
      : typeof Home !== 'undefined' ? Home
      : typeof Page !== 'undefined' ? Page
      : null;
    if (Component) {
      ReactDOM.createRoot(rootEl).render(React.createElement(Component));
    }
  }
} catch (e) { console.error('Preview render error:', e); }
</script>
</body>
</html>`;
}

/** Priority values for JS block ordering in the preview assembler. */
const JS_PRIORITY_CONFIG = 0;      // config, constants, settings — must load first
const JS_PRIORITY_STATE = 1;       // state, store — after config
const JS_PRIORITY_ROUTER = 2;      // router, route, navigation — after state
const JS_PRIORITY_COMPONENTS = 3;  // components, widgets, UI elements — after router
const JS_PRIORITY_API = 4;         // api, service, data, model — data layer
const JS_PRIORITY_DEFAULT = 3;     // unclassified / misc (same level as components)
const JS_PRIORITY_APP = 5;         // app, main, index, init — always last

/**
 * Sort JS blocks so files load in dependency order for the 8-file architecture:
 * config → state → router → components → api/data → app (last)
 * This ensures all dependencies are defined before the bootstrap runs.
 */
function sortJsBlocks(blocks: CodeBlock[]): CodeBlock[] {
  const priority = (b: CodeBlock): number => {
    const name = (b.filename || "").toLowerCase().replace(/\s*\(generating\.\.\.\)\s*/i, "");
    if (/\b(config|constant|setting|type)/.test(name)) return JS_PRIORITY_CONFIG;
    if (/\b(state|store)/.test(name)) return JS_PRIORITY_STATE;
    if (/\b(router|route|navigation)/.test(name)) return JS_PRIORITY_ROUTER;
    if (/\b(component|widget|element|ui)/.test(name)) return JS_PRIORITY_COMPONENTS;
    if (/\b(api|service|data|model|util|helper)/.test(name)) return JS_PRIORITY_API;
    if (/\b(app|main|index|init)/.test(name)) return JS_PRIORITY_APP;
    return JS_PRIORITY_DEFAULT;
  };
  return [...blocks].sort((a, b) => priority(a) - priority(b));
}

/**
 * Extract any tailwind.config object literal from JS blocks so it can be
 * injected as an inline script BEFORE the Tailwind CDN tag.  This is
 * required because the CDN processes the DOM on load — any config must
 * already be on `window` at that point.
 *
 * Uses brace counting to correctly match nested objects.
 */
function extractTailwindConfig(jsContent: string): string | null {
  const startIdx = jsContent.search(/tailwind\.config\s*=/);
  if (startIdx === -1) return null;

  // Find the opening brace
  const braceIdx = jsContent.indexOf("{", startIdx);
  if (braceIdx === -1) return null;

  // Count braces to find the matching closing brace
  let depth = 0;
  let endIdx = -1;
  for (let i = braceIdx; i < jsContent.length; i++) {
    if (jsContent[i] === "{") depth++;
    else if (jsContent[i] === "}") {
      depth--;
      if (depth === 0) { endIdx = i; break; }
    }
  }
  if (endIdx === -1) return null;

  const configValue = jsContent.slice(braceIdx, endIdx + 1);
  return `tailwind.config = ${configValue};`;
}

/** Returns true if the HTML string contains the official Tailwind CDN script tag. */
function hasTailwindCdnScript(html: string): boolean {
  // Require the exact CDN hostname to avoid partial/spoofed matches
  return /src=["']https:\/\/cdn\.tailwindcss\.com["']/.test(html);
}

/** Build a full HTML document from code blocks for inline preview */
function buildPreviewHtml(codeBlocks: CodeBlock[], selectedPage?: string): string | null {
  if (!codeBlocks || codeBlocks.length === 0) return null;

  // React/JSX projects: use Babel standalone wrapper
  const reactBlocks = codeBlocks.filter(
    (b) => b.language === "jsx" || b.language === "tsx"
  );
  if (reactBlocks.length > 0) {
    return buildReactPreview(
      reactBlocks,
      codeBlocks.filter((b) => b.language === "css")
    );
  }

  // HTML/CSS/JS projects: inline all local file references
  const result = buildInlinedSrcDoc(codeBlocks);

  // If buildInlinedSrcDoc returned a minimal shell but we have no meaningful content, return null
  if (!result || result.length < 50) return null;

  return result;
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
    if (isStreaming) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 p-6">
          <div className="h-16 w-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
          </div>
          <div className="text-center max-w-sm">
            <p className="font-medium mb-1 text-orange-500">Building your project...</p>
            <p className="text-sm opacity-70">
              The live preview will appear here as soon as HTML code is
              generated. Keep watching — it won&apos;t be long!
            </p>
          </div>
        </div>
      );
    }
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
              window.open(url, "_blank", "noopener,noreferrer");
              setTimeout(() => URL.revokeObjectURL(url), 15000);
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
