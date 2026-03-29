import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, getDatabaseUrl } from "@/lib/db";
import { runAgent, type AIProvider } from "@/lib/ai/agent";
import { getStore } from "@netlify/blobs";

/**
 * Generate a 2-3 word descriptive title from a user message.
 * Extracts key nouns/verbs and removes filler words.
 */
function generateShortTitle(message: string): string {
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
    "they", "them", "his", "her", "its", "this", "that", "these", "those",
    "am", "to", "of", "in", "for", "on", "with", "at", "by", "from",
    "as", "into", "through", "during", "before", "after", "above",
    "below", "between", "out", "off", "over", "under", "again", "further",
    "then", "once", "here", "there", "when", "where", "why", "how", "all",
    "each", "every", "both", "few", "more", "most", "other", "some",
    "such", "no", "nor", "not", "only", "own", "same", "so", "than",
    "too", "very", "just", "because", "but", "and", "or", "if", "while",
    "about", "up", "what", "which", "who", "whom", "please", "want",
    "like", "let", "lets", "let's", "going", "get", "got", "make",
    "help", "something", "thing", "things", "really", "actually",
  ]);

  // Clean the message and extract meaningful words
  const words = message
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !stopWords.has(w.toLowerCase()))
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

  if (words.length === 0) {
    return "New Chat";
  }

  // Take first 2-3 meaningful words
  const titleWords = words.slice(0, 3);
  return titleWords.join(" ");
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const { message, conversationId, model, provider, projectId, mode } = body as {
      message: string;
      conversationId?: string;
      model?: string;
      provider?: AIProvider;
      projectId?: string;
      mode?: "chat" | "build" | "saas-upgrade";
      history?: { role: string; content: string }[];
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const hasDb = !!getDatabaseUrl();

    // Get user's API keys and project context from DB
    let user: {
      name?: string | null;
      openaiKey?: string | null;
      anthropicKey?: string | null;
      githubToken?: string | null;
      vercelToken?: string | null;
      tavilyKey?: string | null;
    } | null = null;

    let userProjects: {
      id: string;
      name: string;
      description: string | null;
      type: string;
      status: string;
      githubRepo: string | null;
      vercelUrl: string | null;
    }[] = [];

    let conversationCount = 0;

    if (hasDb) {
      try {
        user = await db.user.findUnique({
          where: { id: userId },
          select: {
            name: true,
            openaiKey: true,
            anthropicKey: true,
            githubToken: true,
            vercelToken: true,
            tavilyKey: true,
          },
        });

        // Fetch user's projects for context
        userProjects = await db.project.findMany({
          where: { userId },
          select: {
            id: true,
            name: true,
            description: true,
            type: true,
            status: true,
            githubRepo: true,
            vercelUrl: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        });

        conversationCount = await db.conversation.count({
          where: { userId },
        });
      } catch (e) {
        console.error("Failed to fetch user data from DB:", e);
      }
    }

    // If no user data from DB, try Netlify Blobs for stored keys
    if (!user) {
      try {
        const store = getStore({ name: "user-settings", consistency: "strong" });
        const blobKeys = await store.get(`keys:${userId}`, { type: "json" }) as Record<string, string> | null;
        if (blobKeys) {
          user = {
            openaiKey: blobKeys.openaiKey || null,
            anthropicKey: blobKeys.anthropicKey || null,
            githubToken: blobKeys.githubToken || null,
            vercelToken: blobKeys.vercelToken || null,
            tavilyKey: blobKeys.tavilyKey || null,
          };
        }
      } catch {
        // Blobs not available, continue with env vars
      }
    }

    // Try fetching projects from Blobs if not already loaded
    if (userProjects.length === 0) {
      try {
        const store = getStore("projects");
        const blobProjects = await store.get(`user:${userId}`, { type: "json" }) as typeof userProjects | null;
        if (blobProjects) userProjects = blobProjects;
      } catch {
        // No projects available
      }
    }

    // Resolve API keys - Netlify AI Gateway auto-injects these env vars, no user keys needed
    const openaiKey = user?.openaiKey || process.env.OPENAI_API_KEY;
    const anthropicKey = user?.anthropicKey || process.env.ANTHROPIC_API_KEY;

    // Auto-detect best available provider: prefer requested, then fallback
    let activeProvider: AIProvider = provider || "anthropic";
    if (activeProvider === "openai" && !openaiKey) {
      activeProvider = anthropicKey ? "anthropic" : "openai";
    } else if (activeProvider === "anthropic" && !anthropicKey) {
      activeProvider = openaiKey ? "openai" : "anthropic";
    }

    // Netlify AI Gateway provides keys automatically - only error if truly nothing available
    if (!openaiKey && !anthropicKey) {
      return NextResponse.json(
        { error: "No AI provider available. Netlify AI Gateway should provide Claude and GPT automatically. If this persists, the site may need a production deploy to activate AI Gateway." },
        { status: 400 }
      );
    }

    // Get or create conversation
    let conversation: { id: string; title: string; messages: { role: string; content: string }[] };
    const localMode = !hasDb;

    // Find current project name if projectId provided
    let currentProjectName: string | undefined;
    if (projectId) {
      const proj = userProjects.find(p => p.id === projectId);
      if (proj) currentProjectName = proj.name;
    }

    if (localMode) {
      const convId = conversationId || `blob-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      conversation = {
        id: convId,
        title: generateShortTitle(message),
        messages: [],
      };
      if (body.history && Array.isArray(body.history)) {
        conversation.messages = body.history;
      }

      // Save conversation to Blobs if new
      if (!conversationId) {
        try {
          const convStore = getStore("conversations");
          const existing = await convStore.get(`user:${userId}`, { type: "json" }) as { id: string; title: string; projectId?: string | null; userId: string; createdAt: string; updatedAt: string; messageCount: number }[] || [];
          const existingArr = Array.isArray(existing) ? existing : [];
          existingArr.unshift({
            id: convId,
            title: conversation.title,
            projectId: projectId || null,
            userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messageCount: 1,
          });
          await convStore.setJSON(`user:${userId}`, existingArr);
        } catch {
          // Non-critical: conversation just won't appear in sidebar
        }
      }
    } else {
      try {
        if (conversationId) {
          const conv = await db.conversation.findFirst({
            where: { id: conversationId, userId },
            include: { messages: { orderBy: { createdAt: "asc" } } },
          });
          if (!conv) {
            return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
          }
          conversation = { id: conv.id, title: conv.title, messages: conv.messages };
        } else {
          const conv = await db.conversation.create({
            data: {
              userId,
              title: generateShortTitle(message),
            },
            include: { messages: true },
          });
          conversation = { id: conv.id, title: conv.title, messages: conv.messages };
        }

        // Save user message to DB
        await db.message.create({
          data: {
            conversationId: conversation.id,
            role: "user",
            content: message,
          },
        });
      } catch (dbError) {
        console.error("DB error creating/finding conversation, falling back to local mode:", dbError);
        // Fall back to local mode if DB fails
        const convId = conversationId || `local-${Date.now()}`;
        conversation = {
          id: convId,
          title: generateShortTitle(message),
          messages: [],
        };
        if (body.history && Array.isArray(body.history)) {
          conversation.messages = body.history;
        }
      }
    }

    // Build message history
    const history = conversation.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system" | "tool",
      content: m.content,
    }));
    history.push({ role: "user", content: message });

    const encoder = new TextEncoder();
    let fullResponse = "";
    const toolCallsData: { name: string; args: Record<string, unknown>; result: string }[] = [];

    // Build context for the agent
    const projectContext = {
      projects: userProjects,
      currentProjectId: projectId,
      currentProjectName,
      conversationCount,
      userName: user?.name || undefined,
      hasGithub: !!(user?.githubToken),
      hasVercel: !!(user?.vercelToken),
      mode: mode || "chat",
    };

    const stream = new ReadableStream({
      async start(controller) {
        // Set a timeout to prevent stalling
        const timeout = setTimeout(() => {
          try {
            const errorData = JSON.stringify({ type: "error", error: "Request timed out. The AI provider may be unavailable. Please try again or switch to a different model in the model selector." });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          } catch {
            // Controller may already be closed
          }
        }, 120000); // 2 minute timeout

        try {
          await runAgent(
            history,
            {
              openaiKey: openaiKey || undefined,
              anthropicKey: anthropicKey || undefined,
              githubToken: user?.githubToken || undefined,
              vercelToken: user?.vercelToken || undefined,
              tavilyKey: user?.tavilyKey || undefined,
              userId,
              conversationId: conversation.id,
              model,
              provider: activeProvider,
              projectContext,
            },
            (chunk) => {
              fullResponse += chunk;
              const data = JSON.stringify({ type: "text", content: chunk });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            (toolName, args) => {
              toolCallsData.push({ name: toolName, args, result: "" });
              const data = JSON.stringify({ type: "tool_call", toolName, toolArgs: args });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            (toolName, result) => {
              const tc = toolCallsData.find((t) => t.name === toolName && !t.result);
              if (tc) tc.result = result;
              const data = JSON.stringify({ type: "tool_result", toolName, toolResult: result });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          );

          // Save assistant message to DB if available
          if (!localMode) {
            try {
              await db.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "assistant",
                  content: fullResponse,
                  toolCalls: toolCallsData.length > 0 ? JSON.stringify(toolCallsData) : null,
                },
              });

              await db.conversation.update({
                where: { id: conversation.id },
                data: { updatedAt: new Date() },
              });
            } catch (e) {
              console.error("Failed to save message to DB:", e);
            }
          } else {
            // Update conversation in Blobs with new message count and save messages
            try {
              const convStore = getStore("conversations");
              const existing = await convStore.get(`user:${userId}`, { type: "json" }) as { id: string; updatedAt: string; messageCount: number }[] || [];
              const existingArr = Array.isArray(existing) ? existing : [];
              const conv = existingArr.find(c => c.id === conversation.id);
              if (conv) {
                conv.updatedAt = new Date().toISOString();
                conv.messageCount = (conv.messageCount || 0) + 2; // user + assistant
                await convStore.setJSON(`user:${userId}`, existingArr);
              }

              // Save messages to Blobs for persistence across sessions
              const msgStore = getStore("conversation-messages");
              let existingMessages: { role: string; content: string; createdAt: string }[] = [];
              try {
                const stored = await msgStore.get(`conv:${conversation.id}`, { type: "json" }) as typeof existingMessages | null;
                if (stored) existingMessages = stored;
              } catch {
                // No existing messages
              }
              existingMessages.push(
                { role: "user", content: message, createdAt: new Date().toISOString() },
                { role: "assistant", content: fullResponse, createdAt: new Date().toISOString() }
              );
              await msgStore.setJSON(`conv:${conversation.id}`, existingMessages);
            } catch {
              // Non-critical
            }
          }

          const doneData = JSON.stringify({
            type: "done",
            conversationId: conversation.id,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
          clearTimeout(timeout);
          controller.close();
        } catch (error) {
          clearTimeout(timeout);
          console.error("Agent error:", error);
          const errorMsg = error instanceof Error ? error.message : "An error occurred";
          // Provide more helpful error messages
          let friendlyError = errorMsg;
          if (errorMsg.includes("404") || errorMsg.includes("Not Found") || errorMsg.includes("model_not_found")) {
            friendlyError = "The selected model returned a 404 error. Try switching to a different model (e.g. Claude Sonnet 4.5 or GPT-4o) using the model selector.";
          } else if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("ECONNREFUSED") || errorMsg.includes("fetch failed")) {
            friendlyError = "Could not connect to the AI provider. Please try a different model or check Settings > AI Models.";
          } else if (errorMsg.includes("401") || errorMsg.includes("Unauthorized") || errorMsg.includes("invalid_api_key")) {
            friendlyError = "Invalid API key. Please update your API key in Settings > AI Models.";
          } else if (errorMsg.includes("429") || errorMsg.includes("rate_limit")) {
            friendlyError = "Rate limited by the AI provider. Please wait a moment and try again.";
          } else if (errorMsg.includes("No AI provider")) {
            friendlyError = errorMsg;
          }
          const errorData = JSON.stringify({ type: "error", error: friendlyError });
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
