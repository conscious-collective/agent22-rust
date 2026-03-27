import { useState } from "react";
import { Plus, Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AgentCard } from "@/components/agents/AgentCard";
import { CreateAgentDialog } from "@/components/agents/CreateAgentDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useAgents, useDeleteAgent } from "@/hooks/use-agents";

export function Agents() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: agents = [], isLoading } = useAgents();
  const { mutate: deleteAgent } = useDeleteAgent();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <h1 className="text-sm font-semibold">Agents</h1>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Create Agent
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : agents.length === 0 ? (
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Create your first AI agent to get started."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Agent
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3 2xl:grid-cols-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onChat={(id) => navigate(`/agents/${id}`)}
                onDelete={(id) => deleteAgent(id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateAgentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
