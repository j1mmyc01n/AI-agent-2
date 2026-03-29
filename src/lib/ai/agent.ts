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
import { db } from "@/lib/db";

export type AIProvider = "openai" | "anthropic" | "grok";

interface ProjectContext {
  projects?: { id: string; name: string; description?: string | null; type: string; status: string; githubRepo?: string | null; vercelUrl?: string | null }[];
  currentProjectId?: string;
  currentProjectName?: string;
  conversationCount?: number;
  userName?: string;
}

interface AgentConfig {
  openaiKey?: string;
  anthropicKey?: string;
  grokKey?: string;
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

async function runOpenAIAgent(
  messages: MessageParam[],
  config: AgentConfig,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, args: Record<string, unknown>) => void,
  onToolResult: (toolName: string, result: string) => void,
  apiKey: string,
  baseURL?: string
): Promise<string> {
  const openai = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  const model = config.model || (baseURL ? "grok-2-latest" : "gpt-4o");

  const systemPrompt = buildSystemPrompt(config.projectContext);
  const systemMessage: MessageParam = { role: "system", content: systemPrompt };
  const allMessages: MessageParam[] = [systemMessage, ...messages];

  let finalResponse = "";
  let continueLoop = true;

  while (continueLoop) {
    const stream = await openai.chat.completions.create({
      model,
      messages: allMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools,
      tool_choice: "auto",
      stream: true,
      max_tokens: 4096,
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
  apiKey: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const model = config.model || "claude-3-5-sonnet-20241022";
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
      max_tokens: 4096,
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
  const provider = config.provider || "openai";

  if (provider === "anthropic") {
    if (!config.anthropicKey) {
      throw new Error("No Anthropic API key configured. Please add one in Settings > AI Models.");
    }
    return runAnthropicAgent(messages, config, onChunk, onToolCall, onToolResult, config.anthropicKey);
  }

  if (provider === "grok") {
    if (!config.grokKey) {
      throw new Error("No Grok API key configured. Please add one in Settings > AI Models.");
    }
    return runOpenAIAgent(messages, config, onChunk, onToolCall, onToolResult, config.grokKey, "https://api.x.ai/v1");
  }

  // Default: OpenAI
  if (!config.openaiKey) {
    throw new Error("No OpenAI API key configured. Please add one in Settings > AI Models.");
  }
  return runOpenAIAgent(messages, config, onChunk, onToolCall, onToolResult, config.openaiKey);
}

async function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  config: AgentConfig
): Promise<string> {
  switch (toolName) {
    case "web_search": {
      if (!config.tavilyKey) {
        return "Web search is not available. Please add your Tavily API key in Settings > Integrations.";
      }
      return await searchWeb(args.query as string, config.tavilyKey);
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

    case "create_project_record": {
      const project = await db.project.create({
        data: {
          name: args.name as string,
          description: args.description as string,
          type: (args.type as string) ?? "saas",
          githubRepo: args.githubRepo as string | undefined,
          vercelUrl: args.vercelUrl as string | undefined,
          userId: config.userId,
          status: "active",
        },
      });
      return `Project '${project.name}' has been saved to your dashboard with ID: ${project.id}`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}
