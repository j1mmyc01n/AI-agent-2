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
    const indexKey = `user:${userId}`;
    const nowIso = new Date().toISOString();
    const artifactTitle = title || "Untitled Project";
    const existing = await store.get(indexKey, { type: "json" }) as { id: string; title: string; fileCount: number; createdAt: string }[] || [];
    const existingArr = Array.isArray(existing) ? existing : [];

    // Reuse an existing artifact for the same project/title when possible.
    let artifactId = "";
    let updatedExisting = false;
    const desiredProjectId = projectId || null;
    for (const entry of existingArr.slice(0, 20)) {
      if (entry.title !== artifactTitle) continue;
      const candidate = await store.get(entry.id, { type: "json" }) as { projectId?: string | null; createdAt?: string } | null;
      if (!candidate) continue;
      if ((candidate.projectId ?? null) === desiredProjectId) {
        artifactId = entry.id;
        updatedExisting = true;
        break;
      }
    }

    if (!artifactId) {
      artifactId = `art_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }

    const existingArtifact = updatedExisting
      ? await store.get(artifactId, { type: "json" }) as Record<string, unknown> | null
      : null;

    const artifact = {
      id: artifactId,
      userId,
      projectId: desiredProjectId,
      title: artifactTitle,
      type: "code",
      files,
      createdAt: (existingArtifact?.createdAt as string) || nowIso,
      updatedAt: nowIso,
    };

    await store.setJSON(artifactId, artifact);

    const existingIndexEntry = existingArr.find((e) => e.id === artifactId);
    if (existingIndexEntry) {
      existingIndexEntry.fileCount = files.length;
      existingIndexEntry.title = artifactTitle;
    } else {
      existingArr.unshift({ id: artifactId, title: artifactTitle, fileCount: files.length, createdAt: artifact.createdAt });
    }
    await store.setJSON(indexKey, existingArr);

    return NextResponse.json({ id: artifactId, fileCount: files.length });
  } catch (error) {
    console.error("Failed to save artifact:", error);
    return NextResponse.json({ error: "Failed to save artifact" }, { status: 500 });
  }
}
