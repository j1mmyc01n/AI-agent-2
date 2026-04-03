"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  History,
  MessageSquare,
  Sparkles,
  FileText,
  Loader2,
  ExternalLink,
} from "lucide-react";

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
  _count: { messages: number };
}

interface GenerationItem {
  id: string;
  template: string;
  prompt: string;
  output: string;
  model: string | null;
  createdAt: string;
}

export default function HistoryPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [generations, setGenerations] = useState<GenerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/conversations").then((r) => r.ok ? r.json() : []),
      fetch("/api/generate").then((r) => r.ok ? r.json() : []),
    ])
      .then(([convs, gens]) => {
        setConversations(convs);
        setGenerations(gens);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 sm:h-8 sm:w-8" />
              History & Artifacts
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Browse your conversations, generated outputs, and saved artifacts.
            </p>
          </div>

          <Tabs defaultValue="conversations">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="conversations" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Conversations
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">{conversations.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="generations" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Generations
                {generations.length > 0 && (
                  <Badge variant="secondary" className="text-xs ml-1">{generations.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="conversations">
              {conversations.length === 0 ? (
                <div className="text-center py-16">
                  <MessageSquare className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">No conversations yet</h2>
                  <p className="text-sm text-muted-foreground mb-4">Start a chat to see your history here.</p>
                  <Link href="/chat">
                    <Button>Start a Chat</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Link key={conv.id} href={`/chat/${conv.id}`}>
                      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardHeader className="py-3 px-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <CardTitle className="text-sm truncate">{conv.title}</CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                  {conv._count.messages} messages
                                </CardDescription>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {new Date(conv.updatedAt).toLocaleDateString()}
                              </span>
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="generations">
              {generations.length === 0 ? (
                <div className="text-center py-16">
                  <Sparkles className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                  <h2 className="text-lg font-semibold mb-2">No generations yet</h2>
                  <p className="text-sm text-muted-foreground mb-4">Use the Generate page to create AI outputs.</p>
                  <Link href="/generate">
                    <Button>Go to Generate</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {generations.map((gen) => (
                    <Card key={gen.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="secondary" className="text-xs">{gen.template}</Badge>
                            {gen.model && (
                              <Badge variant="outline" className="text-xs">{gen.model}</Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(gen.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{gen.prompt}</p>
                        <pre className="text-xs bg-muted/50 rounded-lg p-3 max-h-32 overflow-hidden whitespace-pre-wrap">
                          {gen.output.slice(0, 300)}
                          {gen.output.length > 300 && "..."}
                        </pre>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
}
