import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

interface BlobProject {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  githubRepo: string | null;
  vercelUrl: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

async function getBlobProjects(userId: string): Promise<BlobProject[]> {
  try {
    const store = getStore("projects");
    const existing = await store.get(`user:${userId}`, { type: "json" }) as BlobProject[] | null;
    return existing || [];
  } catch {
    return [];
  }
}

async function saveBlobProjects(userId: string, projects: BlobProject[]): Promise<void> {
  const store = getStore("projects");
  await store.setJSON(`user:${userId}`, projects);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const project = await db.project.findFirst({
        where: { id, userId },
      });
      if (project) {
        return NextResponse.json(project);
      }
    } catch (error) {
      console.error("DB error in GET /api/projects/[id]:", error);
    }
  }

  // Fallback to Blobs
  try {
    const projects = await getBlobProjects(userId);
    const project = projects.find((p) => p.id === id);
    if (project) {
      return NextResponse.json(project);
    }
  } catch (error) {
    console.error("Blobs error in GET /api/projects/[id]:", error);
  }

  return NextResponse.json({ error: "Project not found" }, { status: 404 });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;
  const body = await req.json();
  const { name } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (getDatabaseUrl()) {
    try {
      const project = await db.project.updateMany({
        where: { id, userId },
        data: { name: name.trim(), updatedAt: new Date() },
      });
      if (project.count === 0) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("DB error in PATCH /api/projects/[id]:", error);
    }
  }

  // Fallback to Blobs
  try {
    const projects = await getBlobProjects(userId);
    const project = projects.find((p) => p.id === id);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    project.name = name.trim();
    project.updatedAt = new Date().toISOString();
    await saveBlobProjects(userId, projects);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blobs error in PATCH /api/projects/[id]:", error);
    return NextResponse.json({ error: "Failed to rename project" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;
  const { id } = await params;

  if (getDatabaseUrl()) {
    try {
      await db.project.deleteMany({ where: { id, userId } });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("DB error in DELETE /api/projects/[id]:", error);
    }
  }

  // Fallback to Blobs
  try {
    const projects = await getBlobProjects(userId);
    const filtered = projects.filter((p) => p.id !== id);
    await saveBlobProjects(userId, filtered);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blobs error in DELETE /api/projects/[id]:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
