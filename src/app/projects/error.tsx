"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, FolderOpen } from "lucide-react";

export default function ProjectsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Projects page error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full py-24 px-6">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
        </div>
        <h2 className="text-xl font-bold mb-2">Could not load projects</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {error?.message || "An error occurred while loading your projects. Please try again."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Button variant="outline" onClick={() => (window.location.href = "/projects")} className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Reload Projects
          </Button>
        </div>
      </div>
    </div>
  );
}
