export type StorageMode = "local" | "remote" | "external";

export interface StorageStatus {
  mode: StorageMode;
  connected: boolean;
  label: string;
  description: string;
}

export interface ProjectRecord {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  githubRepo: string | null;
  vercelUrl: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationRecord {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls: string | null;
  createdAt: string;
}

export interface GenerationRecord {
  id: string;
  projectId: string | null;
  userId: string;
  template: string;
  prompt: string;
  output: string;
  status: string;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactRecord {
  id: string;
  projectId: string | null;
  userId: string;
  type: string;
  title: string;
  content: string;
  metadata: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectivitySetup {
  id: string;
  projectId: string | null;
  userId: string;
  url: string;
  siteName: string;
  siteCategory: string;
  apiPathways: string[];
  authMethod: string;
  fallbackStrategy: string;
  envVars: { key: string; description: string }[];
  dbEntities: { name: string; fields: string[] }[];
  agentActions: string[];
  uiModule: string;
  createdAt: string;
}

export interface StorageProvider {
  // Projects
  getProjects(userId: string): Promise<ProjectRecord[]>;
  createProject(data: Omit<ProjectRecord, "id" | "createdAt" | "updatedAt">): Promise<ProjectRecord>;

  // Conversations
  getConversations(userId: string): Promise<ConversationRecord[]>;
  getConversation(id: string, userId: string): Promise<(ConversationRecord & { messages: MessageRecord[] }) | null>;
  createConversation(data: { title: string; userId: string }): Promise<ConversationRecord>;
  updateConversation(id: string, data: Partial<ConversationRecord>): Promise<void>;
  deleteConversation(id: string, userId: string): Promise<void>;

  // Messages
  createMessage(data: Omit<MessageRecord, "id" | "createdAt">): Promise<MessageRecord>;

  // Generations
  getGenerations(userId: string, projectId?: string): Promise<GenerationRecord[]>;
  createGeneration(data: Omit<GenerationRecord, "id" | "createdAt" | "updatedAt">): Promise<GenerationRecord>;

  // Artifacts
  getArtifacts(userId: string, projectId?: string): Promise<ArtifactRecord[]>;
  createArtifact(data: Omit<ArtifactRecord, "id" | "createdAt" | "updatedAt">): Promise<ArtifactRecord>;

  // Connectivity Setups
  getConnectivitySetups(userId: string): Promise<ConnectivitySetup[]>;
  createConnectivitySetup(data: Omit<ConnectivitySetup, "id" | "createdAt">): Promise<ConnectivitySetup>;

  // Settings (user keys)
  getUserSettings(userId: string): Promise<Record<string, string | null>>;
  updateUserSettings(userId: string, data: Record<string, string | null>): Promise<void>;
}
