import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// ──────────────────────────────────────────────
// Template definitions
// ──────────────────────────────────────────────

export const TEMPLATES = {
  "saas-idea": {
    label: "SaaS Idea Generator",
    description: "Generate validated SaaS business ideas with market analysis.",
    systemPrompt: `You are a SaaS idea generation expert. Given a topic or industry, generate 3 compelling SaaS product ideas. For each idea include:
- **Name**: A catchy product name
- **Problem**: The specific pain point it solves
- **Target Market**: Who the ideal customer is
- **Core Feature**: The single most important feature
- **Monetisation**: How it makes money (pricing model)
- **Why Now**: Why this is the right time to build it
Format each idea clearly with markdown headings.`,
    userPromptPrefix: "Generate 3 SaaS ideas for the following topic or industry:",
  },
  "mvp-builder": {
    label: "MVP Feature List",
    description: "Define the minimum viable product scope for your idea.",
    systemPrompt: `You are a product manager specialising in MVPs. Given a SaaS product idea, produce a structured MVP scope document with:
- **Core Features** (must-have for launch, max 5)
- **Nice-to-Have** (post-launch backlog)
- **Out of Scope** (explicitly excluded to keep scope tight)
- **Tech Stack Recommendation** (with brief rationale)
- **Estimated Build Time** (solo developer)
- **Key Risks** (top 3 risks and mitigations)
Be decisive and opinionated. Ruthlessly cut scope.`,
    userPromptPrefix: "Define the MVP for the following SaaS idea:",
  },
  "landing-page": {
    label: "Landing Page Copy",
    description: "Generate compelling landing page copy for your product.",
    systemPrompt: `You are an expert SaaS copywriter. Given a product description, write complete landing page copy including:
- **Headline** (clear, benefit-focused, under 10 words)
- **Sub-headline** (one sentence expanding on the headline)
- **Hero CTA** (call-to-action button text + supporting text)
- **3 Core Benefits** (with icon label, heading, and 1–2 sentence description)
- **Social Proof Section** (2–3 fictional but realistic testimonials)
- **Pricing Section** (free/starter/pro tiers with features listed)
- **FAQ** (5 common questions with answers)
- **Final CTA Section** (closing headline + CTA)
Use persuasive, conversion-focused language.`,
    userPromptPrefix: "Write landing page copy for the following product:",
  },
  "tech-stack": {
    label: "Tech Stack Recommendation",
    description: "Get a tailored full-stack technology recommendation.",
    systemPrompt: `You are a senior software architect. Given a SaaS product description and requirements, recommend a complete tech stack with justification. Include:
- **Frontend** (framework, styling, state management)
- **Backend** (runtime, framework, API style)
- **Database** (primary DB + caching if needed)
- **Authentication** (service or library)
- **File Storage** (if applicable)
- **Hosting / Deployment** (with cost estimate at early stage)
- **Key Libraries** (3–5 essential packages per layer)
- **Why This Stack** (paragraph summary of the tradeoffs)
Tailor your recommendation to a small team or solo developer shipping fast.`,
    userPromptPrefix: "Recommend a tech stack for:",
  },
  "feature-spec": {
    label: "Feature Spec Writer",
    description: "Write detailed feature specifications and user stories.",
    systemPrompt: `You are a product manager writing feature specifications. Given a feature request, produce a complete spec document:
- **Feature Overview** (1-paragraph summary)
- **User Stories** (5–8 stories in "As a … I want … so that …" format)
- **Acceptance Criteria** (testable criteria for each story)
- **Edge Cases** (list of edge cases to handle)
- **UI/UX Notes** (key interface considerations)
- **API Changes** (endpoints to add/modify, with method, path, request/response shape)
- **Database Changes** (schema additions/modifications)
- **Out of Scope** (explicitly excluded to avoid scope creep)`,
    userPromptPrefix: "Write a feature spec for:",
  },
  "ui-component": {
    label: "UI Component Generator",
    description: "Generate React component code with Tailwind CSS styling.",
    systemPrompt: `You are a React/Tailwind CSS expert. Given a component description, generate production-ready React TypeScript code. Include:
- Full TypeScript interface for props
- Responsive design using Tailwind CSS
- Proper accessibility attributes (aria-*, role, etc.)
- Loading and empty states where applicable
- Dark mode support via Tailwind dark: classes
- A brief usage example at the end
Output only the component code in a single tsx code block, followed by the usage example.`,
    userPromptPrefix: "Generate a React component for:",
  },
  "prd": {
    label: "PRD / Product Brief",
    description: "Create a full Product Requirements Document.",
    systemPrompt: `You are a senior product manager. Given a product idea, write a complete Product Requirements Document (PRD) with:
- **Executive Summary** (2–3 sentences)
- **Problem Statement** (the specific pain being solved)
- **Goals & Success Metrics** (3–5 measurable KPIs)
- **Target Users** (primary and secondary personas)
- **Scope** (in-scope and out-of-scope)
- **User Flows** (2–3 key user journeys described step-by-step)
- **Functional Requirements** (numbered list)
- **Non-Functional Requirements** (performance, security, scalability)
- **Open Questions** (unresolved decisions)
- **Timeline** (rough milestones)`,
    userPromptPrefix: "Write a PRD for:",
  },
  "bug-fixer": {
    label: "Bug Fixer",
    description: "Diagnose and fix code bugs with detailed explanations.",
    systemPrompt: `You are an expert debugging assistant. Given buggy code and/or an error message:
1. **Diagnose** the root cause clearly
2. **Explain** why the bug occurs
3. **Provide the fixed code** in a code block
4. **Explain** what changed and why
5. **Suggest** any related improvements to prevent similar bugs
Be precise and educational.`,
    userPromptPrefix: "Debug and fix the following code/error:",
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
// POST /api/generate – run a generation
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
      // Fall through to env keys
    }
  }

  const openaiKey = userKeys.openaiKey ?? process.env.OPENAI_API_KEY;
  const anthropicKey = userKeys.anthropicKey ?? process.env.ANTHROPIC_API_KEY;

  // Auto-detect provider: prefer requested, then fallback to available
  let activeProvider = provider || (anthropicKey ? "anthropic" : "openai");
  if (activeProvider === "openai" && !openaiKey && anthropicKey) {
    activeProvider = "anthropic";
  } else if (activeProvider === "anthropic" && !anthropicKey && openaiKey) {
    activeProvider = "openai";
  }

  const tmpl = TEMPLATES[template];
  const fullPrompt = `${tmpl.userPromptPrefix}\n\n${prompt.trim()}`;

  let output = "";
  let usedModel = model;

  try {
    if (activeProvider === "anthropic") {
      if (!anthropicKey) {
        return NextResponse.json(
          { error: "No AI provider configured. Netlify AI Gateway should provide Claude automatically." },
          { status: 400 }
        );
      }
      const clientOptions: { apiKey: string; baseURL?: string } = { apiKey: anthropicKey };
      if (process.env.ANTHROPIC_BASE_URL) clientOptions.baseURL = process.env.ANTHROPIC_BASE_URL;
      const anthropic = new Anthropic(clientOptions);
      usedModel = model ?? "claude-sonnet-4-5";
      const response = await anthropic.messages.create({
        model: usedModel,
        max_tokens: 4096,
        system: tmpl.systemPrompt,
        messages: [{ role: "user", content: fullPrompt }],
      });
      output =
        response.content
          .filter((c) => c.type === "text")
          .map((c) => (c as { type: "text"; text: string }).text)
          .join("");
    } else {
      // Default: OpenAI
      if (!openaiKey) {
        return NextResponse.json(
          { error: "No AI provider configured. Netlify AI Gateway should provide Claude automatically." },
          { status: 400 }
        );
      }
      const clientOptions: { apiKey: string; baseURL?: string } = { apiKey: openaiKey };
      if (process.env.OPENAI_BASE_URL) clientOptions.baseURL = process.env.OPENAI_BASE_URL;
      const openai = new OpenAI(clientOptions);
      usedModel = model ?? "gpt-4o";
      const response = await openai.chat.completions.create({
        model: usedModel,
        max_tokens: 4096,
        messages: [
          { role: "system", content: tmpl.systemPrompt },
          { role: "user", content: fullPrompt },
        ],
      });
      output = response.choices[0]?.message?.content ?? "";
    }
  } catch (err) {
    console.error("AI generation error:", err);
    const message =
      err instanceof Error ? err.message : "AI generation failed";
    // Never expose raw API errors (may contain key fingerprints)
    const safe =
      message.includes("API key") || message.includes("Incorrect API key")
        ? "Invalid API key. Please check your key in Settings > AI Models."
        : message.includes("rate limit") || message.includes("429")
        ? "Rate limit reached. Please wait a moment and try again."
        : message.includes("quota") || message.includes("insufficient_quota")
        ? "API quota exceeded. Please check your billing on the provider dashboard."
        : "AI generation failed. Please try again.";
    return NextResponse.json({ error: safe }, { status: 502 });
  }

  // Persist to database if available
  let savedGeneration: { id: string } | null = null;
  if (getDatabaseUrl()) {
    try {
      savedGeneration = await db.generation.create({
        data: {
          userId,
          projectId: projectId ?? null,
          template,
          prompt: prompt.trim(),
          output,
          status: "completed",
          model: usedModel ?? null,
        },
        select: { id: true },
      });
    } catch (err) {
      console.error("Failed to save generation:", err);
      // Non-fatal – return the output regardless
    }
  }

  return NextResponse.json(
    {
      id: savedGeneration?.id ?? null,
      template,
      prompt: prompt.trim(),
      output,
      model: usedModel,
    },
    { status: 201 }
  );
}
