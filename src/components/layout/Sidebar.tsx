import { NavLink } from "react-router-dom";
import { Bot, GitFork, Home, Puzzle, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDaemonStore } from "@/store/daemon-store";

const NAV = [
  { to: "/", label: "Dashboard", icon: Home, end: true },
  { to: "/agents", label: "Agents", icon: Bot },
  { to: "/workflows", label: "Workflows", icon: GitFork },
  { to: "/skills", label: "Skills", icon: Puzzle },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { status } = useDaemonStore();

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

      {/* Subtle status dot — only visible when something is wrong */}
      {status === "error" && (
        <div className="border-t p-3">
          <p className="text-[11px] text-red-500">Something went wrong. Try restarting the app.</p>
        </div>
      )}
    </aside>
  );
}
