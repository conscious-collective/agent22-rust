import { useLocation } from "react-router-dom";

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/agents": "Agents",
  "/workflows": "Workflows",
  "/skills": "Skills",
  "/settings": "Settings",
};

interface Props {
  actions?: React.ReactNode;
}

export function TopBar({ actions }: Props) {
  const location = useLocation();
  const title =
    TITLES[location.pathname] ??
    (location.pathname.startsWith("/agents/") ? "Agent" :
    location.pathname.startsWith("/workflows/") ? "Workflow" : "");

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
      <h1 className="text-sm font-semibold">{title}</h1>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
