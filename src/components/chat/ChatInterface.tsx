"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { toast } from "@/components/ui/use-toast";

interface ToolCallData {
  name: string;
  args: Record<string, unknown>;
  result?: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolCalls?: string | ToolCallData[] | null;
  isStreaming?: boolean;
  streamingToolCalls?: { name: string; args: Record<string, unknown> }[];
}

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
}

export default function ChatInterface({
  conversationId: initialConversationId,
  initialMessages = [],
}: ChatInterfaceProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | undefined
  >(initialConversationId);

  const sendMessage = useCallback(
    async (content: string) => {
      if (isLoading) return;

      const userMessage: Message = { role: "user", content };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            conversationId: currentConversationId,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to send message");
        }

        if (!response.body) throw new Error("No response body");

        // Add streaming assistant message
        const assistantMessageId = `streaming-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            isStreaming: true,
            streamingToolCalls: [],
          },
        ]);
        setIsLoading(false);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let newConversationId = currentConversationId;
        const activeToolCalls: ToolCallData[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;

            try {
              const chunk = JSON.parse(jsonStr);

              if (chunk.type === "text") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: m.content + chunk.content }
                      : m
                  )
                );
              } else if (chunk.type === "tool_call") {
                const newTc = { name: chunk.toolName, args: chunk.toolArgs };
                activeToolCalls.push({ ...newTc });
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          streamingToolCalls: [
                            ...(m.streamingToolCalls || []),
                            newTc,
                          ],
                        }
                      : m
                  )
                );
              } else if (chunk.type === "tool_result") {
                const tc = activeToolCalls.find(
                  (t) => t.name === chunk.toolName && !t.result
                );
                if (tc) tc.result = chunk.toolResult;
              } else if (chunk.type === "done") {
                newConversationId = chunk.conversationId;
                setCurrentConversationId(chunk.conversationId);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMessageId
                      ? {
                          ...m,
                          isStreaming: false,
                          streamingToolCalls: undefined,
                          toolCalls:
                            activeToolCalls.length > 0 ? activeToolCalls : null,
                        }
                      : m
                  )
                );

                // Navigate to new conversation
                if (!initialConversationId && newConversationId) {
                  router.push(`/chat/${newConversationId}`);
                }
              } else if (chunk.type === "error") {
                throw new Error(chunk.error);
              }
            } catch (parseError) {
              if (parseError instanceof SyntaxError) continue;
              throw parseError;
            }
          }
        }
      } catch (error) {
        setIsLoading(false);
        setMessages((prev) =>
          prev.filter((m) => !m.isStreaming)
        );

        const errorMsg =
          error instanceof Error ? error.message : "An error occurred";
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [isLoading, currentConversationId, initialConversationId, router]
  );

  return (
    <div className="flex flex-col h-full">
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSend={sendMessage} isLoading={isLoading} />
    </div>
  );
}
