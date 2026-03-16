"use client";

import { Eye, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface PreviewPanelProps {
  previewUrl?: string;
  projectName?: string;
}

export default function PreviewPanel({ previewUrl, projectName }: PreviewPanelProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!previewUrl) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
        <Eye className="h-12 w-12 opacity-30" />
        <div className="text-center">
          <p className="font-medium">No preview available</p>
          <p className="text-sm mt-1">Deploy your project to see a live preview here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Preview toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex-1 flex items-center gap-2 px-3 py-1.5 bg-background rounded-md border text-xs text-muted-foreground font-mono truncate">
          <Eye className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{previewUrl}</span>
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
        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </a>
      </div>

      {/* iFrame preview */}
      <div className="flex-1 overflow-hidden bg-background">
        <iframe
          key={refreshKey}
          src={previewUrl}
          className="w-full h-full border-0"
          title={projectName || "Project Preview"}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
    </div>
  );
}
