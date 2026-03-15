import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import IntegrationsPanel from "@/components/settings/IntegrationsPanel";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Manage your integrations and API keys
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Integrations</h2>
            <IntegrationsPanel />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
