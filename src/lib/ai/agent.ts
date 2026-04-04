import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources/chat/completions";
import { tools } from "./tools";
import { buildSystemPrompt } from "./prompts";
import { searchWeb } from "@/lib/integrations/search";
import {
  createRepository,
  getAuthenticatedUser,
  pushFiles,
} from "@/lib/integrations/github";
import { createProject as createVercelProject } from "@/lib/integrations/vercel";
import { db, getDatabaseUrl } from "@/lib/db";
import { getStore } from "@netlify/blobs";

export type AIProvider = "openai" | "anthropic";

interface ProjectContext {
  projects?: { id: string; name: string; description?: string | null; type: string; status: string; githubRepo?: string | null; vercelUrl?: string | null }[];
  currentProjectId?: string;
  currentProjectName?: string;
  currentProjectType?: string;
  conversationCount?: number;
  userName?: string;
  hasGithub?: boolean;
  hasVercel?: boolean;
  mode?: "chat" | "build" | "saas-upgrade";
}

interface AgentConfig {
  openaiKey?: string;
  anthropicKey?: string;
  githubToken?: string;
  vercelToken?: string;
  tavilyKey?: string;
  userId: string;
  conversationId: string;
  model?: string;
  provider?: AIProvider;
  projectContext?: ProjectContext;
}

interface MessageParam {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageFunctionToolCall[];
}

// Convert OpenAI-style tools to Anthropic tools
function toAnthropicTools(): Anthropic.Tool[] {
  return tools
    .filter((tool): tool is { type: "function"; function: { name: string; description?: string; parameters?: Record<string, unknown> } } =>
      tool.type === "function" && "function" in tool && typeof (tool as { function?: unknown }).function === "object"
    )
    .map((tool) => ({
      name: tool.function.name,
      description: tool.function.description || "",
      input_schema: (tool.function.parameters || {}) as Anthropic.Tool.InputSchema,
    }));
}

/**
 * Detect available AI provider based on environment variables.
 * Netlify AI Gateway auto-injects ANTHROPIC_API_KEY/ANTHROPIC_BASE_URL
 * and OPENAI_API_KEY/OPENAI_BASE_URL — no user API keys required.
 */
function detectAvailableProvider(config: AgentConfig): { provider: AIProvider; apiKey?: string; baseURL?: string } | null {
  // Check Anthropic (preferred - available via Netlify AI Gateway)
  const anthropicKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    return { provider: "anthropic", apiKey: anthropicKey, baseURL: process.env.ANTHROPIC_BASE_URL };
  }

  // Check OpenAI (also available via Netlify AI Gateway)
  const openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return { provider: "openai", apiKey: openaiKey, baseURL: process.env.OPENAI_BASE_URL };
  }

  return null;
}

