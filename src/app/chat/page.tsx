import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

interface ChatPageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const projectId = params.project;
  let projectName: string | undefined;

  // Look up project name if projectId provided
  if (projectId) {
    const userId = (session.user as { id: string }).id;

    // Try DB first
    if (getDatabaseUrl()) {
      try {
        const project = await db.project.findFirst({
          where: { id: projectId, userId },
          select: { name: true },
        });
        if (project) projectName = project.name;
      } catch {
        // ignore
      }
    }

    // Fall back to Blobs
    if (!projectName) {
      try {
        const store = getStore("projects");
        const projects = await store.get(`user:${userId}`, { type: "json" }) as { id: string; name: string }[] | null;
        const proj = projects?.find(p => p.id === projectId);
        if (proj) projectName = proj.name;
      } catch {
        // ignore
      }
    }
  }

  return (
    <MainLayout>
      <ChatInterface projectId={projectId} projectName={projectName} />
    </MainLayout>
  );
}
