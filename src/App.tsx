import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Onboarding } from "@/pages/Onboarding";
import { Chat } from "@/pages/Chat";
import { ModelStatusListener } from "@/components/ModelStatus";
import { useAppStore } from "@/store/app";

export default function App() {
  const { onboarded, setOnboarded, setModelStatus, modelStatus } = useAppStore();

  useEffect(() => {
    // check_onboarded = lead was submitted (gates the first report)
    invoke<boolean>("check_onboarded").then((submitted) => {
      useAppStore.getState().setLeadSubmitted(submitted);
    });

    // Model status — if model is ready or was previously downloaded, skip welcome
    invoke<{ status: string; progress: number }>("get_model_status").then(
      ({ status, progress }) => {
        setModelStatus(status as any);
        useAppStore.getState().setModelProgress(progress);
        // If model is already set up, go straight to chat
        if (status === "ready" || status === "loading") {
          setOnboarded(true);
        }
      }
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <ModelStatusListener />
      {onboarded ? <Chat /> : <Onboarding />}
    </>
  );
}
