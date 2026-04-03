import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ init?: string }>;
}

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const isNewProject = resolvedSearch.init === "true";
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

  // Try to load the latest conversation for this project so the user sees their previous work
  let latestConversationId: string | undefined;
  let initialMessages: {
    id?: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCalls?: string | null;
  }[] = [];

  // Check DB for conversations linked to this project
  if (getDatabaseUrl()) {
    try {
      const conv = await db.conversation.findFirst({
        where: { userId, projectId: id },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (conv) {
        latestConversationId = conv.id;
        initialMessages = conv.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system" | "tool",
          content: m.content,
          toolCalls: m.toolCalls,
        }));
      }
    } catch {
      // ignore
    }
  }

  // Also check Blobs for conversations linked to this project
  if (!latestConversationId) {
    try {
      const convStore = getStore("conversations");
      const convList = await convStore.get(`user:${userId}`, { type: "json" }) as { id: string; projectId?: string | null; updatedAt: string }[] | null;
      const projectConvs = convList?.filter(c => c.projectId === id).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      if (projectConvs && projectConvs.length > 0) {
        latestConversationId = projectConvs[0].id;
        // Load messages from Blobs
        try {
          const msgStore = getStore("conversation-messages");
          const storedMessages = await msgStore.get(`conv:${latestConversationId}`, { type: "json" }) as { role: string; content: string; createdAt: string }[] | null;
          if (storedMessages && storedMessages.length > 0) {
            initialMessages = storedMessages.map((m, idx) => ({
              id: `blob-msg-${idx}`,
              role: m.role as "user" | "assistant" | "system" | "tool",
              content: m.content,
              toolCalls: null,
            }));
          }
        } catch {
          // Messages not available
        }
      }
    } catch {
      // ignore
    }
  }

  // Auto-init only when explicitly requested and the project truly has no history
  const shouldAutoInit = isNewProject && initialMessages.length === 0;

  return (
    <MainLayout>
      <ChatInterface
        conversationId={latestConversationId}
        initialMessages={initialMessages}
        projectId={project.id}
        projectName={project.name}
        projectDescription={project.description ?? undefined}
        projectType={project.type}
        autoInit={shouldAutoInit}
      />
    </MainLayout>
  );
}

