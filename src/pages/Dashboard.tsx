import { Bot, GitFork, Play, Plus, Puzzle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDaemonStore } from "@/store/daemon-store";
import { useAgents } from "@/hooks/use-agents";
import { useWorkflows } from "@/hooks/use-workflows";
import { formatRelativeTime } from "@/lib/utils";

// Starter templates
const TEMPLATES = [
  {
    id: "support",
    name: "Customer Support Bot",
    description: "Handle support tickets automatically with a dedicated agent.",
    steps: ["Trigger", "Agent", "Output"],
    icon: "🤖",
  },
  {
    id: "content",
    name: "Content Pipeline",
    description: "Draft, review, and publish content through a multi-step agent chain.",
    steps: ["Trigger", "Agent", "Condition", "Output"],
    icon: "✍️",
  },
  {
    id: "summarizer",
    name: "Data Summarizer",
    description: "Summarize long documents or data feeds into concise reports.",
    steps: ["Trigger", "Agent", "Agent", "Output"],
    icon: "📊",
  },
];

export function Dashboard() {
  const { status } = useDaemonStore();
  const { data: agents = [] } = useAgents();
  const { data: workflows = [] } = useWorkflows();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
        <h1 className="text-sm font-semibold">Dashboard</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error banner — only shown after auto-recovery failed */}
        {status === "error" && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-800">Something went wrong. Please restart the app.</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100">
                <Bot className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-xs text-muted-foreground">Agents</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100">
                <GitFork className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-xs text-muted-foreground">Workflows</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <Play className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">—</p>
                <p className="text-xs text-muted-foreground">Runs today</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Quick Actions</h2>
          <div className="flex gap-3">
            <Link to="/agents">
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Agent
              </Button>
            </Link>
            <Link to="/workflows/new">
              <Button variant="outline" size="sm">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Workflow
              </Button>
            </Link>
            <Link to="/skills">
              <Button variant="outline" size="sm">
                <Puzzle className="h-3.5 w-3.5 mr-1.5" />
                Browse Skills
              </Button>
            </Link>
          </div>
        </div>

        {/* Recent agents */}
        {agents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Recent Agents</h2>
              <Link to="/agents" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
            </div>
            <div className="space-y-2">
              {agents.slice(0, 3).map((agent) => (
                <div key={agent.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {agent.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    {agent.model && <p className="text-xs text-muted-foreground">{agent.model}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/agents/${agent.id}`)}>
                    Chat
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent workflows */}
        {workflows.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Recent Workflows</h2>
              <Link to="/workflows" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
            </div>
            <div className="space-y-2">
              {workflows.slice(0, 3).map((wf) => (
                <div key={wf.id} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100">
                    <GitFork className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{wf.name}</p>
                    <p className="text-xs text-muted-foreground">{wf.steps.length} steps · {formatRelativeTime(wf.updated_at)}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/workflows/${wf.id}`)}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Template gallery */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Start from a Template</h2>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATES.map((t) => (
              <Card
                key={t.id}
                className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                onClick={() => navigate("/workflows/new", { state: { template: t } })}
              >
                <CardContent className="p-4">
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <h3 className="text-sm font-semibold mb-1">{t.name}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
                  <div className="flex items-center gap-1">
                    {t.steps.map((step, i) => (
                      <span key={i} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{step}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
