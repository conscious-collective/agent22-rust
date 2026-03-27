import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgentChatPanel } from "@/components/agents/AgentChatPanel";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAgent } from "@/hooks/use-agents";

export function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: agent, isLoading } = useAgent(id ?? "");

  if (isLoading) return <LoadingSpinner />;
  if (!agent) return (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      Agent not found.
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => navigate("/agents")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {agent.name[0]?.toUpperCase() ?? <Bot className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">{agent.name}</p>
            {agent.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{agent.description}</p>
            )}
          </div>
        </div>
        {agent.model && (
          <Badge variant="secondary" className="ml-auto text-[10px]">{agent.model}</Badge>
        )}
      </header>

      {/* Chat fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <AgentChatPanel agent={agent} />
      </div>
    </div>
  );
}
