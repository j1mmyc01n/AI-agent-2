import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const conversation = await db.conversation.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });

      if (conversation) {
        return NextResponse.json(conversation);
      }
    } catch (error) {
      console.error("Database error in GET /api/conversations/[id]:", error);
      // Fall through to Blobs
    }
  }

  // Fallback: check Blobs for conversation metadata and messages
  try {
    const store = getStore("conversations");
    const convList = await store.get(`user:${userId}`, { type: "json" }) as { id: string; title: string; projectId?: string | null; userId: string; createdAt: string; updatedAt: string; messageCount: number }[] | null;
    const conv = convList?.find(c => c.id === id);
    if (conv) {
      // Try to load messages from Blobs
      let messages: { role: string; content: string; createdAt: string }[] = [];
      try {
        const msgStore = getStore("conversation-messages");
        const storedMessages = await msgStore.get(`conv:${id}`, { type: "json" }) as typeof messages | null;
        if (storedMessages) messages = storedMessages;
      } catch {
        // Messages not available in blobs
      }
      return NextResponse.json({
        ...conv,
        messages,
        _count: { messages: messages.length || conv.messageCount || 0 },
      });
    }
  } catch {
    // Blobs not available
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const conversation = await db.conversation.findFirst({
        where: { id, userId },
      });

      if (conversation) {
        await db.conversation.delete({ where: { id } });
        return NextResponse.json({ success: true });
      }
    } catch (error) {
      console.error("Database error in DELETE /api/conversations/[id]:", error);
      // Fall through to Blobs
    }
  }

  // Fallback to Blobs
  try {
    const store = getStore("conversations");
    const existing = await store.get(`user:${userId}`, { type: "json" }) as { id: string }[] || [];
    const existingArr = Array.isArray(existing) ? existing : [];
    const filtered = existingArr.filter(c => c.id !== id);
    await store.setJSON(`user:${userId}`, filtered);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
