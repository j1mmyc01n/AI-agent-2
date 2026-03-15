import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

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

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      openaiKey: true,
      githubToken: true,
      vercelToken: true,
      tavilyKey: true,
    },
  });

  return NextResponse.json({
    openaiKey: maskSecret(user?.openaiKey),
    githubToken: maskSecret(user?.githubToken),
    vercelToken: maskSecret(user?.vercelToken),
    tavilyKey: maskSecret(user?.tavilyKey),
    hasOpenaiKey: !!user?.openaiKey,
    hasGithubToken: !!user?.githubToken,
    hasVercelToken: !!user?.vercelToken,
    hasTavilyKey: !!user?.tavilyKey,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const { openaiKey, githubToken, vercelToken, tavilyKey } = body;

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

  await db.user.update({ where: { id: userId }, data: updateData });

  return NextResponse.json({ success: true });
}
