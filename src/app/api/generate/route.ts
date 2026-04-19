import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ──────────────────────────────────────────────
// Template definitions
// ──────────────────────────────────────────────

export const TEMPLATES = {
  "saas-dashboard": {
    label: "SaaS Dashboard Template",
    description: "Generate a SaaS dashboard blueprint aligned to DoBetter design and architecture standards.",
    systemPrompt: `You are a SaaS architecture and UX systems expert.
Generate a production-ready blueprint for a SaaS dashboard using the DoBetter hierarchy and structure.
Include:
- Product scope and key modules
- File/folder hierarchy (platform + generated project)
- Route map and sidebar hierarchy
- Data model and API contract outline
- Design token usage (light + dark)
- KPI/dashboard widget strategy
- Dynamic data and interactivity plan (no dummy placeholders)
- Build sequence checklist
Be direct, implementation-ready, and structured with markdown headings.`,
    userPromptPrefix: "Create a SaaS dashboard template blueprint for:",
  },
  ecommerce: {
    label: "E-Commerce Template",
    description: "Generate e-commerce architecture and UX blueprint with robust operational flows.",
    systemPrompt: `You are an e-commerce systems architect.
Generate a complete e-commerce template blueprint using DoBetter structure standards.
Include:
- Catalog, checkout, order, and fulfillment modules
- Core pages and file hierarchy
- Data schema (products, orders, customers) and status systems
- API route map and integration points (payments, webhooks)
- Dashboard KPI and analytics layout
- UX rules for tables, badges, filters, and inventory states
- Dynamic data strategy without placeholder content
Return clear sections with actionable detail.`,
    userPromptPrefix: "Create an e-commerce project template for:",
  },
  "ai-tool": {
    label: "AI Tool Template",
    description: "Generate an AI tool template with streaming UX, model routing, and usage architecture.",
    systemPrompt: `You are an AI product architect.
Generate a complete AI-tool template aligned to DoBetter standards.
Include:
- Streaming chat/generation UX structure
- Model routing strategy and provider abstraction
- Token/cost usage tracking model
- Conversation/message data model
- Routes, API endpoints, and state interactions
- Sidebar/topbar hierarchy and dashboard analytics sections
- Design-system alignment and accessibility requirements
- Dynamic, realistic data strategy without static placeholders
Use concise markdown with implementation-ready sections.`,
    userPromptPrefix: "Create an AI tool template for:",
  },
  "blog-cms": {
    label: "Blog / CMS Template",
    description: "Generate a content platform template with editorial workflows and publishing architecture.",
    systemPrompt: `You are a CMS platform architect.
Generate a full Blog/CMS template blueprint.
Include:
- Content model (posts, categories, authors, media, subscribers)
- Editorial workflow and status transitions
- Page/route hierarchy and admin dashboard structure
- API routes and validation strategy
- SEO, analytics, and publishing rules
- UI/UX layout patterns based on DoBetter design tokens
- Dynamic data and content rendering rules without placeholder copy
Return in clear markdown sections.`,
    userPromptPrefix: "Create a Blog/CMS project template for:",
  },
  "booking-app": {
    label: "Booking App Template",
    description: "Generate booking app architecture with calendar UX and service scheduling logic.",
    systemPrompt: `You are a booking-product architect.
Generate a complete booking app template blueprint.
Include:
- Service, booking, client, and availability data models
- Weekly calendar interaction model
- Routing and page architecture
- API routes and booking lifecycle/status flow
- Cancellation, confirmation, and payment integration strategy
- Dashboard metrics and operational views
- Design-system component mapping and responsive behavior
- Dynamic dataset strategy with realistic generated values and no placeholders
Use markdown headings and practical implementation detail.`,
    userPromptPrefix: "Create a booking app template for:",
  },
  "static-landing": {
    label: "Static / Landing Template",
    description: "Generate a high-conversion static/marketing template with performance and analytics structure.",
    systemPrompt: `You are a marketing site systems designer.
Generate a static/landing template blueprint that follows DoBetter standards.
Include:
- Page hierarchy and conversion funnel sections
- Hero/features/pricing/testimonial/CTA structure
- Lead capture and source attribution model
- Analytics schema and reporting views
- SEO/performance requirements
- Design token usage and responsive section patterns
- Content quality rules (real copy only, no placeholder text)
Return as structured markdown.`,
    userPromptPrefix: "Create a static/landing template for:",
  },
  "pwa-mobile": {
    label: "PWA / Mobile-First Template",
    description: "Generate a mobile-first PWA architecture with offline and push capabilities.",
    systemPrompt: `You are a PWA architect.
Generate a production-ready PWA/mobile-first template blueprint.
Include:
- App shell and responsive navigation architecture
- Manifest and service worker strategy
- Offline cache and sync model
- Push notification data model and routes
- Dashboard/usage pages for mobile operations
- Touch-first UX and accessibility constraints
- Design-system usage for compact/mobile layouts
- Dynamic data behavior with no dummy placeholders
Provide concise implementation-ready sections.`,
    userPromptPrefix: "Create a PWA/mobile-first template for:",
  },
  "design-system": {
    label: "DoBetter Design System Template",
    description: "Generate a complete UI system spec for project builds aligned to DoBetter Design System v2.",
    systemPrompt: `You are a design-system architect.
Generate a DoBetter-compliant UI system spec for the requested product context.
Include:
- Color/token system (light and dark)
- Typography rules (Syne + DM Sans)
- Sidebar/topbar/page-grid hierarchy
- Component specs (cards, KPI stats, badges, tables, buttons, progress, charts)
- Responsive behavior and spacing scale
- Rules for dynamic content rendering (no placeholder/dummy content)
- Mapping from UI tokens to the 8-file build architecture
Output structured markdown with clear, reusable sections.`,
    userPromptPrefix: "Create a DoBetter design-system template for:",
  },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

// ──────────────────────────────────────────────
// GET /api/generate – list recent generations
// ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!getDatabaseUrl()) {
    return NextResponse.json([]);
  }

  try {
    const generations = await db.generation.findMany({
      where: { userId, ...(projectId ? { projectId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        template: true,
        prompt: true,
        output: true,
        status: true,
        model: true,
        projectId: true,
        createdAt: true,
      },
    });
    return NextResponse.json(generations);
  } catch (err) {
    console.error("GET /api/generate error:", err);
    return NextResponse.json([]);
  }
}

// ──────────────────────────────────────────────
// POST /api/generate – run a generation (SSE streaming)
// ──────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  let body: {
    template: TemplateKey;
    prompt: string;
    projectId?: string;
    provider?: "openai" | "anthropic";
    model?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { template, prompt, projectId, provider, model } = body;

  if (!template || !TEMPLATES[template]) {
    return NextResponse.json(
      { error: `Unknown template. Valid templates: ${Object.keys(TEMPLATES).join(", ")}` },
      { status: 400 }
    );
  }

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }

  // Resolve API keys (user-stored keys take priority over env vars)
  let userKeys: { openaiKey?: string | null; anthropicKey?: string | null } = {};
  if (getDatabaseUrl()) {
    try {
      const u = await db.user.findUnique({
        where: { id: userId },
        select: { openaiKey: true, anthropicKey: true },
      });
      userKeys = u ?? {};
    } catch {
      // Fall through to Blobs / env keys
    }
  }

  // Try Blobs if no keys from DB
  if (!userKeys.openaiKey && !userKeys.anthropicKey) {
    try {
      const store = getStore({ name: "user-settings", consistency: "strong" });
      const blobKeys = await store.get(`keys:${userId}`, { type: "json" }) as Record<string, string> | null;
      if (blobKeys) {
        userKeys = {
          openaiKey: blobKeys.openaiKey || null,
          anthropicKey: blobKeys.anthropicKey || null,
        };
      }
    } catch {
      // Fall through to env keys
    }
  }

  const openaiKey = userKeys.openaiKey ?? process.env.OPENAI_API_KEY;
  const anthropicKey = userKeys.anthropicKey ?? process.env.ANTHROPIC_API_KEY;

  // Auto-detect provider: prefer Anthropic, fall back to OpenAI
  // Sanitize provider to only allowed values
  const safeProvider = provider === "openai" ? "openai" : "anthropic";
  let activeProvider: "openai" | "anthropic" = safeProvider === "anthropic" && anthropicKey ? "anthropic"
    : safeProvider === "openai" && openaiKey ? "openai"
    : anthropicKey ? "anthropic"
    : openaiKey ? "openai"
    : "anthropic";
  if (activeProvider === "openai" && !openaiKey && anthropicKey) {
    activeProvider = "anthropic";
  } else if (activeProvider === "anthropic" && !anthropicKey && openaiKey) {
    activeProvider = "openai";
  }

  const tmpl = TEMPLATES[template];
  const fullPrompt = `${tmpl.userPromptPrefix}\n\n${prompt.trim()}`;

  let usedModel = model;

  // SSE streaming response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullOutput = "";

      const enqueue = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const tryStreamGenerate = async (useProvider: "anthropic" | "openai", useModel?: string): Promise<void> => {
        if (useProvider === "anthropic") {
          const key = userKeys.anthropicKey ?? process.env.ANTHROPIC_API_KEY;
          if (!key) throw new Error("No Anthropic key available");
          const anthropic = new Anthropic();
          const m = useModel ?? "claude-sonnet-4-5-20250514";
          usedModel = m;
          const response = await anthropic.messages.create({
            model: m,
            max_tokens: 4096,
            system: tmpl.systemPrompt,
            messages: [{ role: "user", content: fullPrompt }],
            stream: true,
          });
          for await (const event of response) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              fullOutput += text;
              enqueue({ type: "text", content: text });
            }
          }
        } else {
          const key = userKeys.openaiKey ?? process.env.OPENAI_API_KEY;
          if (!key) throw new Error("No OpenAI key available");
          const openai = new OpenAI();
          const m = useModel ?? "gpt-4o";
          usedModel = m;
          const response = await openai.chat.completions.create({
            model: m,
            max_tokens: 4096,
            messages: [
              { role: "system", content: tmpl.systemPrompt },
              { role: "user", content: fullPrompt },
            ],
            stream: true,
          });
          for await (const chunk of response) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) {
              fullOutput += text;
              enqueue({ type: "text", content: text });
            }
          }
        }
      };

      try {
        try {
          await tryStreamGenerate(activeProvider, model ?? undefined);
        } catch (primaryErr) {
          console.error(`Primary provider ${activeProvider} failed:`, primaryErr);
          // Try fallback provider
          const fallback = activeProvider === "openai" ? "anthropic" : "openai";
          const fallbackModel = fallback === "anthropic" ? "claude-sonnet-4-5-20250514" : "gpt-4o";
          fullOutput = "";
          await tryStreamGenerate(fallback, fallbackModel);
        }

        // Persist to database if available
        if (getDatabaseUrl()) {
          try {
            await db.generation.create({
              data: {
                userId,
                projectId: projectId ?? null,
                template,
                prompt: prompt.trim(),
                output: fullOutput,
                status: "completed",
                model: usedModel ?? null,
              },
            });
          } catch (err) {
            console.error("Failed to save generation:", err);
          }
        }

        enqueue({ type: "done" });
      } catch (err) {
        console.error("Generation streaming failed:", err);
        const message = err instanceof Error ? err.message : "AI generation failed";
        const safe =
          message.includes("API key") || message.includes("Incorrect API key")
            ? "Invalid API key. Please check your key in Settings > AI Models."
            : message.includes("rate limit") || message.includes("429")
            ? "Rate limit reached. Please wait a moment and try again."
            : message.includes("quota") || message.includes("insufficient_quota")
            ? "API quota exceeded. Please check your billing on the provider dashboard."
            : message.includes("404") || message.includes("Not Found")
            ? "Model not available. Try switching to a different model."
            : "AI generation failed. Please try again.";
        enqueue({ type: "error", content: safe });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
