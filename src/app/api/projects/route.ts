import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  // If database is not configured, return empty array
  if (!process.env.DATABASE_URL) {
    return NextResponse.json([]);
  }

  try {
    const projects = await db.project.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Database error in GET /api/projects:", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { name, description, type, githubRepo, vercelUrl } = body;

  if (!name) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  // If database is not configured, cannot save project
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      {
        error: "Database not configured. Projects cannot be saved.",
        message: "To save projects, please set up a DATABASE_URL. See TEST_ADMIN.md for instructions."
      },
      { status: 503 }
    );
  }

  try {
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
    console.error("Database error in POST /api/projects:", error);
    return NextResponse.json(
      { error: "Failed to save project" },
      { status: 500 }
    );
  }
}
