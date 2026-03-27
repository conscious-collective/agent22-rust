import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div className={cn(
      "min-w-[140px] rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-colors",
      selected ? "border-primary" : "border-amber-400"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-amber-400" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-amber-100">
          <GitBranch className="h-3 w-3 text-amber-600" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600">Condition</span>
      </div>
      <p className="text-xs font-medium truncate">{String(data?.label ?? "Condition")}</p>
      {data?.condition ? <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{String(data.condition)}</p> : null}
      <Handle type="source" position={Position.Bottom} id="true" className="!bg-emerald-400 !left-[30%]" />
      <Handle type="source" position={Position.Bottom} id="false" className="!bg-red-400 !left-[70%]" />
    </div>
  );
}
