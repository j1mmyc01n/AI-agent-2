"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Bot,
  Github,
  Zap,
  Globe,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Save,
} from "lucide-react";

interface IntegrationStatus {
  hasOpenaiKey: boolean;
  hasGithubToken: boolean;
  hasVercelToken: boolean;
  hasTavilyKey: boolean;
  openaiKey: string | null;
  githubToken: string | null;
  vercelToken: string | null;
  tavilyKey: string | null;
}

interface Integration {
  id: keyof Pick<
    Record<string, string>,
    "openaiKey" | "githubToken" | "vercelToken" | "tavilyKey"
  >;
  title: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
  helpUrl: string;
  helpText: string;
  statusKey: keyof Pick<
    IntegrationStatus,
    "hasOpenaiKey" | "hasGithubToken" | "hasVercelToken" | "hasTavilyKey"
  >;
}

const integrations: Integration[] = [
  {
    id: "openaiKey",
    title: "OpenAI",
    description: "Powers the AI agent. Required for all AI features.",
    icon: <Bot className="h-5 w-5" />,
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get your API key from OpenAI Platform",
    statusKey: "hasOpenaiKey",
  },
  {
    id: "githubToken",
    title: "GitHub",
    description: "Allows the agent to create repositories and push code.",
    icon: <Github className="h-5 w-5" />,
    placeholder: "ghp_...",
    helpUrl: "https://github.com/settings/tokens",
    helpText: "Create a Personal Access Token with repo scope",
    statusKey: "hasGithubToken",
  },
  {
    id: "vercelToken",
    title: "Vercel",
    description: "Enables automatic deployment of projects to Vercel.",
    icon: <Zap className="h-5 w-5" />,
    placeholder: "...",
    helpUrl: "https://vercel.com/account/tokens",
    helpText: "Generate an API token from your Vercel account",
    statusKey: "hasVercelToken",
  },
  {
    id: "tavilyKey",
    title: "Tavily",
    description: "Provides web search capability to the AI agent.",
    icon: <Globe className="h-5 w-5" />,
    placeholder: "tvly-...",
    helpUrl: "https://app.tavily.com/home",
    helpText: "Get your API key from Tavily",
    statusKey: "hasTavilyKey",
  },
];

export default function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [values, setValues] = useState<Record<string, string>>({
    openaiKey: "",
    githubToken: "",
    vercelToken: "",
    tavilyKey: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
          setValues({
            openaiKey: data.openaiKey || "",
            githubToken: data.githubToken || "",
            vercelToken: data.vercelToken || "",
            tavilyKey: data.tavilyKey || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch integrations:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) throw new Error("Failed to save");

      // Refresh status
      const statusRes = await fetch("/api/integrations");
      if (statusRes.ok) {
        const data = await statusRes.json();
        setStatus(data);
        setValues({
          openaiKey: data.openaiKey || "",
          githubToken: data.githubToken || "",
          vercelToken: data.vercelToken || "",
          tavilyKey: data.tavilyKey || "",
        });
      }

      toast({
        title: "Integrations saved",
        description: "Your API keys have been securely saved.",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save integrations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const connectedCount = status
    ? [
        status.hasOpenaiKey,
        status.hasGithubToken,
        status.hasVercelToken,
        status.hasTavilyKey,
      ].filter(Boolean).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {connectedCount} of {integrations.length} integrations configured
        </div>
        {connectedCount === integrations.length && (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            All Connected
          </Badge>
        )}
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {integrations.map((integration) => {
          const isConnected = status?.[integration.statusKey] || false;
          return (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={isConnected ? "default" : "outline"} className={isConnected ? "bg-green-500" : ""}>
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </>
                    ) : (
                      "Not set"
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor={integration.id} className="text-xs text-muted-foreground">
                  API Key
                </Label>
                <Input
                  id={integration.id}
                  type="password"
                  placeholder={isConnected ? "••••••••••••" : integration.placeholder}
                  value={values[integration.id]}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [integration.id]: e.target.value,
                    }))
                  }
                  className="font-mono text-sm"
                />
                <a
                  href={integration.helpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {integration.helpText}
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save Integrations
          </>
        )}
      </Button>

      {/* Info */}
      <p className="text-xs text-muted-foreground text-center">
        Your API keys are encrypted and stored securely. They are only used to
        make API calls on your behalf.
      </p>
    </div>
  );
}
