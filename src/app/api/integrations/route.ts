import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

const ALL_KEYS = [
  "openaiKey",
  "anthropicKey",
  "grokKey",
  "githubToken",
  "vercelToken",
  "tavilyKey",
  "neonKey",
  "netlifyToken",
] as const;

type KeyName = (typeof ALL_KEYS)[number];

const STATUS_KEY_MAP: Record<KeyName, string> = {
  openaiKey: "hasOpenaiKey",
  anthropicKey: "hasAnthropicKey",
  grokKey: "hasGrokKey",
  githubToken: "hasGithubToken",
  vercelToken: "hasVercelToken",
  tavilyKey: "hasTavilyKey",
  neonKey: "hasNeonKey",
  netlifyToken: "hasNetlifyToken",
};

function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

// Netlify Blobs helpers for key storage
async function getBlobKeys(userId: string): Promise<Record<string, string | null>> {
  try {
    const store = getStore({ name: "user-settings", consistency: "strong" });
    const data = await store.get(`keys:${userId}`, { type: "json" }) as Record<string, string | null> | null;
    return data || {};
  } catch {
    return {};
  }
}

async function saveBlobKeys(userId: string, keys: Record<string, string | null>): Promise<void> {
  const store = getStore({ name: "user-settings", consistency: "strong" });
  await store.setJSON(`keys:${userId}`, keys);
}

function buildResponse(userKeys: Record<string, string | null>) {
  const result: Record<string, unknown> = {};
  for (const key of ALL_KEYS) {
    const userVal = userKeys[key] || null;
    result[key] = maskSecret(userVal);
    result[STATUS_KEY_MAP[key]] = !!userVal;
  }
  return result;
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

      return NextResponse.json(buildResponse(user || {}));
    } catch (error) {
      console.error("Database error in GET /api/integrations:", error);
      // Fall through to Blobs
    }
  }

  // Fallback: Netlify Blobs
  const blobKeys = await getBlobKeys(userId);
  return NextResponse.json(buildResponse(blobKeys));
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const body = await req.json();
  const updateData: Record<string, string | null> = {};
  const shouldUpdate = (val: string | undefined) => val !== undefined && !val.includes("••••");

  for (const key of ALL_KEYS) {
    const val = body[key] as string | undefined;
    if (shouldUpdate(val)) {
      updateData[key] = val || null;
    }
  }

  // Try database first
  if (getDatabaseUrl()) {
    try {
      await db.user.update({ where: { id: userId }, data: updateData });
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Database error in POST /api/integrations, falling back to Blobs:", error);
      // Fall through to Blobs
    }
  }

  // Fallback: Netlify Blobs
  try {
    const existing = await getBlobKeys(userId);
    const merged = { ...existing, ...updateData };
    // Remove null entries entirely so cleared keys are actually cleared
    for (const k of Object.keys(merged)) {
      if (merged[k] === null) delete merged[k];
    }
    await saveBlobKeys(userId, merged);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Blobs error in POST /api/integrations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save settings. Please try again." },
      { status: 500 }
    );
  }
}
