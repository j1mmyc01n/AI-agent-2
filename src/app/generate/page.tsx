"use client";

import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Lightbulb,
  Layers,
  FileText,
  Code2,
  GitBranch,
  Layout,
  Bug,
  Sparkles,
  Loader2,
  Copy,
  CheckCheck,
  ChevronRight,
} from "lucide-react";

// ──────────────────────────────────────────────
// Template metadata (mirrors server-side TEMPLATES)
// ──────────────────────────────────────────────

const TEMPLATES = [
  {
    key: "saas-dashboard",
    label: "SaaS Dashboard Template",
    description: "Generate a full SaaS dashboard blueprint using DoBetter design tokens and hierarchy.",
    icon: Lightbulb,
    placeholder: "Describe the SaaS domain, core modules, and business model",
    color: "text-yellow-500",
  },
  {
    key: "ecommerce",
    label: "E-Commerce Template",
    description: "Generate commerce architecture, data model, route map, and UX structure.",
    icon: Layers,
    placeholder: "Describe the store type, catalog size, checkout needs, and ops flow",
    color: "text-blue-500",
  },
  {
    key: "ai-tool",
    label: "AI Tool Template",
    description: "Generate a streaming AI tool architecture and interaction model.",
    icon: Layout,
    placeholder: "Describe the AI workflow, model routing needs, and user lifecycle",
    color: "text-green-500",
  },
  {
    key: "blog-cms",
    label: "Blog / CMS Template",
    description: "Generate editorial CMS structure with content workflow and publishing rules.",
    icon: GitBranch,
    placeholder: "Describe content types, publishing flow, and team roles",
    color: "text-purple-500",
  },
  {
    key: "booking-app",
    label: "Booking App Template",
    description: "Generate scheduling architecture, availability logic, and booking UX.",
    icon: FileText,
    placeholder: "Describe services, booking constraints, and customer journey",
    color: "text-orange-500",
  },
  {
    key: "static-landing",
    label: "Static / Landing Template",
    description: "Generate high-conversion landing page architecture with analytics-ready sections.",
    icon: Code2,
    placeholder: "Describe positioning, audience, and conversion goals",
    color: "text-pink-500",
  },
  {
    key: "pwa-mobile",
    label: "PWA / Mobile-First Template",
    description: "Generate installable mobile-first app architecture with offline strategy.",
    icon: Sparkles,
    placeholder: "Describe mobile workflows, offline needs, and notification requirements",
    color: "text-cyan-500",
  },
  {
    key: "design-system",
    label: "DoBetter Design System Template",
    description: "Generate UI rules/tokens/components aligned to DOBETTER DESIGN SYSTEM v2.",
    icon: Bug,
    placeholder: "Describe the product type and UI surfaces that need the design-system spec",
    color: "text-red-500",
  },
] as const;

type TemplateKey = (typeof TEMPLATES)[number]["key"];

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function GeneratePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const tmpl = TEMPLATES.find((t) => t.key === selectedTemplate);

  const handleGenerate = async () => {
    if (!selectedTemplate || !prompt.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: selectedTemplate, prompt: prompt.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Generation failed. Please try again.");
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("Streaming not supported by browser.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text" && data.content) {
              setOutput(prev => prev + data.content);
            } else if (data.type === "error") {
              setError(data.content || "Generation failed.");
            }
            // type "done" — just let the loop finish
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    } catch (err) {
      console.error("Generation request failed:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSelectedTemplate(null);
    setPrompt("");
    setOutput("");
    setError("");
  };

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Generate
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Use AI templates to build your SaaS product — from idea to launch-ready assets.
            </p>
          </div>

          {/* Template Picker */}
          {!selectedTemplate && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                return (
                  <Card
                    key={t.key}
                    className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group"
                    onClick={() => setSelectedTemplate(t.key)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 rounded-lg bg-muted ${t.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardTitle className="text-sm leading-snug mt-2">{t.label}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Prompt + Output */}
          {selectedTemplate && tmpl && (
            <div className="space-y-6">
              {/* Selected template indicator */}
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1">
                  ← Back
                </Button>
                <Badge variant="secondary" className="gap-1">
                  <tmpl.icon className={`h-3 w-3 ${tmpl.color}`} />
                  {tmpl.label}
                </Badge>
              </div>

              {/* Input card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your Input</CardTitle>
                  <CardDescription className="text-xs">{tmpl.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={tmpl.placeholder}
                    rows={5}
                    className="resize-none"
                    disabled={loading}
                  />
                  {error && (
                    <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                      {error}
                    </div>
                  )}
                  <Button
                    onClick={handleGenerate}
                    disabled={loading || !prompt.trim()}
                    className="w-full sm:w-auto gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Generate
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Output card */}
              {output && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Result</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopy}
                          className="gap-1"
                        >
                          {copied ? (
                            <>
                              <CheckCheck className="h-3 w-3" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerate}
                          disabled={loading}
                          className="gap-1"
                        >
                          <Sparkles className="h-3 w-3" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="whitespace-pre-wrap text-sm font-mono bg-muted/50 rounded-lg p-4 overflow-auto max-h-[600px]">
                      {output}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
