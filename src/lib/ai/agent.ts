import OpenAI from "openai";
import type { ChatCompletionMessageFunctionToolCall } from "openai/resources/chat/completions";
import { tools } from "./tools";
import { SYSTEM_PROMPT } from "./prompts";
import { searchWeb } from "@/lib/integrations/search";
import {
  createRepository,
  getAuthenticatedUser,
  pushFiles,
} from "@/lib/integrations/github";
import { createProject as createVercelProject } from "@/lib/integrations/vercel";
import { db } from "@/lib/db";

interface AgentConfig {
  openaiKey: string;
  githubToken?: string;
  vercelToken?: string;
  tavilyKey?: string;
  userId: string;
  conversationId: string;
}

interface MessageParam {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ChatCompletionMessageFunctionToolCall[];
}

export async function runAgent(
  messages: MessageParam[],
  config: AgentConfig,
  onChunk: (chunk: string) => void,
  onToolCall: (toolName: string, args: Record<string, unknown>) => void,
  onToolResult: (toolName: string, result: string) => void
): Promise<string> {
  const openai = new OpenAI({ apiKey: config.openaiKey });

  const systemMessage: MessageParam = {
    role: "system",
    content: SYSTEM_PROMPT,
  };

  const allMessages: MessageParam[] = [systemMessage, ...messages];

  let finalResponse = "";
  let continueLoop = true;

  while (continueLoop) {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: allMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
      tools,
      tool_choice: "auto",
      stream: true,
      max_tokens: 4096,
    });

    let currentContent = "";
    let toolCalls: ChatCompletionMessageFunctionToolCall[] = [];
    const toolCallAccumulator: Record<
      number,
      { id: string; name: string; arguments: string }
    > = {};

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        currentContent += delta.content;
        onChunk(delta.content);
        finalResponse += delta.content;
      }

      if (delta?.tool_calls) {
        for (const toolCallDelta of delta.tool_calls) {
          const idx = toolCallDelta.index;
          if (!toolCallAccumulator[idx]) {
            toolCallAccumulator[idx] = {
              id: toolCallDelta.id ?? "",
              name: toolCallDelta.function?.name ?? "",
              arguments: "",
            };
          }
          if (toolCallDelta.id) {
            toolCallAccumulator[idx].id = toolCallDelta.id;
          }
          if (toolCallDelta.function?.name) {
            toolCallAccumulator[idx].name = toolCallDelta.function.name;
          }
          if (toolCallDelta.function?.arguments) {
            toolCallAccumulator[idx].arguments +=
              toolCallDelta.function.arguments;
          }
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

    // Add assistant message to history
    const assistantMessage: MessageParam = {
      role: "assistant",
      content: currentContent,
    };
    if (toolCalls.length > 0) {
      assistantMessage.tool_calls = toolCalls;
    }
    allMessages.push(assistantMessage);

    if (toolCalls.length === 0) {
      continueLoop = false;
    } else {
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        let args: Record<string, unknown> = {};

        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          args = {};
        }

        onToolCall(toolName, args);

        let toolResult = "";

        try {
          toolResult = await executeToolCall(toolName, args, config);
        } catch (error) {
          toolResult = `Error executing ${toolName}: ${error instanceof Error ? error.message : "Unknown error"}`;
        }

        onToolResult(toolName, toolResult);

        allMessages.push({
          role: "tool",
          content: toolResult,
          tool_call_id: toolCall.id,
        });
      }
    }
  }

  return finalResponse;
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
