"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Rocket } from "lucide-react";
import QuickSetupWizard from "./QuickSetupWizard";

export default function SettingsClient() {
  const [showWizard, setShowWizard] = useState(false);

  if (showWizard) {
    return (
      <QuickSetupWizard
        onComplete={() => {
          setShowWizard(false);
          // Refresh the page to update integration statuses
          window.location.reload();
        }}
        onClose={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="mb-6">
      <Button
        onClick={() => setShowWizard(true)}
        variant="outline"
        className="w-full gap-2 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary h-12"
      >
        <Rocket className="h-4 w-4" />
        Quick Setup Wizard — Connect GitHub, Netlify, Vercel & AI in minutes
      </Button>
    </div>
  );
}
