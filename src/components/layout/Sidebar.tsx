import { NavLink } from "react-router-dom";
import {
  Bot,
  GitFork,
  Home,
  Puzzle,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDaemonStore } from "@/store/daemon-store";
import { StatusBadge } from "@/components/common/StatusBadge";

const NAV = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/workflows", label: "Workflows", icon: GitFork },
  { to: "/skills", label: "Skills", icon: Puzzle },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { status, startDaemon, stopDaemon } = useDaemonStore();

  return (
    <aside className="flex h-full w-56 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm tracking-tight">agent22</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Daemon status footer */}
      <div className="border-t p-3">
        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
          <button
            onClick={status === "running" ? stopDaemon : startDaemon}
            disabled={status === "starting"}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {status === "running" ? "Stop" : "Start"}
          </button>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">OpenFang daemon</p>
      </div>
    </aside>
  );
}
