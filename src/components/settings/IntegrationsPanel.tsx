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
  Star,
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
  defaultModel: string | null;
  defaultProvider: string | null;
  /** true when Anthropic key is detected from deployment env var rather than user's own key */
  envAnthropic?: boolean;
  /** true when OpenAI key is detected from deployment env var rather than user's own key */
  envOpenai?: boolean;
  /** @deprecated use envAnthropic */
  gatewayAnthropic?: boolean;
  /** @deprecated use envOpenai */
  gatewayOpenai?: boolean;
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
  defaultModel?: string;
  defaultProvider?: string;
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
    defaultModel: "gpt-4o",
    defaultProvider: "openai",
  },
  {
    id: "anthropicKey",
    title: "Anthropic (Claude)",
    description: "Powers Claude Sonnet 4.5, Claude Haiku and more. Add your own key for full control.",
    icon: <Cpu className="h-5 w-5" />,
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpText: "Get your API key from Anthropic Console",
    statusKey: "hasAnthropicKey",
    category: "ai-models",
    defaultModel: "claude-sonnet-4-5",
    defaultProvider: "anthropic",
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
    defaultModel: "grok-2-latest",
    defaultProvider: "grok",
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
  const [settingDefault, setSettingDefault] = useState<string | null>(null);

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

  const handleSetDefault = async (integration: Integration) => {
    if (!integration.defaultModel || !integration.defaultProvider) return;
    setSettingDefault(integration.id);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultModel: integration.defaultModel,
          defaultProvider: integration.defaultProvider,
        }),
      });
      const result = await res.json();
      if (!res.ok || result.success === false) {
        throw new Error(result.error || "Failed to set default");
      }
      await refreshStatus();
      toast({
        title: "Default model updated",
        description: `${integration.title} is now your default AI provider.`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to set default.",
        variant: "destructive",
      });
    } finally {
      setSettingDefault(null);
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
      {/* Env-key notice — shown when keys come from deployment env vars rather than user's own keys */}
      {(status?.gatewayAnthropic || status?.gatewayOpenai || status?.envAnthropic || status?.envOpenai) && (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-300">
            <span className="font-semibold">Deployment-level API key detected.</span>{" "}
            {(status?.gatewayAnthropic || status?.envAnthropic) && "Anthropic (Claude) "}
            {(status?.gatewayAnthropic || status?.envAnthropic) && (status?.gatewayOpenai || status?.envOpenai) && "and "}
            {(status?.gatewayOpenai || status?.envOpenai) && "OpenAI "}
            {((status?.gatewayAnthropic || status?.envAnthropic) || (status?.gatewayOpenai || status?.envOpenai)) && "are available via deployment env vars. Add your own key above for dedicated access."}
          </p>
        </div>
      )}
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
          const isDefault = status?.defaultProvider === integration.defaultProvider && !!integration.defaultProvider;
          const isEnvKey =
            (integration.id === "anthropicKey" && (status?.gatewayAnthropic || status?.envAnthropic)) ||
            (integration.id === "openaiKey" && (status?.gatewayOpenai || status?.envOpenai));
          return (
            <Card key={integration.id} className={isDefault ? "ring-2 ring-primary/30" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">{integration.icon}</div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {integration.title}
                        {isDefault && (
                          <Badge variant="default" className="bg-primary text-[10px] h-5 px-1.5">
                            <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {integration.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant={isConnected ? "default" : "outline"}
                    className={isConnected ? (isEnvKey ? "bg-blue-500" : "bg-green-500") : ""}
                  >
                    {isConnected ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {isEnvKey ? "Env Key" : "Connected"}
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
                  <div className="flex items-center gap-1">
                    {/* Set as Default button for AI model keys */}
                    {isConnected && integration.defaultModel && !isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleSetDefault(integration)}
                        disabled={settingDefault === integration.id}
                      >
                        {settingDefault === integration.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Star className="h-3 w-3" />
                        )}
                        Set Default
                      </Button>
                    )}
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
