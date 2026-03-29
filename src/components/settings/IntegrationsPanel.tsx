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
  Database,
  Cloud,
  Cpu,
} from "lucide-react";

interface IntegrationStatus {
  hasOpenaiKey: boolean;
  hasAnthropicKey: boolean;
  hasGrokKey: boolean;
  hasGithubToken: boolean;
  hasVercelToken: boolean;
  hasTavilyKey: boolean;
  hasNeonKey: boolean;
  hasNetlifyToken: boolean;
  openaiKey: string | null;
  anthropicKey: string | null;
  grokKey: string | null;
  githubToken: string | null;
  vercelToken: string | null;
  tavilyKey: string | null;
  neonKey: string | null;
  netlifyToken: string | null;
}

type StatusKey = keyof Pick<
  IntegrationStatus,
  | "hasOpenaiKey"
  | "hasAnthropicKey"
  | "hasGrokKey"
  | "hasGithubToken"
  | "hasVercelToken"
  | "hasTavilyKey"
  | "hasNeonKey"
  | "hasNetlifyToken"
>;

type ValueKey =
  | "openaiKey"
  | "anthropicKey"
  | "grokKey"
  | "githubToken"
  | "vercelToken"
  | "tavilyKey"
  | "neonKey"
  | "netlifyToken";

interface Integration {
  id: ValueKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  placeholder: string;
  helpUrl: string;
  helpText: string;
  statusKey: StatusKey;
  category: "ai-models" | "integrations" | "connectivity";
}

const integrations: Integration[] = [
  {
    id: "openaiKey",
    title: "OpenAI",
    description: "Powers GPT-4o, GPT-4 Turbo, and GPT-3.5. Required for OpenAI models.",
    icon: <Bot className="h-5 w-5" />,
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpText: "Get your API key from OpenAI Platform",
    statusKey: "hasOpenaiKey",
    category: "ai-models",
  },
  {
    id: "anthropicKey",
    title: "Anthropic (Claude)",
    description: "Powers Claude 3.5 Sonnet, Claude 3 Opus and Haiku models.",
    icon: <Cpu className="h-5 w-5" />,
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "Get your API key from Anthropic Console",
    statusKey: "hasAnthropicKey",
    category: "ai-models",
  },
  {
    id: "grokKey",
    title: "xAI (Grok)",
    description: "Powers Grok 2 and Grok Beta from xAI.",
    icon: <Zap className="h-5 w-5" />,
    placeholder: "xai-...",
    helpUrl: "https://console.x.ai/",
    helpText: "Get your API key from xAI Console",
    statusKey: "hasGrokKey",
    category: "ai-models",
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
    category: "integrations",
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
    category: "integrations",
  },
  {
    id: "netlifyToken",
    title: "Netlify",
    description: "Deploy and host your projects on Netlify.",
    icon: <Cloud className="h-5 w-5" />,
    placeholder: "...",
    helpUrl: "https://app.netlify.com/user/applications",
    helpText: "Create a personal access token in Netlify",
    statusKey: "hasNetlifyToken",
    category: "integrations",
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
    category: "integrations",
  },
  {
    id: "neonKey",
    title: "Neon",
    description: "Serverless PostgreSQL database connectivity.",
    icon: <Database className="h-5 w-5" />,
    placeholder: "...",
    helpUrl: "https://neon.tech/docs/get-started-with-neon/api-keys",
    helpText: "Get your API key from Neon console",
    statusKey: "hasNeonKey",
    category: "connectivity",
  },
];

const emptyValues: Record<ValueKey, string> = {
  openaiKey: "",
  anthropicKey: "",
  grokKey: "",
  githubToken: "",
  vercelToken: "",
  tavilyKey: "",
  neonKey: "",
  netlifyToken: "",
};

interface IntegrationsPanelProps {
  filter?: "ai-models" | "integrations" | "connectivity";
}

export default function IntegrationsPanel({ filter }: IntegrationsPanelProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [values, setValues] = useState<Record<ValueKey, string>>(emptyValues);
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
            anthropicKey: data.anthropicKey || "",
            grokKey: data.grokKey || "",
            githubToken: data.githubToken || "",
            vercelToken: data.vercelToken || "",
            tavilyKey: data.tavilyKey || "",
            neonKey: data.neonKey || "",
            netlifyToken: data.netlifyToken || "",
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

  const refreshStatus = async () => {
    const statusRes = await fetch("/api/integrations");
    if (statusRes.ok) {
      const data = await statusRes.json();
      setStatus(data);
      setValues({
        openaiKey: data.openaiKey || "",
        anthropicKey: data.anthropicKey || "",
        grokKey: data.grokKey || "",
        githubToken: data.githubToken || "",
        vercelToken: data.vercelToken || "",
        tavilyKey: data.tavilyKey || "",
        neonKey: data.neonKey || "",
        netlifyToken: data.netlifyToken || "",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await res.json();
      if (!res.ok || result.success === false) {
        throw new Error(result.error || "Failed to save");
      }

      await refreshStatus();

      toast({
        title: "Settings saved",
        description: "Your API keys have been securely saved.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async (keyId: ValueKey) => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [keyId]: "" }),
      });
      const result = await res.json();
      if (!res.ok || result.success === false) {
        throw new Error(result.error || "Failed to remove key");
      }
      await refreshStatus();
      toast({
        title: "Key removed",
        description: "The API key has been removed.",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove key.",
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

  const filteredIntegrations = filter
    ? integrations.filter((i) => i.category === filter)
    : integrations;

  const connectedCount = status
    ? filteredIntegrations.filter((i) => status[i.statusKey]).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="flex items-center gap-3">
        <div className="text-sm text-muted-foreground">
          {connectedCount} of {filteredIntegrations.length} configured
        </div>
        {connectedCount === filteredIntegrations.length && filteredIntegrations.length > 0 && (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            All Connected
          </Badge>
        )}
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {filteredIntegrations.map((integration) => {
          const isConnected = status?.[integration.statusKey] || false;
          return (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">{integration.icon}</div>
                    <div>
                      <CardTitle className="text-base">{integration.title}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={isConnected ? "default" : "outline"}
                    className={isConnected ? "bg-green-500" : ""}
                  >
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
                    setValues((prev) => ({ ...prev, [integration.id]: e.target.value }))
                  }
                  className="font-mono text-sm"
                />
                <div className="flex items-center justify-between">
                  <a
                    href={integration.helpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {integration.helpText}
                  </a>
                  {isConnected && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveKey(integration.id)}
                      disabled={saving}
                    >
                      Remove
                    </Button>
                  )}
                </div>
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
            Save Settings
          </>
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your API keys are encrypted and stored securely. They are only used to make API calls on
        your behalf.
      </p>
    </div>
  );
}
