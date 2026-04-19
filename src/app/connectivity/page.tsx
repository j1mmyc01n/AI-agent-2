"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Loader2,
  Github,
  Zap,
  Cloud,
  Bot,
  Cpu,
  Database,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X,
} from "lucide-react";

interface ConnectorConfig {
  id: string;
  title: string;
  icon: React.ReactNode;
  statusKey: string;
  valueKey: string;
  placeholder: string;
  helpUrl: string;
  helpLabel: string;
  category: "ai" | "deploy" | "data";
  description: string;
}

const connectors: ConnectorConfig[] = [
  {
    id: "github",
    title: "GitHub",
    icon: <Github className="h-5 w-5" />,
    statusKey: "hasGithubToken",
    valueKey: "githubToken",
    placeholder: "ghp_...",
    helpUrl: "https://github.com/settings/tokens",
    helpLabel: "Create token",
    category: "deploy",
    description: "Push code to repositories",
  },
  {
    id: "vercel",
    title: "Vercel",
    icon: <Zap className="h-5 w-5" />,
    statusKey: "hasVercelToken",
    valueKey: "vercelToken",
    placeholder: "Paste token...",
    helpUrl: "https://vercel.com/account/tokens",
    helpLabel: "Create token",
    category: "deploy",
    description: "Deploy projects live",
  },
  {
    id: "netlify",
    title: "Netlify",
    icon: <Cloud className="h-5 w-5" />,
    statusKey: "hasNetlifyToken",
    valueKey: "netlifyToken",
    placeholder: "Paste token...",
    helpUrl: "https://app.netlify.com/user/applications",
    helpLabel: "Create token",
    category: "deploy",
    description: "Host on Netlify",
  },
  {
    id: "openai",
    title: "OpenAI",
    icon: <Bot className="h-5 w-5" />,
    statusKey: "hasOpenaiKey",
    valueKey: "openaiKey",
    placeholder: "sk-...",
    helpUrl: "https://platform.openai.com/api-keys",
    helpLabel: "Get key",
    category: "ai",
    description: "GPT-4o, GPT-4 Turbo",
  },
  {
    id: "anthropic",
    title: "Anthropic",
    icon: <Cpu className="h-5 w-5" />,
    statusKey: "hasAnthropicKey",
    valueKey: "anthropicKey",
    placeholder: "sk-ant-...",
    helpUrl: "https://console.anthropic.com/settings/keys",
    helpLabel: "Get key",
    category: "ai",
    description: "Claude models",
  },
  {
    id: "grok",
    title: "xAI (Grok)",
    icon: <Zap className="h-5 w-5" />,
    statusKey: "hasGrokKey",
    valueKey: "grokKey",
    placeholder: "xai-...",
    helpUrl: "https://console.x.ai/",
    helpLabel: "Get key",
    category: "ai",
    description: "Grok 2 models",
  },
  {
    id: "tavily",
    title: "Tavily",
    icon: <Globe className="h-5 w-5" />,
    statusKey: "hasTavilyKey",
    valueKey: "tavilyKey",
    placeholder: "tvly-...",
    helpUrl: "https://app.tavily.com/home",
    helpLabel: "Get key",
    category: "data",
    description: "Web search for agent",
  },
  {
    id: "neon",
    title: "Neon DB",
    icon: <Database className="h-5 w-5" />,
    statusKey: "hasNeonKey",
    valueKey: "neonKey",
    placeholder: "Paste key...",
    helpUrl: "https://neon.tech/docs/get-started-with-neon/api-keys",
    helpLabel: "Get key",
    category: "data",
    description: "PostgreSQL database",
  },
];

type StatusMap = Record<string, boolean | string | null>;

