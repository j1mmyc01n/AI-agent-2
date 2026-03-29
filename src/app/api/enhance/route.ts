import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const ENHANCE_SYSTEM = `You are a prompt enhancement assistant for DoBetter Viber, an AI vibe coding platform. Your job is to take a user's rough project idea or request and enhance it into a detailed, actionable prompt that will produce better results from the AI code generator.

Rules:
- Keep the user's original intent intact
- Add specific details about design, features, and UX
- Mention technologies where relevant (React, Tailwind, etc.)
- Keep it to 2-4 sentences max
- Make it sound natural, not robotic
- Focus on visual quality and functionality
- Output ONLY the enhanced prompt text, nothing else - no quotes, no prefix, no explanation`;

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt?.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    let enhanced = "";

    if (anthropicKey) {
      const anthropic = new Anthropic();
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        system: ENHANCE_SYSTEM,
        messages: [{ role: "user", content: `Enhance this prompt: ${prompt.trim()}` }],
      });
      enhanced = response.content
        .filter((c) => c.type === "text")
        .map((c) => (c as { type: "text"; text: string }).text)
        .join("");
    } else if (openaiKey) {
      const openai = new OpenAI();
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 512,
        messages: [
          { role: "system", content: ENHANCE_SYSTEM },
          { role: "user", content: `Enhance this prompt: ${prompt.trim()}` },
        ],
      });
      enhanced = response.choices[0]?.message?.content ?? "";
    } else {
      return NextResponse.json({ error: "No AI provider available" }, { status: 400 });
    }

    return NextResponse.json({ enhanced: enhanced.trim() });
  } catch (error) {
    console.error("Enhance API error:", error);
    return NextResponse.json({ error: "Failed to enhance prompt" }, { status: 500 });
  }
}
