import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

export function OutputNode({ data, selected }: NodeProps) {
  return (
    <div className={cn(
      "min-w-[140px] rounded-lg border-2 bg-card px-3 py-2 shadow-sm transition-colors",
      selected ? "border-primary" : "border-purple-400"
    )}>
      <Handle type="target" position={Position.Top} className="!bg-purple-400" />
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-purple-100">
          <Flag className="h-3 w-3 text-purple-600" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-purple-600">Output</span>
      </div>
      <p className="text-xs font-medium truncate">{String(data?.label ?? "Output")}</p>
      {data?.format ? <p className="text-[10px] text-muted-foreground mt-0.5">{String(data.format)}</p> : null}
    </div>
  );
}