export default function ConnectivityPage() {
  const [status, setStatus] = useState<StatusMap>({});
  const [loading, setLoading] = useState(true);
  const [activeConnector, setActiveConnector] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (res.ok) {
          const data = await res.json();
          setStatus(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const handleConnect = async (connector: ConnectorConfig) => {
    if (!inputValue.trim()) return;
    setSaving(true);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [connector.valueKey]: inputValue.trim() }),
      });

      if (res.ok) {
        // Refresh status
        const statusRes = await fetch("/api/integrations");
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data);
        }
        setActiveConnector(null);
        setInputValue("");
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (connector: ConnectorConfig) => {
    setSaving(true);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [connector.valueKey]: "" }),
      });
      if (res.ok) {
        const statusRes = await fetch("/api/integrations");
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data);
        }
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const categories = [
    { id: "deploy", label: "Deploy & Source", description: "Connect code and hosting" },
    { id: "ai", label: "AI Models", description: "Optional - works without keys" },
    { id: "data", label: "Data & Search", description: "Optional enhancements" },
  ];

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  const connectedCount = connectors.filter((c) => status[c.statusKey]).length;

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 text-primary" />
              Connectivity
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {connectedCount} of {connectors.length} connected. Tap a service to set up.
            </p>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            {categories.map((cat) => {
              const catConnectors = connectors.filter(
                (c) => c.category === cat.id
              );
              return (
                <div key={cat.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-sm font-semibold">{cat.label}</h2>
                      <p className="text-xs text-muted-foreground">
                        {cat.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {catConnectors.filter((c) => status[c.statusKey]).length}/{catConnectors.length}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {catConnectors.map((connector) => {
                      const isConnected = !!status[connector.statusKey];
                      const isActive = activeConnector === connector.id;

                      return (
                        <div
                          key={connector.id}
                          className={`rounded-lg border transition-all ${
                            isActive
                              ? "border-primary/40 bg-primary/5"
                              : isConnected
                                ? "border-green-500/20 bg-green-500/5"
                                : "border-border/50 hover:border-border"
                          }`}
                        >
                          {/* Connector row */}
                          <button
                            onClick={() => {
                              if (isActive) {
                                setActiveConnector(null);
                                setInputValue("");
                              } else {
                                setActiveConnector(connector.id);
                                setInputValue("");
                              }
                            }}
                            className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
                          >
                            <div
                              className={`p-2 rounded-lg shrink-0 ${
                                isConnected
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {connector.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">
                                  {connector.title}
                                </span>
                                {isConnected && (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {connector.description}
                              </p>
                            </div>
                            {!isConnected && !isActive && (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            {isConnected && !isActive && (
                              <Badge
                                variant="outline"
                                className="text-[10px] border-green-500/30 text-green-500 shrink-0"
                              >
                                Connected
                              </Badge>
                            )}
                            {isActive && (
                              <X className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </button>

                          {/* Expanded setup form */}
                          {isActive && (
                            <div className="px-3 pb-3 space-y-2">
                              <div className="flex items-center gap-2">
                                <a
                                  href={connector.helpUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  {connector.helpLabel}
                                </a>
                                <span className="text-xs text-muted-foreground">
                                  then paste below
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  type="password"
                                  placeholder={connector.placeholder}
                                  value={inputValue}
                                  onChange={(e) =>
                                    setInputValue(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    e.key === "Enter" &&
                                    handleConnect(connector)
                                  }
                                  className="font-mono text-sm h-9"
                                  autoFocus
                                />
                                <Button
                                  onClick={() => handleConnect(connector)}
                                  disabled={
                                    !inputValue.trim() || saving
                                  }
                                  size="sm"
                                  className="h-9 gap-1 px-4"
                                >
                                  {saving ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <ArrowRight className="h-3 w-3" />
                                  )}
                                  Save
                                </Button>
                              </div>
                              {isConnected && (
                                <button
                                  onClick={() =>
                                    handleDisconnect(connector)
                                  }
                                  className="text-xs text-destructive hover:underline"
                                >
                                  Disconnect
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-8">
            Keys are encrypted and stored securely per user account.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
