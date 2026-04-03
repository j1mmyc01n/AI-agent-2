import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

interface BlobConversation {
  id: string;
  title: string;
  projectId?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

async function getBlobConversations(userId: string): Promise<BlobConversation[]> {
  try {
    const store = getStore("conversations");
    const data = await store.get(`user:${userId}`, { type: "json" }) as BlobConversation[] | null;
    return data || [];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const conversations = await db.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          projectId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { messages: true } },
        },
      });

      return NextResponse.json(conversations);
    } catch (error) {
      console.error("Database error in GET /api/conversations:", error);
      // Fall through to Blobs
    }
  }

  // Fallback to Netlify Blobs
  const blobConversations = await getBlobConversations(userId);
  const formatted = blobConversations.map((c) => ({
    id: c.id,
    title: c.title,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    projectId: c.projectId || null,
    _count: { messages: c.messageCount || 0 },
  }));
  return NextResponse.json(formatted);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Conversation ID required" }, { status: 400 });
  }

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const conversation = await db.conversation.findFirst({ where: { id, userId } });
      if (!conversation) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await db.conversation.delete({ where: { id } });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Database error in DELETE /api/conversations:", error);
      // Fall through to Blobs
    }
  }

  // Fallback to Netlify Blobs
  try {
    const conversations = await getBlobConversations(userId);
    const filtered = conversations.filter((c) => c.id !== id);
    const store = getStore("conversations");
    await store.setJSON(`user:${userId}`, filtered);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
