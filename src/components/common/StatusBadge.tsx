import { cn } from "@/lib/utils";
import type { DaemonStatus } from "@/types/common";

interface Props {
  status: DaemonStatus | string;
  className?: string;
}

const STATUS_MAP: Record<string, { dot: string; label: string }> = {
  running: { dot: "bg-emerald-500", label: "Running" },
  starting: { dot: "bg-amber-400 animate-pulse", label: "Starting" },
  stopped: { dot: "bg-zinc-400", label: "Stopped" },
  error: { dot: "bg-red-500", label: "Error" },
  completed: { dot: "bg-emerald-500", label: "Completed" },
  failed: { dot: "bg-red-500", label: "Failed" },
  pending: { dot: "bg-amber-400", label: "Pending" },
};

export function StatusBadge({ status, className }: Props) {
  const cfg = STATUS_MAP[status] ?? { dot: "bg-zinc-400", label: status };
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground", className)}>
      <span className={cn("h-2 w-2 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}
