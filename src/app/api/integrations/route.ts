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

  if (!getDatabaseUrl()) {
    const sessionData = session as unknown as Record<string, unknown>;
    return NextResponse.json({
      openaiKey: maskSecret(sessionData.openaiKey as string),
      anthropicKey: maskSecret(sessionData.anthropicKey as string),
      grokKey: maskSecret(sessionData.grokKey as string),
      githubToken: maskSecret(sessionData.githubToken as string),
      vercelToken: maskSecret(sessionData.vercelToken as string),
      tavilyKey: maskSecret(sessionData.tavilyKey as string),
      neonKey: maskSecret(sessionData.neonKey as string),
      netlifyToken: maskSecret(sessionData.netlifyToken as string),
      hasOpenaiKey: !!sessionData.openaiKey,
      hasAnthropicKey: !!sessionData.anthropicKey,
      hasGrokKey: !!sessionData.grokKey,
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
        anthropicKey: true,
        grokKey: true,
        githubToken: true,
        vercelToken: true,
        tavilyKey: true,
        neonKey: true,
        netlifyToken: true,
      },
    });

    return NextResponse.json({
      openaiKey: maskSecret(user?.openaiKey),
      anthropicKey: maskSecret(user?.anthropicKey),
      grokKey: maskSecret(user?.grokKey),
      githubToken: maskSecret(user?.githubToken),
      vercelToken: maskSecret(user?.vercelToken),
      tavilyKey: maskSecret(user?.tavilyKey),
      neonKey: maskSecret(user?.neonKey),
      netlifyToken: maskSecret(user?.netlifyToken),
      hasOpenaiKey: !!user?.openaiKey,
      hasAnthropicKey: !!user?.anthropicKey,
      hasGrokKey: !!user?.grokKey,
      hasGithubToken: !!user?.githubToken,
      hasVercelToken: !!user?.vercelToken,
      hasTavilyKey: !!user?.tavilyKey,
      hasNeonKey: !!user?.neonKey,
      hasNetlifyToken: !!user?.netlifyToken,
    });
  } catch (error) {
    console.error("Database error in GET /api/integrations:", error);
    return NextResponse.json({
      openaiKey: null,
      anthropicKey: null,
      grokKey: null,
      githubToken: null,
      vercelToken: null,
      tavilyKey: null,
      neonKey: null,
      netlifyToken: null,
      hasOpenaiKey: false,
      hasAnthropicKey: false,
      hasGrokKey: false,
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
  const { openaiKey, anthropicKey, grokKey, githubToken, vercelToken, tavilyKey, neonKey, netlifyToken } = body as Record<string, string | undefined>;

  const updateData: Record<string, string | null> = {};

  const shouldUpdate = (val: string | undefined) => val !== undefined && !val.includes("••••");

  if (shouldUpdate(openaiKey)) updateData.openaiKey = openaiKey || null;
  if (shouldUpdate(anthropicKey)) updateData.anthropicKey = anthropicKey || null;
  if (shouldUpdate(grokKey)) updateData.grokKey = grokKey || null;
  if (shouldUpdate(githubToken)) updateData.githubToken = githubToken || null;
  if (shouldUpdate(vercelToken)) updateData.vercelToken = vercelToken || null;
  if (shouldUpdate(tavilyKey)) updateData.tavilyKey = tavilyKey || null;
  if (shouldUpdate(neonKey)) updateData.neonKey = neonKey || null;
  if (shouldUpdate(netlifyToken)) updateData.netlifyToken = netlifyToken || null;

  if (!getDatabaseUrl()) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Database not configured. API keys cannot be persisted. Please set up a DATABASE_URL to save your integrations permanently.",
        message:
          "To use AI features, you'll need to set up a database. See TEST_ADMIN.md for instructions.",
      },
      { status: 503 }
    );
  }

  try {
    await db.user.update({ where: { id: userId }, data: updateData });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Database error in POST /api/integrations:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save integrations to database",
        message: "Database connection failed. Please check your DATABASE_URL configuration.",
      },
      { status: 500 }
    );
  }
}
