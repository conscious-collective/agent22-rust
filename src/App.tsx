import { useEffect } from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { Dashboard } from "@/pages/Dashboard";
import { Agents } from "@/pages/Agents";
import { AgentDetail } from "@/pages/AgentDetail";
import { Workflows } from "@/pages/Workflows";
import { WorkflowDetail } from "@/pages/WorkflowDetail";
import { Skills } from "@/pages/Skills";
import { Settings } from "@/pages/Settings";
import { queryClient } from "@/lib/query-client";
import { useDaemonStore } from "@/store/daemon-store";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "agents", element: <Agents /> },
      { path: "agents/:id", element: <AgentDetail /> },
      { path: "workflows", element: <Workflows /> },
      { path: "workflows/:id", element: <WorkflowDetail /> },
      { path: "skills", element: <Skills /> },
      { path: "settings", element: <Settings /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

function AppInit() {
  const { init } = useDaemonStore();

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    init().then((fn) => { cleanup = fn; });
    return () => cleanup?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppInit />
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
