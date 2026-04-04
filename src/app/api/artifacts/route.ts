import { NextRequest, NextResponse } from "next/server";
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

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: { title?: string; files?: { path: string; content: string }[]; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { title, files, projectId } = body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  try {
    const store = getStore("artifacts");
    const artifactId = `art_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const artifact = {
      id: artifactId,
      userId,
      projectId: projectId || null,
      title: title || "Untitled Project",
      type: "code",
      files,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await store.setJSON(artifactId, artifact);

    // Add to user's artifact index
    const indexKey = `user:${userId}`;
    const existing = await store.get(indexKey, { type: "json" }) as { id: string; title: string; fileCount: number; createdAt: string }[] || [];
    existing.unshift({ id: artifactId, title: artifact.title, fileCount: files.length, createdAt: artifact.createdAt });
    await store.setJSON(indexKey, existing);

    return NextResponse.json({ id: artifactId, fileCount: files.length });
  } catch (error) {
    console.error("Failed to save artifact:", error);
    return NextResponse.json({ error: "Failed to save artifact" }, { status: 500 });
  }
}
