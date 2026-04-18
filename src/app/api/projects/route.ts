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

const DUPLICATE_DETECTION_WINDOW_MS = 1000 * 60 * 60 * 6;

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

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const projects = await db.project.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json(projects);
    } catch (error) {
      console.error("Database error in GET /api/projects:", error);
      // Fall through to Blobs
    }
  }

  // Fallback to Netlify Blobs
  try {
    const projects = await getBlobProjects(userId);
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Blobs error in GET /api/projects:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined;
  const description = typeof body.description === "string" ? body.description : undefined;
  const type = typeof body.type === "string" ? body.type : undefined;
  const githubRepo = typeof body.githubRepo === "string" ? body.githubRepo : undefined;
  const vercelUrl = typeof body.vercelUrl === "string" ? body.vercelUrl : undefined;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  // Try database first
  if (getDatabaseUrl()) {
    try {
      const duplicateWindowStart = new Date(Date.now() - DUPLICATE_DETECTION_WINDOW_MS);
      const existingProject = await db.project.findFirst({
        where: {
          userId,
          name,
          type: type || "saas",
          updatedAt: { gte: duplicateWindowStart },
        },
        orderBy: { updatedAt: "desc" },
      });
      if (existingProject) {
        return NextResponse.json(existingProject, { status: 200 });
      }

      const project = await db.project.create({
        data: {
          name,
          description,
          type: type || "saas",
          githubRepo,
          vercelUrl,
          userId,
          status: "active",
        },
      });
      return NextResponse.json(project, { status: 201 });
    } catch (error) {
      console.error("Database error in POST /api/projects, falling back to Blobs:", error);
      // Fall through to Blobs
    }
  }

  // Fallback to Netlify Blobs
  try {
    const duplicateWindowStart = Date.now() - DUPLICATE_DETECTION_WINDOW_MS;
    const existing = await getBlobProjects(userId);
    const duplicate = existing.find((p) =>
      p.name === name &&
      p.type === (type || "saas") &&
      Number.isFinite(Date.parse(p.updatedAt)) &&
      Date.parse(p.updatedAt) >= duplicateWindowStart
    );
    if (duplicate) {
      return NextResponse.json(duplicate, { status: 200 });
    }

    const newProject: BlobProject = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name,
      description: description || null,
      type: type || "saas",
      status: "active",
      githubRepo: githubRepo || null,
      vercelUrl: vercelUrl || null,
      userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    existing.unshift(newProject);
    await saveBlobProjects(userId, existing);

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error("Blobs error in POST /api/projects:", error);
    return NextResponse.json(
      { error: "Failed to save project. Please try again." },
      { status: 500 }
    );
  }
}
