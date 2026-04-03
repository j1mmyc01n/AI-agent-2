"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import {
  Github,
  Zap,
  Cloud,
  Bot,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Rocket,
  X,
  Cpu,
} from "lucide-react";

interface SetupStep {
  id: string;
  title: string;
  service: string;
  icon: React.ReactNode;
  description: string;
  keyField: string;
  placeholder: string;
  helpUrl: string;
  instructions: string[];
  optional?: boolean;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: "anthropic",
    title: "Connect Claude AI",
    service: "Anthropic (Claude)",
    icon: <Cpu className="h-6 w-6" />,
    description: "Powers the AI agent with Claude models. Also available through Netlify AI Gateway — you can skip this if you don't have a key.",
    keyField: "anthropicKey",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    instructions: [
      "Go to console.anthropic.com and sign in",
      "Navigate to Settings > API Keys",
      "Click 'Create Key' and copy the key",
      "Paste it below",
    ],
    optional: true,
  },
  {
    id: "openai",
    title: "Connect OpenAI",
    service: "OpenAI (GPT-4)",
    icon: <Bot className="h-6 w-6" />,
    description: "Enables GPT-4o and GPT-4 Turbo models for your agent.",
    keyField: "openaiKey",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    instructions: [
      "Go to platform.openai.com and sign in",
      "Navigate to API Keys section",
      "Click 'Create new secret key'",
      "Copy the key and paste it below",
    ],
    optional: true,
  },
  {
    id: "github",
    title: "Connect GitHub",
    service: "GitHub",
    icon: <Github className="h-6 w-6" />,
    description: "Allows the agent to create repositories and push code for your projects.",
    keyField: "githubToken",
    placeholder: "ghp_...",
    helpUrl: "https://github.com/settings/tokens",
    instructions: [
      "Go to github.com/settings/tokens",
      "Click 'Generate new token (classic)'",
      "Select scopes: repo, workflow",
      "Generate and copy the token",
      "Paste it below",
    ],
    optional: true,
  },
  {
    id: "netlify",
    title: "Connect Netlify",
    service: "Netlify",
    icon: <Cloud className="h-6 w-6" />,
    description: "Deploy and host your projects on Netlify with one click.",
    keyField: "netlifyToken",
    placeholder: "nfp_...",
    helpUrl: "https://app.netlify.com/user/applications#personal-access-tokens",
    instructions: [
      "Go to app.netlify.com > User Settings",
      "Click 'Applications' in the sidebar",
      "Under 'Personal access tokens', click 'New access token'",
      "Give it a name, generate, and paste below",
    ],
    optional: true,
  },
  {
    id: "vercel",
    title: "Connect Vercel",
    service: "Vercel",
    icon: <Zap className="h-6 w-6" />,
    description: "Deploy projects to Vercel for instant hosting and preview URLs.",
    keyField: "vercelToken",
    placeholder: "...",
    helpUrl: "https://vercel.com/account/tokens",
    instructions: [
      "Go to vercel.com/account/tokens",
      "Click 'Create' to generate a new token",
      "Name it and set the scope",
      "Copy the token and paste below",
    ],
    optional: true,
  },
];

interface QuickSetupWizardProps {
  onComplete: () => void;
  onClose: () => void;
}

export default function QuickSetupWizard({ onComplete, onClose }: QuickSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [skippedSteps, setSkippedSteps] = useState<Set<string>>(new Set());

  const step = SETUP_STEPS[currentStep];
  const isLastStep = currentStep === SETUP_STEPS.length - 1;
  const totalSteps = SETUP_STEPS.length;

  const handleSaveStep = async () => {
    const value = values[step.keyField]?.trim();
    if (!value) return;

    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [step.keyField]: value }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      setCompletedSteps((prev) => new Set([...prev, step.id]));
      toast({
        title: `${step.service} connected`,
        description: `Successfully configured ${step.service}.`,
      });

      if (isLastStep) {
        onComplete();
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    } catch {
      toast({
        title: "Error",
        description: `Failed to save ${step.service} credentials. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setSkippedSteps((prev) => new Set([...prev, step.id]));
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <Card className="border-primary/30 shadow-xl shadow-primary/10 mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Setup Wizard</CardTitle>
              <CardDescription className="text-xs">
                Step {currentStep + 1} of {totalSteps} — The agent will configure each integration for you
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 mt-4">
          {SETUP_STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                completedSteps.has(s.id)
                  ? "bg-green-500"
                  : skippedSteps.has(s.id)
                  ? "bg-muted-foreground/30"
                  : i === currentStep
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Step icon & title */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
            {step.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold flex items-center gap-2">
              {step.title}
              {step.optional && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  Optional
                </Badge>
              )}
              {completedSteps.has(step.id) && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Setup Instructions
          </p>
          <ol className="space-y-1.5">
            {step.instructions.map((instruction, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
          <a
            href={step.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-3"
          >
            <ExternalLink className="h-3 w-3" />
            Open {step.service} settings page
          </a>
        </div>

        {/* Input */}
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            {step.service} API Key / Token
          </label>
          <Input
            type="password"
            placeholder={step.placeholder}
            value={values[step.keyField] || ""}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [step.keyField]: e.target.value }))
            }
            className="font-mono text-sm"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkip}
              className="text-muted-foreground"
            >
              Skip
            </Button>

            {isLastStep && (completedSteps.size > 0 || skippedSteps.size > 0) ? (
              <Button size="sm" onClick={handleFinish} className="gap-1">
                Finish Setup
                <CheckCircle2 className="h-3.5 w-3.5" />
              </Button>
            ) : null}

            <Button
              size="sm"
              onClick={handleSaveStep}
              disabled={saving || !values[step.keyField]?.trim()}
              className="gap-1"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  Connect & {isLastStep ? "Finish" : "Next"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Summary of what's been done */}
        {(completedSteps.size > 0 || skippedSteps.size > 0) && (
          <div className="border-t border-border/50 pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Progress</p>
            <div className="flex flex-wrap gap-2">
              {SETUP_STEPS.map((s) => (
                <Badge
                  key={s.id}
                  variant={
                    completedSteps.has(s.id)
                      ? "default"
                      : skippedSteps.has(s.id)
                      ? "secondary"
                      : "outline"
                  }
                  className={`text-[10px] ${
                    completedSteps.has(s.id)
                      ? "bg-green-500"
                      : ""
                  }`}
                >
                  {completedSteps.has(s.id) && <CheckCircle2 className="h-2.5 w-2.5 mr-1" />}
                  {s.service}
                  {skippedSteps.has(s.id) ? " (skipped)" : ""}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
