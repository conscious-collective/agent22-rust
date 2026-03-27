import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

export function AgentNode({ data, selected }: NodeProps) {
  return (
    <div className={cn(
      "min-w-[140px] rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-colors",
      selected ? "border-primary" : "border-blue-400"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-100">
          <Bot className="h-3 w-3 text-blue-600" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">Agent</span>
      </div>
      <p className="text-xs font-medium truncate">{String(data?.label ?? "Agent")}</p>
      {data?.agentId ? <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{String(data.agentId)}</p> : null}
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400" />
    </div>
  );
}
