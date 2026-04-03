import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStore } from "@netlify/blobs";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  try {
    const store = getStore("artifacts");
    const index = await store.get(`user:${userId}`, { type: "json" }) as { id: string; title: string; fileCount: number; createdAt: string }[] | null;
    return NextResponse.json(index || []);
  } catch {
    return NextResponse.json([]);
  }
}
