import { Bot, MessageSquare, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, getAgentInitials } from "@/lib/utils";
import type { Agent } from "@/types/agent";

interface Props {
  agent: Agent;
  onChat: (id: string) => void;
  onDelete: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  running: "bg-emerald-500",
  idle: "bg-zinc-400",
  error: "bg-red-500",
};

export function AgentCard({ agent, onChat, onDelete }: Props) {
  const statusDot = STATUS_COLORS[agent.state ?? "idle"] ?? "bg-zinc-400";

  return (
    <Card className="group relative hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Avatar + status */}
        <div className="flex items-start justify-between mb-3">
          <div className="relative">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
            )}>
              {getAgentInitials(agent.name) || <Bot className="h-5 w-5" />}
            </div>
            <span className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card", statusDot)} />
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onChat(agent.id)}>
              <MessageSquare className="h-3.5 w-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(agent.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Info */}
        <h3 className="font-medium text-sm truncate mb-0.5">{agent.name}</h3>
        {agent.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{agent.description}</p>
        )}

        {/* Model badge */}
        {agent.model && (
          <Badge variant="secondary" className="text-[10px] h-4">
            {agent.model}
          </Badge>
        )}

        {/* Tags */}
        {agent.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
