import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Onboarding } from "@/pages/Onboarding";
import { AgentList } from "@/pages/AgentList";
import { Chat } from "@/pages/Chat";
import { ModelStatusListener } from "@/components/ModelStatus";
import { useAppStore } from "@/store/app";

export default function App() {
  const { onboarded, setOnboarded, setModelStatus, selectedAgent } = useAppStore();

  useEffect(() => {
    invoke<{ status: string; progress: number }>("get_model_status").then(
      ({ status, progress }) => {
        setModelStatus(status as any);
        useAppStore.getState().setModelProgress(progress);
        // If model is already present (downloaded/loading/ready), skip onboarding
        if (status !== "not_downloaded") {
          setOnboarded(true);
        }
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ModelStatusListener />
      {!onboarded ? (
        <Onboarding />
      ) : selectedAgent ? (
        <Chat />
      ) : (
        <AgentList />
      )}
    </>
  );
}
