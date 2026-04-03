import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStore } from "@netlify/blobs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const store = getStore("artifacts");
    const artifact = await store.get(id, { type: "json" }) as {
      id: string;
      userId: string;
      projectId: string | null;
      title: string;
      type: string;
      files: { path: string; content: string }[];
      createdAt: string;
      updatedAt: string;
    } | null;

    if (!artifact) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const userId = (session.user as { id: string }).id;
    if (artifact.userId !== userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(artifact);
  } catch {
    return NextResponse.json({ error: "Failed to load artifact" }, { status: 500 });
  }
}
