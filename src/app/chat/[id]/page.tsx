import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  let initialMessages: {
    id?: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCalls?: string | null;
  }[] = [];

  let projectId: string | undefined;
  let projectName: string | undefined;

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const conversation = await db.conversation.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (conversation) {
        initialMessages = conversation.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant" | "system" | "tool",
          content: m.content,
          toolCalls: m.toolCalls,
        }));
        // Get projectId from the conversation record
        if ((conversation as { projectId?: string | null }).projectId) {
          projectId = (conversation as { projectId?: string | null }).projectId!;
        }
      }
    } catch (err) {
      console.error("Conversation load error:", err);
    }
  }

  // If no messages from DB, try Blobs
  if (initialMessages.length === 0) {
    try {
      const msgStore = getStore("conversation-messages");
      const storedMessages = await msgStore.get(`conv:${id}`, { type: "json" }) as { role: string; content: string; createdAt: string }[] | null;
      if (storedMessages && storedMessages.length > 0) {
        initialMessages = storedMessages.map((m, idx) => ({
          id: `blob-msg-${idx}`,
          role: m.role as "user" | "assistant" | "system" | "tool",
          content: m.content,
          toolCalls: null,
        }));
      }
    } catch {
      // Blobs not available — show empty chat
    }
  }

  // Try to get project info from conversation metadata (Blobs)
  if (!projectId) {
    try {
      const convStore = getStore("conversations");
      const convList = await convStore.get(`user:${userId}`, { type: "json" }) as { id: string; projectId?: string | null }[] | null;
      const conv = convList?.find(c => c.id === id);
      if (conv?.projectId) {
        projectId = conv.projectId;
      }
    } catch {
      // Non-critical
    }
  }

  // Look up project name if we have a projectId
  if (projectId) {
    if (getDatabaseUrl()) {
      try {
        const project = await db.project.findFirst({
          where: { id: projectId, userId },
          select: { name: true },
        });
        if (project) projectName = project.name;
      } catch { /* ignore */ }
    }
    if (!projectName) {
      try {
        const projStore = getStore("projects");
        const projects = await projStore.get(`user:${userId}`, { type: "json" }) as { id: string; name: string }[] | null;
        const proj = projects?.find(p => p.id === projectId);
        if (proj) projectName = proj.name;
      } catch { /* ignore */ }
    }
  }

  return (
    <MainLayout currentConversationId={id}>
      <ChatInterface
        conversationId={id}
        initialMessages={initialMessages}
        projectId={projectId}
        projectName={projectName}
      />
    </MainLayout>
  );
}