async function runOpenAIAgent(
  messages: MessageParam[],
  config: AgentConfig,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, args: Record<string, unknown>) => void,
  onToolResult: (toolName: string, result: string) => void,
  apiKey: string,
  baseURL?: string
): Promise<string> {
  // Use user's own API key directly when provided (bypasses Netlify AI Gateway = cheaper).
  // Fall back to zero-config gateway constructor when only env vars are present.
  const envKey = process.env.OPENAI_API_KEY;
  const envBase = process.env.OPENAI_BASE_URL;
  const hasUserKey = !!config.openaiKey && config.openaiKey !== envKey;
  const useGateway = !hasUserKey && !!(envKey && envBase);
  const openai = useGateway
    ? new OpenAI()
    : new OpenAI({ apiKey: hasUserKey ? config.openaiKey : apiKey, ...(hasUserKey ? {} : baseURL ? { baseURL } : {}) });

  const model = config.model || "gpt-4o-mini";

  // Reasoning models (o-series) don't support system messages or max_tokens
  const isReasoningModel = model.startsWith("o");
  const systemPrompt = buildSystemPrompt(config.projectContext);

  const allMessages: MessageParam[] = isReasoningModel
    ? [{ role: "user", content: `[System Instructions]\n${systemPrompt}\n\n[End System Instructions]` }, ...messages]
    : [{ role: "system", content: systemPrompt }, ...messages];

  let finalResponse = "";
  let continueLoop = true;

  while (continueLoop) {
    const stream = await openai.chat.completions.create({
      model,
      messages: allMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools,
      tool_choice: "auto",
      stream: true,
      ...(isReasoningModel ? {} : { max_tokens: 16000 }),
    });

    let currentContent = "";
    let toolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    const toolCallAccumulator: Record<number, { id: string; name: string; arguments: string }> = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        currentContent += delta.content;
        onChunk(delta.content);
        finalResponse += delta.content;
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (!toolCallAccumulator[idx]) {
            toolCallAccumulator[idx] = { id: tc.id ?? "", name: tc.function?.name ?? "", arguments: "" };
          }
          if (tc.id) toolCallAccumulator[idx].id = tc.id;
          if (tc.function?.name) toolCallAccumulator[idx].name = tc.function.name;
          if (tc.function?.arguments) toolCallAccumulator[idx].arguments += tc.function.arguments;
        }
      }

      if (chunk.choices[0]?.finish_reason === "tool_calls") {
        toolCalls = Object.values(toolCallAccumulator).map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        }));
      }
    }

    const assistantMessage: MessageParam = { role: "assistant", content: currentContent };
    if (toolCalls.length > 0) assistantMessage.tool_calls = toolCalls;
    allMessages.push(assistantMessage);

    if (toolCalls.length === 0) {
      continueLoop = false;
    } else {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }

        onToolCall(toolName, args);
        let toolResult = "";
        try { toolResult = await executeToolCall(toolName, args, config); } catch (error) {
          toolResult = `Error executing ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
        onToolResult(toolName, toolResult);
        allMessages.push({ role: "tool", content: toolResult, tool_call_id: toolCall.id });
      }
    }
  }

  return finalResponse;
}

async function runAnthropicAgent(
  messages: MessageParam[],
  config: AgentConfig,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, args: Record<string, unknown>) => void,
  onToolResult: (toolName: string, result: string) => void,
  apiKey: string,
  baseURL?: string
): Promise<string> {
  // Use user's own API key directly when provided (bypasses Netlify AI Gateway = cheaper).
  // Fall back to zero-config gateway constructor when only env vars are present.
  const envKey = process.env.ANTHROPIC_API_KEY;
  const envBase = process.env.ANTHROPIC_BASE_URL;
  const hasUserKey = !!config.anthropicKey && config.anthropicKey !== envKey;
  const useGateway = !hasUserKey && !!(envKey && envBase);
  const anthropic = useGateway
    ? new Anthropic()
    : new Anthropic({ apiKey: hasUserKey ? config.anthropicKey : apiKey, ...(hasUserKey ? {} : baseURL ? { baseURL } : {}) });

  const model = config.model || "claude-haiku-4-5";
  const anthropicTools = toAnthropicTools();

  const systemPrompt = buildSystemPrompt(config.projectContext);

  type AnthropicMessage = Anthropic.MessageParam;
  const allMessages: AnthropicMessage[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.content })) as AnthropicMessage[];

  let finalResponse = "";
  let continueLoop = true;

  while (continueLoop) {
    const stream = await anthropic.messages.create({
      model,
      system: systemPrompt,
      messages: allMessages,
      tools: anthropicTools,
      max_tokens: 16000,
      stream: true,
    });

    let currentContent = "";
    const toolUses: { id: string; name: string; input: Record<string, unknown> }[] = [];
    let currentToolUse: { id: string; name: string; inputJson: string } | null = null;

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        if (event.content_block.type === "tool_use") {
          currentToolUse = { id: event.content_block.id, name: event.content_block.name, inputJson: "" };
        }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          currentContent += event.delta.text;
          onChunk(event.delta.text);
          finalResponse += event.delta.text;
        } else if (event.delta.type === "input_json_delta" && currentToolUse) {
          currentToolUse.inputJson += event.delta.partial_json;
        }
      } else if (event.type === "content_block_stop") {
        if (currentToolUse) {
          let input: Record<string, unknown> = {};
          try { input = JSON.parse(currentToolUse.inputJson); } catch { input = {}; }
          toolUses.push({ id: currentToolUse.id, name: currentToolUse.name, input });
          currentToolUse = null;
        }
      }
    }

    // Add assistant turn
    const assistantContent: Anthropic.MessageParam["content"] = [];
    if (currentContent) (assistantContent as { type: string; text: string }[]).push({ type: "text", text: currentContent });
    for (const tu of toolUses) {
      (assistantContent as { type: string; id: string; name: string; input: Record<string, unknown> }[]).push({ type: "tool_use", id: tu.id, name: tu.name, input: tu.input });
    }
    allMessages.push({ role: "assistant", content: assistantContent });

    if (toolUses.length === 0) {
      continueLoop = false;
    } else {
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const tu of toolUses) {
        onToolCall(tu.name, tu.input);
        let result = "";
        try { result = await executeToolCall(tu.name, tu.input, config); } catch (error) {
          result = `Error executing ${tu.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        }
        onToolResult(tu.name, result);
        toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
      }
      allMessages.push({ role: "user", content: toolResults });
    }
  }

  return finalResponse;
}

