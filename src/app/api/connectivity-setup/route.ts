import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDatabaseUrl } from "@/lib/db";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

const SETUP_SYSTEM_PROMPT = `You are an expert integration architect. Given a website URL, analyze and generate a structured connectivity setup blueprint.

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "siteName": "detected product/site name",
  "siteCategory": "e.g. E-commerce, SaaS, CMS, Social Media, Analytics, etc.",
  "apiPathways": ["list of possible API/integration pathways"],
  "authMethod": "recommended auth method (OAuth2, API Key, Bearer Token, etc.)",
  "fallbackStrategy": "scraping/manual fallback approach if no API exists",
  "envVars": [{"key": "ENV_VAR_NAME", "description": "what this var is for"}],
  "dbEntities": [{"name": "EntityName", "fields": ["field1", "field2"]}],
  "agentActions": ["list of agent actions this integration enables"],
  "uiModule": "suggested UI module or connector pattern name"
}

Analyze the domain name and any known information about the site to make intelligent inferences. Be specific and actionable.`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  let body: { url: string; provider?: "openai" | "anthropic"; projectId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, provider, projectId } = body;

  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // Resolve API keys
  let openaiKey = process.env.OPENAI_API_KEY;
  let anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (getDatabaseUrl()) {
    try {
      const { db } = await import("@/lib/db");
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { openaiKey: true, anthropicKey: true },
      });
      if (user?.openaiKey) openaiKey = user.openaiKey;
      if (user?.anthropicKey) anthropicKey = user.anthropicKey;
    } catch {
      // Fall through to Blobs / env keys
    }
  }

  // Try Blobs for user keys if not found in DB
  if (!openaiKey && !anthropicKey) {
    try {
      const { getStore } = await import("@netlify/blobs");
      const store = getStore({ name: "user-settings", consistency: "strong" });
      const blobKeys = await store.get(`keys:${userId}`, { type: "json" }) as Record<string, string> | null;
      if (blobKeys?.openaiKey) openaiKey = blobKeys.openaiKey;
      if (blobKeys?.anthropicKey) anthropicKey = blobKeys.anthropicKey;
    } catch {
      // Fall through to env keys
    }
  }

  // Auto-detect provider
  const activeProvider = provider || (anthropicKey ? "anthropic" : openaiKey ? "openai" : null);

  const prompt = `Generate a connectivity setup blueprint for this website: ${url.trim()}

Analyze the domain, infer the product type, and suggest integration pathways, auth methods, database entities, and agent actions.`;

  let output = "";

  try {
    if (activeProvider === "anthropic" && anthropicKey) {
      // Use zero-config constructor when env vars match (Netlify AI Gateway)
      const envKey = process.env.ANTHROPIC_API_KEY;
      const envBase = process.env.ANTHROPIC_BASE_URL;
      const anthropic = (envKey && envBase && anthropicKey === envKey)
        ? new Anthropic()
        : new Anthropic({ apiKey: anthropicKey, ...(process.env.ANTHROPIC_BASE_URL ? { baseURL: process.env.ANTHROPIC_BASE_URL } : {}) });
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: SETUP_SYSTEM_PROMPT,
        messages: [{ role: "user", content: prompt }],
      });
      output = response.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { type: "text"; text: string }).text)
        .join("");
    } else if (activeProvider === "openai" && openaiKey) {
      // Use zero-config constructor when env vars match (Netlify AI Gateway)
      const envOaiKey = process.env.OPENAI_API_KEY;
      const envOaiBase = process.env.OPENAI_BASE_URL;
      const openai = (envOaiKey && envOaiBase && openaiKey === envOaiKey)
        ? new OpenAI()
        : new OpenAI({ apiKey: openaiKey, ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}) });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 2048,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SETUP_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      });
      output = response.choices[0]?.message?.content ?? "";
    } else {
      // No AI key available — generate a smart scaffold from the URL itself
      const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
      const name = domain.split(".")[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);

      output = JSON.stringify({
        siteName: capitalized,
        siteCategory: "Web Application",
        apiPathways: [
          `${capitalized} REST API (check ${domain}/api or ${domain}/docs)`,
          "Webhook integrations",
          "OAuth2 app registration",
        ],
        authMethod: "API Key or OAuth2",
        fallbackStrategy: `If no public API exists, use browser automation or structured scraping of ${domain}`,
        envVars: [
          { key: `${name.toUpperCase()}_API_KEY`, description: `API key for ${capitalized}` },
          { key: `${name.toUpperCase()}_WEBHOOK_SECRET`, description: "Webhook verification secret" },
        ],
        dbEntities: [
          { name: `${capitalized}Connection`, fields: ["id", "userId", "apiKey", "webhookUrl", "status", "createdAt"] },
          { name: `${capitalized}SyncLog`, fields: ["id", "connectionId", "action", "payload", "status", "timestamp"] },
        ],
        agentActions: [
          `Fetch data from ${capitalized}`,
          `Push updates to ${capitalized}`,
          `Sync ${capitalized} entities to local DB`,
          `Monitor ${capitalized} webhooks`,
        ],
        uiModule: `${capitalized}Connector`,
      });
    }
  } catch (err) {
    console.error("Connectivity setup generation error:", err);
    return NextResponse.json({ error: "Failed to generate setup. Please try again." }, { status: 502 });
  }

  // Parse the output
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    // Try to extract JSON from the output
    const match = output.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 502 });
      }
    } else {
      return NextResponse.json({ error: "Failed to parse AI response. Please try again." }, { status: 502 });
    }
  }

  return NextResponse.json({
    url: url.trim(),
    projectId: projectId || null,
    userId,
    ...parsed,
  }, { status: 201 });
}
