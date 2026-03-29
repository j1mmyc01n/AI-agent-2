"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Loader2,
  ArrowRight,
  Database,
  Key,
  Zap,
  Code2,
  Shield,
  Copy,
  CheckCheck,
  RotateCcw,
} from "lucide-react";

interface SetupResult {
  url: string;
  siteName: string;
  siteCategory: string;
  apiPathways: string[];
  authMethod: string;
  fallbackStrategy: string;
  envVars: { key: string; description: string }[];
  dbEntities: { name: string; fields: string[] }[];
  agentActions: string[];
  uiModule: string;
}

export default function ConnectivityPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/connectivity-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }
      setResult(data);
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setUrl("");
    setResult(null);
    setError("");
  };

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Globe className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Connectivity Setup
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Enter a website URL to generate an integration blueprint with API pathways, auth methods, and connector specs.
            </p>
          </div>

          {/* URL Input */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="https://example.com or example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={loading}
                    onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                    className="h-11 text-base"
                  />
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={loading || !url.trim()}
                  className="h-11 gap-2 px-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      Generate
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-3">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {result && (
            <div className="space-y-6">
              {/* Header + Actions */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{result.siteName}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary">{result.siteCategory}</Badge>
                    <span className="text-xs text-muted-foreground">{result.url}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                    {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy JSON"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleReset} className="gap-1">
                    <RotateCcw className="h-3 w-3" />
                    New
                  </Button>
                </div>
              </div>

              {/* API Pathways */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    API Pathways
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.apiPathways.map((p, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary font-mono text-xs mt-0.5">{i + 1}.</span>
                        <span>{p}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Auth + Fallback */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      Auth Method
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{result.authMethod}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-4 w-4 text-orange-500" />
                      Fallback Strategy
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{result.fallbackStrategy}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Env Vars */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Key className="h-4 w-4 text-yellow-500" />
                    Environment Variables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.envVars.map((v, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
                        <code className="text-xs font-mono bg-background px-2 py-1 rounded border shrink-0">
                          {v.key}
                        </code>
                        <span className="text-xs text-muted-foreground">{v.description}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* DB Entities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    Database Entities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.dbEntities.map((entity, i) => (
                      <div key={i} className="p-3 rounded-lg border bg-muted/30">
                        <p className="font-mono text-sm font-semibold mb-2">{entity.name}</p>
                        <div className="flex flex-wrap gap-1">
                          {entity.fields.map((f, j) => (
                            <Badge key={j} variant="outline" className="text-xs font-mono">
                              {f}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-emerald-500" />
                    Agent Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.agentActions.map((action, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-muted/30">
                        <Zap className="h-3 w-3 text-emerald-500 shrink-0" />
                        {action}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* UI Module */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-pink-500" />
                    UI Module
                  </CardTitle>
                  <CardDescription className="text-xs">Suggested connector component</CardDescription>
                </CardHeader>
                <CardContent>
                  <code className="text-sm font-mono bg-muted px-3 py-2 rounded-lg block">
                    {result.uiModule}
                  </code>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div className="text-center py-16">
              <Globe className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h2 className="text-lg font-semibold mb-2">Generate an Integration Blueprint</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Enter any website URL above to generate a connectivity setup with API pathways,
                authentication methods, database entities, and agent actions.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {["stripe.com", "github.com", "shopify.com", "notion.so"].map((example) => (
                  <Button
                    key={example}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setUrl(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
