import { useWorkflowBuilderStore } from "@/store/workflow-builder-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { useAgents } from "@/hooks/use-agents";
import type { StepType } from "@/types/workflow";

const TYPE_LABELS: Record<StepType, string> = {
  trigger: "Trigger",
  agent: "Agent Step",
  condition: "Condition",
  output: "Output",
};

export function StepConfigPanel() {
  const { nodes, selectedNodeId, updateNodeData, deleteNode, selectNode } =
    useWorkflowBuilderStore();
  const { data: agents = [] } = useAgents();

  const node = nodes.find((n) => n.id === selectedNodeId);
  if (!node) return null;

  const type = node.type as StepType;
  const data = node.data as Record<string, string>;

  const update = (key: string, value: string) => updateNodeData(node.id, { [key]: value });

  return (
    <div className="w-64 border-l bg-card flex flex-col shrink-0">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">{TYPE_LABELS[type]}</p>
          <p className="text-sm font-medium truncate">{data.label}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => selectNode(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-xs font-medium mb-1 block">Label</label>
          <Input value={data.label ?? ""} onChange={(e) => update("label", e.target.value)} />
        </div>

        {type === "trigger" && (
          <div>
            <label className="text-xs font-medium mb-1 block">Schedule (cron)</label>
            <Input
              placeholder="0 9 * * 1-5"
              value={data.schedule ?? ""}
              onChange={(e) => update("schedule", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Leave empty for manual trigger
            </p>
          </div>
        )}

        {type === "agent" && (
          <>
            <div>
              <label className="text-xs font-medium mb-1 block">Agent</label>
              <Select value={data.agentId ?? ""} onChange={(e) => update("agentId", e.target.value)}>
                <option value="">Select agent…</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Prompt</label>
              <Textarea
                placeholder="Instruction to send to the agent…"
                value={data.prompt ?? ""}
                onChange={(e) => update("prompt", e.target.value)}
                rows={4}
                className="resize-none text-xs"
              />
            </div>
          </>
        )}

        {type === "condition" && (
          <div>
            <label className="text-xs font-medium mb-1 block">Condition expression</label>
            <Input
              placeholder="output.contains('error')"
              value={data.condition ?? ""}
              onChange={(e) => update("condition", e.target.value)}
            />
          </div>
        )}

        {type === "output" && (
          <div>
            <label className="text-xs font-medium mb-1 block">Format</label>
            <Select value={data.format ?? "text"} onChange={(e) => update("format", e.target.value)}>
              <option value="text">Plain text</option>
              <option value="json">JSON</option>
              <option value="markdown">Markdown</option>
            </Select>
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <Button
          variant="destructive"
          size="sm"
          className="w-full"
          onClick={() => deleteNode(node.id)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete Step
        </Button>
      </div>
    </div>
  );
}
