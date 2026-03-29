"use client";

import type {
  StorageProvider,
  ProjectRecord,
  ConversationRecord,
  MessageRecord,
  GenerationRecord,
  ArtifactRecord,
  ConnectivitySetup,
} from "./types";

function generateId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function now(): string {
  return new Date().toISOString();
}

const DB_NAME = "dobetter-viber";
const DB_VERSION = 1;
const STORES = [
  "projects",
  "conversations",
  "messages",
  "generations",
  "artifacts",
  "connectivitySetups",
  "settings",
] as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          const s = db.createObjectStore(store, { keyPath: "id" });
          if (store === "messages") {
            s.createIndex("conversationId", "conversationId", { unique: false });
          }
          if (store !== "settings") {
            s.createIndex("userId", "userId", { unique: false });
          }
        }
      }
    };
  });
}

function tx<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

function txGetAll<T>(storeName: string, indexName: string, value: string): Promise<T[]> {
  return openDB().then(
    (db) =>
      new Promise<T[]>((resolve, reject) => {
        const transaction = db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.getAll(value);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      })
  );
}

export class LocalStorageProvider implements StorageProvider {
  async getProjects(userId: string): Promise<ProjectRecord[]> {
    const all = await txGetAll<ProjectRecord>("projects", "userId", userId);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async createProject(data: Omit<ProjectRecord, "id" | "createdAt" | "updatedAt">): Promise<ProjectRecord> {
    const record: ProjectRecord = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
    await tx("projects", "readwrite", (store) => store.put(record));
    return record;
  }

  async getConversations(userId: string): Promise<ConversationRecord[]> {
    const all = await txGetAll<ConversationRecord>("conversations", "userId", userId);
    return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getConversation(id: string, userId: string): Promise<(ConversationRecord & { messages: MessageRecord[] }) | null> {
    const conv = await tx<ConversationRecord | undefined>("conversations", "readonly", (store) => store.get(id));
    if (!conv || conv.userId !== userId) return null;
    const messages = await txGetAll<MessageRecord>("messages", "conversationId", id);
    messages.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return { ...conv, messages };
  }

  async createConversation(data: { title: string; userId: string }): Promise<ConversationRecord> {
    const record: ConversationRecord = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
    await tx("conversations", "readwrite", (store) => store.put(record));
    return record;
  }

  async updateConversation(id: string, data: Partial<ConversationRecord>): Promise<void> {
    const existing = await tx<ConversationRecord | undefined>("conversations", "readonly", (store) => store.get(id));
    if (existing) {
      const updated = { ...existing, ...data, updatedAt: now() };
      await tx("conversations", "readwrite", (store) => store.put(updated));
    }
  }

  async deleteConversation(id: string, userId: string): Promise<void> {
    const conv = await tx<ConversationRecord | undefined>("conversations", "readonly", (store) => store.get(id));
    if (conv && conv.userId === userId) {
      await tx("conversations", "readwrite", (store) => store.delete(id));
      // Delete associated messages
      const messages = await txGetAll<MessageRecord>("messages", "conversationId", id);
      for (const msg of messages) {
        await tx("messages", "readwrite", (store) => store.delete(msg.id));
      }
    }
  }

  async createMessage(data: Omit<MessageRecord, "id" | "createdAt">): Promise<MessageRecord> {
    const record: MessageRecord = { ...data, id: generateId(), createdAt: now() };
    await tx("messages", "readwrite", (store) => store.put(record));
    return record;
  }

  async getGenerations(userId: string, projectId?: string): Promise<GenerationRecord[]> {
    const all = await txGetAll<GenerationRecord>("generations", "userId", userId);
    const filtered = projectId ? all.filter((g) => g.projectId === projectId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createGeneration(data: Omit<GenerationRecord, "id" | "createdAt" | "updatedAt">): Promise<GenerationRecord> {
    const record: GenerationRecord = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
    await tx("generations", "readwrite", (store) => store.put(record));
    return record;
  }

  async getArtifacts(userId: string, projectId?: string): Promise<ArtifactRecord[]> {
    const all = await txGetAll<ArtifactRecord>("artifacts", "userId", userId);
    const filtered = projectId ? all.filter((a) => a.projectId === projectId) : all;
    return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createArtifact(data: Omit<ArtifactRecord, "id" | "createdAt" | "updatedAt">): Promise<ArtifactRecord> {
    const record: ArtifactRecord = { ...data, id: generateId(), createdAt: now(), updatedAt: now() };
    await tx("artifacts", "readwrite", (store) => store.put(record));
    return record;
  }

  async getConnectivitySetups(userId: string): Promise<ConnectivitySetup[]> {
    const all = await txGetAll<ConnectivitySetup>("connectivitySetups", "userId", userId);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createConnectivitySetup(data: Omit<ConnectivitySetup, "id" | "createdAt">): Promise<ConnectivitySetup> {
    const record: ConnectivitySetup = { ...data, id: generateId(), createdAt: now() };
    await tx("connectivitySetups", "readwrite", (store) => store.put(record));
    return record;
  }

  async getUserSettings(userId: string): Promise<Record<string, string | null>> {
    const result = await tx<Record<string, string | null> | undefined>("settings", "readonly", (store) => store.get(userId));
    return result || {};
  }

  async updateUserSettings(userId: string, data: Record<string, string | null>): Promise<void> {
    const existing = await this.getUserSettings(userId);
    const updated = { ...existing, ...data, id: userId };
    await tx("settings", "readwrite", (store) => store.put(updated));
  }
}
