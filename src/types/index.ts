export interface User {
  id: string;
  name?: string | null;
  email: string;
  image?: string | null;
  createdAt: Date;
  githubToken?: string | null;
  vercelToken?: string | null;
  openaiKey?: string | null;
  tavilyKey?: string | null;
  stripeCustomerId?: string | null;
}

export interface Conversation {
  id: string;
  title: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: string | null;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  userId: string;
  status: string;
  githubRepo?: string | null;
  vercelUrl?: string | null;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: string;
}

export interface IntegrationSettings {
  openaiKey?: string;
  githubToken?: string;
  vercelToken?: string;
  tavilyKey?: string;
  stripeKey?: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description?: string;
  private: boolean;
  created_at: string;
}

export interface VercelProject {
  id: string;
  name: string;
  url?: string;
  framework?: string;
}

export interface StreamChunk {
  type: "text" | "tool_call" | "tool_result" | "done" | "error";
  content?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
}
