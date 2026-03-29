import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";
import ChatInterface from "@/components/chat/ChatInterface";
import { db, getDatabaseUrl } from "@/lib/db";

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

  // If no database and this is a local conversation, show empty chat with the ID preserved
  if (!getDatabaseUrl()) {
    return (
      <MainLayout currentConversationId={id}>
        <ChatInterface conversationId={id} />
      </MainLayout>
    );
  }

  let initialMessages: {
    id: string;
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    toolCalls: string | null;
  }[] = [];

  try {
    const conversation = await db.conversation.findFirst({
      where: { id, userId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      notFound();
    }

    initialMessages = conversation.messages.map((m) => ({
      id: m.id,
      role: m.role as "user" | "assistant" | "system" | "tool",
      content: m.content,
      toolCalls: m.toolCalls,
    }));
  } catch (err) {
    console.error("Conversation load error:", err);
    notFound();
  }

  return (
    <MainLayout currentConversationId={id}>
      <ChatInterface
        conversationId={id}
        initialMessages={initialMessages}
      />
    </MainLayout>
  );
}
