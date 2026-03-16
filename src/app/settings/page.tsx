import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import IntegrationsPanel from "@/components/settings/IntegrationsPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, Key, Plug, Database } from "lucide-react";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

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

          <Tabs defaultValue="ai-models" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
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
              <TabsTrigger value="connectivity" className="gap-2 hidden lg:flex">
                <Database className="h-4 w-4" />
                Connectivity
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

            <TabsContent value="connectivity" className="space-y-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold mb-2">Connectivity Settings</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4">
                  Database and infrastructure connectivity options
                </p>
                <IntegrationsPanel filter="connectivity" />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
