import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "@/store/app";

export function ModelStatusListener() {
  const { setModelStatus, setModelProgress, setModelError } = useAppStore();

  useEffect(() => {
    const unlisten: Array<() => void> = [];

    listen<{ percent: number; downloaded_mb: number; total_mb: number }>(
      "model://progress",
      ({ payload }) => {
        setModelStatus("downloading");
        setModelProgress(payload.percent);
      }
    ).then((fn) => unlisten.push(fn));

    listen("model://loading", () => {
      setModelStatus("loading");
    }).then((fn) => unlisten.push(fn));

    listen("model://ready", () => {
      setModelStatus("ready");
      setModelProgress(100);
    }).then((fn) => unlisten.push(fn));

    listen<string>("model://error", ({ payload }) => {
      setModelStatus("error");
      setModelError(payload);
    }).then((fn) => unlisten.push(fn));

    return () => unlisten.forEach((fn) => fn());
  }, [setModelStatus, setModelProgress, setModelError]);

  return null;
}

interface ProgressBarProps {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: ProgressBarProps) {
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-[11px] font-display tracking-[0.15em] uppercase text-[#555]">
            {label}
          </span>
          <span className="text-[11px] font-display text-[#00e5ff] text-glow-cyan">
            {Math.round(progress)}%
          </span>
        </div>
      )}
      <div className="w-full h-[2px] bg-[#1a1a22] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#00e5ff] transition-all duration-300"
          style={{
            width: `${progress}%`,
            boxShadow: "0 0 8px rgba(0,229,255,0.6)",
          }}
        />
      </div>
    </div>
  );
}
