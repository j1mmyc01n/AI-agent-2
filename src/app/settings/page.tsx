import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import IntegrationsPanel from "@/components/settings/IntegrationsPanel";
import SettingsClient from "@/components/settings/SettingsClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getDatabaseUrl } from "@/lib/db";
import { Settings as SettingsIcon, Key, Plug, Database, CheckCircle2, AlertCircle } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const hasDb = !!getDatabaseUrl();

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8" />
              Settings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage your API keys, integrations, and connectivity settings
            </p>
          </div>

          {/* Quick Setup Wizard (client component) */}
          <SettingsClient />

          <Tabs defaultValue="ai-models" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai-models" className="gap-2">
                <Key className="h-4 w-4" />
                <span className="hidden sm:inline">AI Models</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2">
                <Plug className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
                <span className="sm:hidden">Apps</span>
              </TabsTrigger>
              <TabsTrigger value="storage" className="gap-2">
                <Database className="h-4 w-4" />
                <span className="hidden sm:inline">Storage</span>
                <span className="sm:hidden">DB</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai-models" className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">AI Model API Keys</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Configure API keys for AI models that power your agent
                </p>
                <IntegrationsPanel filter="ai-models" />
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">Service Integrations</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Connect external services like GitHub, Vercel, Netlify, and more
                </p>
                <IntegrationsPanel filter="integrations" />
              </div>
            </TabsContent>

            <TabsContent value="storage" className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">Storage & Database</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Database connection and storage mode configuration
                </p>

                {/* Current Status */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Connection Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`flex items-center gap-3 p-4 rounded-lg border ${
                      hasDb
                        ? "bg-green-500/10 border-green-500/20"
                        : "bg-yellow-500/10 border-yellow-500/20"
                    }`}>
                      {hasDb ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {hasDb ? "Cloud Database Connected" : "Local Mode Active"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {hasDb
                            ? "All data persisted to your PostgreSQL database."
                            : "Data stored in your browser using IndexedDB. Set DATABASE_URL to enable cloud sync."}
                        </p>
                      </div>
                      <Badge variant={hasDb ? "default" : "secondary"} className="ml-auto shrink-0">
                        {hasDb ? "Connected" : "Local"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Storage Modes Explanation */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Storage Modes</CardTitle>
                    <CardDescription className="text-xs">
                      DoBetter Viber supports three storage modes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        title: "Local-First (Browser)",
                        desc: "Default mode. Uses IndexedDB for persistence. Data stays in your browser.",
                        active: !hasDb,
                      },
                      {
                        title: "Platform Database",
                        desc: "Uses the Netlify-managed PostgreSQL database (Neon integration).",
                        active: hasDb,
                      },
                      {
                        title: "External Database",
                        desc: "Connect your own PostgreSQL by setting DATABASE_URL in environment variables.",
                        active: false,
                      },
                    ].map((mode) => (
                      <div
                        key={mode.title}
                        className={`p-3 rounded-lg border ${
                          mode.active ? "border-primary/50 bg-primary/5" : "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{mode.title}</p>
                          {mode.active && <Badge className="text-xs">Active</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{mode.desc}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Database Setup */}
                {!hasDb && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Connect a Database</CardTitle>
                      <CardDescription className="text-xs">
                        Set these environment variables in your Netlify dashboard
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <code className="text-xs font-mono text-primary">DATABASE_URL</code>
                          <p className="text-xs text-muted-foreground mt-1">
                            PostgreSQL connection string. Example: postgresql://user:pass@host:5432/db?sslmode=require
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <code className="text-xs font-mono text-primary">NEXTAUTH_SECRET</code>
                          <p className="text-xs text-muted-foreground mt-1">
                            JWT signing secret. Generate with: openssl rand -base64 32
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Connectivity Panel */}
                <div className="mt-6">
                  <IntegrationsPanel filter="connectivity" />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
