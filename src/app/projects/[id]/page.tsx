import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  let project: { id: string; name: string; description: string | null; type: string; status: string } | null = null;

  // Try DB first
  if (getDatabaseUrl()) {
    try {
      project = await db.project.findFirst({
        where: { id, userId },
        select: { id: true, name: true, description: true, type: true, status: true },
      });
    } catch {
      // ignore
    }
  }

  // Fall back to Blobs
  if (!project) {
    try {
      const store = getStore("projects");
      const projects = await store.get(`user:${userId}`, { type: "json" }) as { id: string; name: string; description: string | null; type: string; status: string }[] | null;
      project = projects?.find(p => p.id === id) || null;
    } catch {
      // ignore
    }
  }

  if (!project) {
    notFound();
  }

  return (
    <MainLayout>
      <ChatInterface projectId={project.id} projectName={project.name} />
    </MainLayout>
  );
}
