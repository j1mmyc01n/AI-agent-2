"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Bot, Cpu, Zap } from "lucide-react";

export type AIProvider = "openai" | "anthropic" | "grok";

export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description?: string;
}

export const AI_PROVIDERS: { id: AIProvider; name: string; icon: React.ReactNode; models: AIModel[] }[] = [
  {
    id: "anthropic",
    name: "Claude",
    icon: <Cpu className="h-4 w-4" />,
    models: [
      { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", description: "Best for coding" },
      { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "anthropic", description: "Fast & smart" },
      { id: "claude-sonnet-4-0", name: "Claude Sonnet 4", provider: "anthropic", description: "Reliable" },
      { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "anthropic", description: "Most capable" },
    ],
  },
  {
    id: "openai",
    name: "OpenAI",
    icon: <Bot className="h-4 w-4" />,
    models: [
      { id: "gpt-4o", name: "GPT-4o", provider: "openai", description: "Most capable" },
      { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "openai", description: "Fast & efficient" },
      { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", description: "Latest" },
    ],
  },
  {
    id: "grok",
    name: "Grok",
    icon: <Zap className="h-4 w-4" />,
    models: [
      { id: "grok-2-latest", name: "Grok 2", provider: "grok", description: "Latest from xAI" },
    ],
  },
];

export const DEFAULT_MODEL: AIModel = AI_PROVIDERS[0].models[0];

interface ModelSelectorProps {
  selectedModel: AIModel;
  onSelect: (model: AIModel) => void;
  compact?: boolean;
}

export default function ModelSelector({ selectedModel, onSelect, compact = false }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const provider = AI_PROVIDERS.find((p) => p.id === selectedModel.provider);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground h-7 px-2 border border-border/50 rounded-md ${compact ? "" : ""}`}
        >
          <span className="flex items-center gap-1">
            {provider?.icon}
            {!compact && <span className="hidden xs:inline text-muted-foreground">{provider?.name} /</span>}
            <span className="font-semibold text-foreground">{selectedModel.name}</span>
          </span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {AI_PROVIDERS.map((prov, idx) => (
          <div key={prov.id}>
            {idx > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide py-1.5">
              {prov.icon}
              {prov.name}
            </DropdownMenuLabel>
            <DropdownMenuGroup>
              {prov.models.map((model) => (
                <DropdownMenuItem
                  key={model.id}
                  className={`flex items-center justify-between cursor-pointer ${
                    selectedModel.id === model.id ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    onSelect(model);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium text-sm">{model.name}</span>
                  {model.description && (
                    <span className="text-xs text-muted-foreground ml-2">{model.description}</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
