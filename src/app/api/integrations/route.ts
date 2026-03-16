import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  // If database is not configured (including Netlify variables), use session-stored keys
  if (!getDatabaseUrl()) {
    const sessionData = session as any;
    return NextResponse.json({
      openaiKey: maskSecret(sessionData.openaiKey),
      githubToken: maskSecret(sessionData.githubToken),
      vercelToken: maskSecret(sessionData.vercelToken),
      tavilyKey: maskSecret(sessionData.tavilyKey),
      neonKey: maskSecret(sessionData.neonKey),
      netlifyToken: maskSecret(sessionData.netlifyToken),
      hasOpenaiKey: !!sessionData.openaiKey,
      hasGithubToken: !!sessionData.githubToken,
      hasVercelToken: !!sessionData.vercelToken,
      hasTavilyKey: !!sessionData.tavilyKey,
      hasNeonKey: !!sessionData.neonKey,
      hasNetlifyToken: !!sessionData.netlifyToken,
    });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        openaiKey: true,
        githubToken: true,
        vercelToken: true,
        tavilyKey: true,
        neonKey: true,
        netlifyToken: true,
      },
    });

    return NextResponse.json({
      openaiKey: maskSecret(user?.openaiKey),
      githubToken: maskSecret(user?.githubToken),
      vercelToken: maskSecret(user?.vercelToken),
      tavilyKey: maskSecret(user?.tavilyKey),
      neonKey: maskSecret(user?.neonKey),
      netlifyToken: maskSecret(user?.netlifyToken),
      hasOpenaiKey: !!user?.openaiKey,
      hasGithubToken: !!user?.githubToken,
      hasVercelToken: !!user?.vercelToken,
      hasTavilyKey: !!user?.tavilyKey,
      hasNeonKey: !!user?.neonKey,
      hasNetlifyToken: !!user?.netlifyToken,
    });
  } catch (error) {
    console.error("Database error in GET /api/integrations:", error);
    // Fallback to empty keys if database fails
    return NextResponse.json({
      openaiKey: null,
      githubToken: null,
      vercelToken: null,
      tavilyKey: null,
      neonKey: null,
      netlifyToken: null,
      hasOpenaiKey: false,
      hasGithubToken: false,
      hasVercelToken: false,
      hasTavilyKey: false,
      hasNeonKey: false,
      hasNetlifyToken: false,
    });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { openaiKey, githubToken, vercelToken, tavilyKey, neonKey, netlifyToken } = body;

  const updateData: Record<string, string | null> = {};

  // Only update fields that were explicitly provided (not masked values)
  if (openaiKey !== undefined && !openaiKey.includes("••••")) {
    updateData.openaiKey = openaiKey || null;
  }
  if (githubToken !== undefined && !githubToken.includes("••••")) {
    updateData.githubToken = githubToken || null;
  }
  if (vercelToken !== undefined && !vercelToken.includes("••••")) {
    updateData.vercelToken = vercelToken || null;
  }
  if (tavilyKey !== undefined && !tavilyKey.includes("••••")) {
    updateData.tavilyKey = tavilyKey || null;
  }
  if (neonKey !== undefined && !neonKey.includes("••••")) {
    updateData.neonKey = neonKey || null;
  }
  if (netlifyToken !== undefined && !netlifyToken.includes("••••")) {
    updateData.netlifyToken = netlifyToken || null;
  }

  // If database is not configured (including Netlify variables), we cannot persist the keys
  // Return a message informing the user
  if (!getDatabaseUrl()) {
    return NextResponse.json({
      success: false,
      error: "Database not configured. API keys cannot be persisted. Please set up a DATABASE_URL to save your integrations permanently.",
      message: "To use AI features, you'll need to set up a database. See TEST_ADMIN.md for instructions."
    }, { status: 503 });
  }

  try {
    await db.user.update({ where: { id: userId }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database error in POST /api/integrations:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to save integrations to database",
      message: "Database connection failed. Please check your DATABASE_URL configuration."
    }, { status: 500 });
  }
}
