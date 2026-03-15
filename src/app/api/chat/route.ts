import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { runAgent } from "@/lib/ai/agent";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const { message, conversationId } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Check if database is available
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          error: "Database not configured. Chat history cannot be saved. To use the chat feature with conversation history, please set up a DATABASE_URL.",
          message: "The AI chat requires a database to store conversation history. See TEST_ADMIN.md for setup instructions."
        },
        { status: 503 }
      );
    }

    // Get user's API keys
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        openaiKey: true,
        githubToken: true,
        vercelToken: true,
        tavilyKey: true,
      },
    });

    const openaiKey = user?.openaiKey || process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json(
        { error: "No OpenAI API key configured. Please add one in Settings > Integrations." },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await db.conversation.findFirst({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
      if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
      }
    } else {
      conversation = await db.conversation.create({
        data: {
          userId,
          title: message.slice(0, 60) + (message.length > 60 ? "..." : ""),
        },
        include: { messages: true },
      });
    }

    // Save user message
    await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message,
      },
    });

    // Update conversation title if it's still the default
    if (conversation.title === "New Conversation" && conversation.messages?.length === 0) {
      await db.conversation.update({
        where: { id: conversation.id },
        data: { title: message.slice(0, 60) + (message.length > 60 ? "..." : "") },
      });
    }

    // Build message history for OpenAI
    const history = (conversation.messages || []).map((m) => ({
      role: m.role as "user" | "assistant" | "system" | "tool",
      content: m.content,
    }));

    // Add the new user message
    history.push({ role: "user", content: message });

    // Create the streaming response
    const encoder = new TextEncoder();
    let fullResponse = "";
    const toolCallsData: { name: string; args: Record<string, unknown>; result: string }[] = [];

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await runAgent(
            history, // Full history including the current user message
            {
              openaiKey,
              githubToken: user?.githubToken || undefined,
              vercelToken: user?.vercelToken || undefined,
              tavilyKey: user?.tavilyKey || undefined,
              userId,
              conversationId: conversation.id,
            },
            // onChunk
            (chunk) => {
              fullResponse += chunk;
              const data = JSON.stringify({ type: "text", content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            // onToolCall
            (toolName, args) => {
              toolCallsData.push({ name: toolName, args, result: "" });
              const data = JSON.stringify({ type: "tool_call", toolName, toolArgs: args });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            // onToolResult
            (toolName, result) => {
              const tc = toolCallsData.find((t) => t.name === toolName && !t.result);
              if (tc) tc.result = result;
              const data = JSON.stringify({ type: "tool_result", toolName, toolResult: result });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          );

          // Save assistant message to DB
          await db.message.create({
            data: {
              conversationId: conversation.id,
              role: "assistant",
              content: fullResponse,
              toolCalls: toolCallsData.length > 0 ? JSON.stringify(toolCallsData) : null,
            },
          });

          // Update conversation timestamp
          await db.conversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
          });

          const doneData = JSON.stringify({
            type: "done",
            conversationId: conversation.id,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          controller.close();
        } catch (error) {
          console.error("Agent error:", error);
          const errorMsg = error instanceof Error ? error.message : "An error occurred";
          const errorData = JSON.stringify({ type: "error", error: errorMsg });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
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
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
