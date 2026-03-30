import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Send, Loader2 } from "lucide-react";
import { ChatMessage as ChatMsg } from "@/components/ChatMessage";
import { FileUpload } from "@/components/FileUpload";
import { AnalysisTable } from "@/components/AnalysisTable";
import { LeadGate } from "@/components/LeadGate";
import { ProgressBar } from "@/components/ModelStatus";
import { useAppStore } from "@/store/app";

export function Chat() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    addMessage,
    updateLastMessage,
    isGenerating,
    setGenerating,
    analysisResult,
    analysisContext,
    modelStatus,
    modelProgress,
  } = useAppStore();

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for streaming tokens
  useEffect(() => {
    const unlisten: Array<() => void> = [];

    listen<string>("model://token", ({ payload }) => {
      updateLastMessage(payload);
    }).then((fn) => unlisten.push(fn));

    listen("model://done", () => {
      updateLastMessage("", true);
      setGenerating(false);
    }).then((fn) => unlisten.push(fn));

    return () => unlisten.forEach((fn) => fn());
  }, [updateLastMessage, setGenerating]);

  // Show welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      addMessage({
        id: "welcome",
        role: "assistant",
        content:
          "Hi. I'm your ICP advisor.\n\nUpload a CSV of your deals to get started — I'll analyse your pipeline, score every account, and explain what's driving each result.",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage() {
    const text = input.trim();
    if (!text || isGenerating || modelStatus !== "ready") return;

    setInput("");

    addMessage({ id: Date.now().toString(), role: "user", content: text });
    addMessage({ id: (Date.now() + 1).toString(), role: "assistant", content: "", isStreaming: true });
    setGenerating(true);

    const history = useAppStore.getState().messages
      .filter((m) => !m.isStreaming && m.id !== "welcome")
      .slice(-12) // keep last 12 for context window
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await invoke("send_message", {
        messages: history,
        analysisContext: analysisContext,
      });
    } catch (err) {
      updateLastMessage(`Error: ${err}`, true);
      setGenerating(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isModelSetup = modelStatus === "ready";
  const isModelBusy  = modelStatus === "downloading" || modelStatus === "loading";

  return (
    <div className="grain scanline h-full flex bg-[#060608]">
      <LeadGate />
      {/* ── Left sidebar ── */}
      <aside
        className="w-[220px] shrink-0 flex flex-col border-r border-[#1a1a22] p-4 gap-4"
        style={{ background: "#060608" }}
      >
        {/* Logo */}
        <div>
          <p className="text-[11px] font-display tracking-[0.3em] uppercase text-[#00e5ff] text-glow-cyan">
            AGENT22
          </p>
          <div className="h-px bg-[#1a1a22] mt-2" />
        </div>

        {/* Model status indicator */}
        {isModelBusy && (
          <div className="space-y-2">
            <ProgressBar
              progress={modelStatus === "loading" ? 95 : modelProgress}
              label={modelStatus === "loading" ? "Loading model" : "Downloading"}
            />
          </div>
        )}

        {/* Upload */}
        <FileUpload />

        {/* Analysis summary */}
        {analysisResult && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-display tracking-[0.15em] uppercase text-[#333]">
              Last Analysis
            </p>
            <div className="text-[11px] text-[#444] space-y-1">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="text-[#f0f0f0]">{analysisResult.summary.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Tier 1</span>
                <span className="text-[#00e5ff]">{analysisResult.summary.tier1}</span>
              </div>
              <div className="flex justify-between">
                <span>Tier 2</span>
                <span className="text-[#ff6b35]">{analysisResult.summary.tier2}</span>
              </div>
              <div className="flex justify-between">
                <span>Nurture</span>
                <span className="text-[#a855f7]">{analysisResult.summary.nurture}</span>
              </div>
            </div>
          </div>
        )}

        {/* Privacy note */}
        <div className="mt-auto pt-4 border-t border-[#1a1a22]">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] pulse-dot shrink-0"
              style={{ boxShadow: "0 0 4px rgba(0,229,255,0.6)" }}
            />
            <span className="text-[10px] text-[#2a2a2a] leading-tight">
              Private · local AI · no data leaves your device
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main panel ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Analysis table (shown above chat when results exist) */}
        {analysisResult && analysisResult.records.length > 0 && (
          <div
            className="border-b border-[#1a1a22] overflow-auto"
            style={{ maxHeight: "40%", background: "#060608" }}
          >
            <div className="p-4 pb-0">
              <p className="text-[10px] font-display tracking-[0.15em] uppercase text-[#444] mb-3">
                Pipeline Analysis · {analysisResult.summary.total} companies
              </p>
            </div>
            <div className="px-4 pb-4">
              <AnalysisTable records={analysisResult.records} />
            </div>
          </div>
        )}

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <ChatMsg key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-[#1a1a22] p-4">
          <div
            className="flex items-end gap-3 border border-[#1a1a22] rounded-sm px-4 py-3 transition-colors focus-within:border-[#2a2a2a]"
            style={{ background: "#0d0d10" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isModelSetup
                  ? "Waiting for model to load…"
                  : "Ask about your accounts, ICP, or strategy…"
              }
              disabled={!isModelSetup || isGenerating}
              rows={1}
              className="flex-1 bg-transparent text-[13px] text-[#f0f0f0] placeholder-[#333] focus:outline-none resize-none leading-relaxed max-h-32"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !isModelSetup || isGenerating}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-sm transition-all disabled:opacity-30"
              style={{
                background: input.trim() && isModelSetup && !isGenerating
                  ? "rgba(0,229,255,0.12)"
                  : "transparent",
                border: "1px solid #1a1a22",
              }}
            >
              {isGenerating ? (
                <Loader2 size={13} className="animate-spin text-[#00e5ff]" />
              ) : (
                <Send size={13} className="text-[#555]" />
              )}
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[#2a2a2a] text-center">
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
