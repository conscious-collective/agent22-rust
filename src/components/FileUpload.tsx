import { useRef, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Upload, Loader2 } from "lucide-react";
import { useAppStore, AnalysisResult } from "@/store/app";

export function FileUpload() {
  const [dragging, setDragging] = useState(false);
  const {
    isAnalysing, setAnalysing, setAnalysisResult, setAnalysisContext,
    addMessage, modelStatus, leadSubmitted, setPendingAnalysis,
  } = useAppStore();

  async function handleFile(path: string) {
    if (isAnalysing || modelStatus !== "ready") return;

    setAnalysing(true);

    // Add a "user uploaded" message
    addMessage({
      id: Date.now().toString(),
      role: "user",
      content: `Uploaded: ${path.split(/[\\/]/).pop()}`,
    });

    // Placeholder assistant message
    addMessage({
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "Analysing your deals — discovering ICP patterns and computing Shapley attributions...",
      isStreaming: true,
    });

    try {
      const result = await invoke<AnalysisResult>("analyze_csv", { filePath: path });

      if (leadSubmitted) {
        // Lead already captured — show results immediately
        useAppStore.setState((s) => {
          const msgs = [...s.messages];
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            content: result.llm_narrative,
            isStreaming: false,
          };
          return { messages: msgs };
        });
        setAnalysisResult(result);
        const ctx = JSON.stringify({
          rationale: result.rubric.rationale,
          summary: result.summary,
          top_tier1: result.records
            .filter((r) => r.tier === "Tier 1")
            .slice(0, 5)
            .map((r) => ({ company: r.company, score: r.score.toFixed(0) })),
          key_drivers: result.summary.top_drivers,
        });
        setAnalysisContext(ctx);
      } else {
        // Hold result behind lead gate
        setPendingAnalysis(result);
      }
    } catch (err) {
      useAppStore.setState((s) => {
        const msgs = [...s.messages];
        msgs[msgs.length - 1] = {
          ...msgs[msgs.length - 1],
          content: `Analysis failed: ${err}`,
          isStreaming: false,
        };
        return { messages: msgs };
      });
    } finally {
      setAnalysing(false);
    }
  }

  async function openFilePicker() {
    if (isAnalysing || modelStatus !== "ready") return;
    const selected = await open({
      multiple: false,
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });
    if (selected && typeof selected === "string") {
      await handleFile(selected);
    }
  }

  return (
    <button
      onClick={openFilePicker}
      disabled={isAnalysing || modelStatus !== "ready"}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDrop={async (e) => {
        e.preventDefault();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files[0]) {
          // Tauri provides the path via the file drop event; use dialog for safety
          await openFilePicker();
        }
      }}
      className={`w-full flex items-center gap-2 px-3 py-2.5 text-[11px] font-display tracking-[0.12em] uppercase transition-all duration-200 border rounded-sm ${
        dragging
          ? "border-[#00e5ff] text-[#00e5ff] bg-[rgba(0,229,255,0.06)]"
          : isAnalysing || modelStatus !== "ready"
          ? "border-[#1a1a22] text-[#333] cursor-not-allowed"
          : "border-[#1a1a22] text-[#555] hover:border-[#00e5ff] hover:text-[#00e5ff] hover:bg-[rgba(0,229,255,0.03)]"
      }`}
    >
      {isAnalysing ? (
        <Loader2 size={12} className="animate-spin shrink-0" />
      ) : (
        <Upload size={12} className="shrink-0" />
      )}
      {isAnalysing ? "Analysing…" : "Upload Deals"}
    </button>
  );
}