export async function runAgent(
  messages: MessageParam[],
  config: AgentConfig,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, args: Record<string, unknown>) => void,
  onToolResult: (toolName: string, result: string) => void
): Promise<string> {
  const requestedProvider = config.provider || "anthropic";

  // Try the requested provider first
  try {
    if (requestedProvider === "anthropic") {
      const anthropicKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY;
      if (anthropicKey) {
        return await runAnthropicAgent(messages, config, onChunk, onToolCall, onToolResult, anthropicKey, process.env.ANTHROPIC_BASE_URL);
      }
    }

    if (requestedProvider === "openai") {
      const openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
      if (openaiKey) {
        return await runOpenAIAgent(messages, config, onChunk, onToolCall, onToolResult, openaiKey, process.env.OPENAI_BASE_URL);
      }
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(`Failed with requested provider ${requestedProvider}:`, errMsg);

    // If the requested provider failed, try the OTHER provider as fallback
    const fallbackProvider = requestedProvider === "openai" ? "anthropic" : "openai";
    try {
      if (fallbackProvider === "anthropic") {
        const anthropicKey = config.anthropicKey || process.env.ANTHROPIC_API_KEY;
        if (anthropicKey) {
          // Override the model to a valid Anthropic model when falling back
          const fallbackConfig = { ...config, model: "claude-haiku-4-5", provider: "anthropic" as AIProvider };
          return await runAnthropicAgent(messages, fallbackConfig, onChunk, onToolCall, onToolResult, anthropicKey, process.env.ANTHROPIC_BASE_URL);
        }
      } else {
        const openaiKey = config.openaiKey || process.env.OPENAI_API_KEY;
        if (openaiKey) {
          const fallbackConfig = { ...config, model: "gpt-4o-mini", provider: "openai" as AIProvider };
          return await runOpenAIAgent(messages, fallbackConfig, onChunk, onToolCall, onToolResult, openaiKey, process.env.OPENAI_BASE_URL);
        }
      }
    } catch (fallbackError) {
      console.error(`Fallback provider ${fallbackProvider} also failed:`, fallbackError);
      // Throw the original error for better diagnostics
      throw error;
    }

    // If we got here, fallback provider had no key available
    throw error;
  }

  // If no key for the requested provider, auto-detect
  const detected = detectAvailableProvider(config);
  if (detected) {
    try {
      if (detected.provider === "anthropic") {
        return await runAnthropicAgent(messages, config, onChunk, onToolCall, onToolResult, detected.apiKey!, detected.baseURL);
      }
      return await runOpenAIAgent(messages, config, onChunk, onToolCall, onToolResult, detected.apiKey!, detected.baseURL);
    } catch (error) {
      console.error(`Failed with auto-detected provider ${detected.provider}:`, error);
      throw error;
    }
  }

  throw new Error(
    "No AI provider available. Netlify AI Gateway provides Claude and GPT automatically — no API keys needed. " +
    "If this error persists, the site may need a production deploy to activate AI Gateway."
  );
}

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  config: AgentConfig
): Promise<string> {
  switch (toolName) {
    case "web_search": {
      const tavilyKey = config.tavilyKey || process.env.TAVILY_API_KEY;
      if (!tavilyKey) {
        return "Web search is not available. Please add your Tavily API key in Settings > Integrations.";
      }
      return await searchWeb(args.query as string, tavilyKey);
    }

    case "create_github_repo": {
      if (!config.githubToken) {
        return "GitHub integration is not configured. Please add your GitHub token in Settings > Integrations.";
      }
      const repo = await createRepository(
        config.githubToken,
        args.name as string,
        args.description as string,
        (args.private as boolean) ?? false
      );
      return `Successfully created GitHub repository!\n- URL: ${repo.url}\n- Full name: ${repo.fullName}`;
    }

    case "push_code_to_github": {
      if (!config.githubToken) {
        return "GitHub integration is not configured. Please add your GitHub token in Settings > Integrations.";
      }
      const owner = await getAuthenticatedUser(config.githubToken);
      const files = args.files as { path: string; content: string }[];
      await pushFiles(
        config.githubToken,
        owner,
        args.repo as string,
        files,
        args.message as string
      );
      return `Successfully pushed ${files.length} file(s) to GitHub repository '${args.repo}'.\nCommit message: ${args.message}`;
    }

    case "create_vercel_project": {
      if (!config.vercelToken) {
        return "Vercel integration is not configured. Please add your Vercel token in Settings > Integrations.";
      }
      const project = await createVercelProject(
        config.vercelToken,
        args.name as string,
        args.githubRepo as string | undefined
      );
      return `Successfully created Vercel project!\n- Project ID: ${project.id}\n- URL: ${project.url}`;
    }

    case "save_artifact": {
      const title = args.title as string || "Untitled";
      const files = args.files as { path: string; content: string }[];
      const artifactProjectId = args.projectId as string | undefined;

      if (!files || files.length === 0) {
        return "No files provided to save.";
      }

      try {
        const store = getStore("artifacts");
        const artifactId = `art_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const artifact = {
          id: artifactId,
          userId: config.userId,
          projectId: artifactProjectId || config.projectContext?.currentProjectId || null,
          title,
          type: "code",
          files,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save individual artifact
        await store.setJSON(artifactId, artifact);

        // Add to user's artifact index
        const indexKey = `user:${config.userId}`;
        const existing = await store.get(indexKey, { type: "json" }) as { id: string; title: string; fileCount: number; createdAt: string }[] || [];
        const existingArr = Array.isArray(existing) ? existing : [];
        existingArr.unshift({ id: artifactId, title, fileCount: files.length, createdAt: artifact.createdAt });
        await store.setJSON(indexKey, existingArr);

        const fileList = files.map(f => `  - ${f.path}`).join("\n");
        return `Saved ${files.length} file(s) as "${title}" (ID: ${artifactId}):\n${fileList}\n\nThese files are now stored and available in the Code panel.`;
      } catch (error) {
        console.error("Failed to save artifact:", error);
        return `Generated ${files.length} file(s) for "${title}" — displayed in the Code panel. (Storage unavailable, but code is visible in the conversation.)`;
      }
    }

    case "create_project_record": {
      const projectName = args.name as string;
      const projectData = {
        name: projectName,
        description: args.description as string,
        type: (args.type as string) ?? "saas",
        githubRepo: args.githubRepo as string | undefined,
        vercelUrl: args.vercelUrl as string | undefined,
        userId: config.userId,
        status: "active",
      };

      // Try database first
      if (getDatabaseUrl()) {
        try {
          const project = await db.project.create({ data: projectData });
          return `Project '${project.name}' has been saved to your dashboard with ID: ${project.id}`;
        } catch (error) {
          console.error("Failed to create project in DB:", error);
          // Fall through to Blobs
        }
      }

      // Fallback to Netlify Blobs
      try {
        const store = getStore("projects");
        const newProject = {
          id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          ...projectData,
          githubRepo: projectData.githubRepo || null,
          vercelUrl: projectData.vercelUrl || null,
          description: projectData.description || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const existing = await store.get(`user:${config.userId}`, { type: "json" }) as unknown[] || [];
        (existing as unknown[]).unshift(newProject);
        await store.setJSON(`user:${config.userId}`, existing);
        return `Project '${projectName}' has been saved to your dashboard with ID: ${newProject.id}`;
      } catch (error) {
        console.error("Failed to create project in Blobs:", error);
        return `Project '${projectName}' could not be saved due to a storage error, but the details are recorded in this conversation.`;
      }
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
