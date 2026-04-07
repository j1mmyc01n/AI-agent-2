"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, FolderOpen } from "lucide-react";
import Link from "next/link";

export default function ProjectDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Project page error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center h-full py-24 px-6">
      <div className="text-center max-w-md">
        <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-destructive opacity-70" />
        </div>
        <h2 className="text-xl font-bold mb-2">Project failed to load</h2>
        <p className="text-muted-foreground text-sm mb-6">
          {error?.message || "An error occurred while loading this project. Please try again."}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </Button>
          <Link href="/projects">
            <Button variant="outline" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
