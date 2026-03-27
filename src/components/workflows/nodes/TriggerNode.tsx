import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function TriggerNode({ data, selected }: NodeProps) {
  return (
    <div className={cn(
      "min-w-[140px] rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-colors",
      selected ? "border-primary" : "border-emerald-400"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-100">
          <Zap className="h-3 w-3 text-emerald-600" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">Trigger</span>
      </div>
      <p className="text-xs font-medium truncate">{String(data?.label ?? "Trigger")}</p>
      {data?.schedule ? <p className="text-[10px] text-muted-foreground mt-0.5">{String(data.schedule)}</p> : null}
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-400" />
    </div>
  );
}
