import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Send, Loader2, ChevronLeft } from "lucide-react";
import { ChatMessage as ChatMsg } from "@/components/ChatMessage";
import { ProgressBar } from "@/components/ModelStatus";
import { useAppStore } from "@/store/app";

export function Chat() {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    addMessage,
    updateLastMessage,
    isGenerating,
    setGenerating,
    modelStatus,
    modelProgress,
    selectedAgent,
    setSelectedAgent,
  } = useAppStore();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;
    let unlisten1: (() => void) | null = null;
    let unlisten2: (() => void) | null = null;

    listen<string>("model://token", ({ payload }) => {
      updateLastMessage(payload);
    }).then((fn) => {
      if (cancelled) fn(); else unlisten1 = fn;
    });

    listen("model://done", () => {
      updateLastMessage("", true);
      setGenerating(false);
    }).then((fn) => {
      if (cancelled) fn(); else unlisten2 = fn;
    });

    return () => {
      cancelled = true;
      unlisten1?.();
      unlisten2?.();
    };
  }, [updateLastMessage, setGenerating]);

  // Show agent welcome message once (ref guards against React Strict Mode double-fire)
  const welcomeAdded = useRef(false);
  useEffect(() => {
    if (!welcomeAdded.current && selectedAgent) {
      welcomeAdded.current = true;
      addMessage({
        id: "welcome",
        role: "assistant",
        content: selectedAgent.welcomeMessage,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage() {
    const text = input.trim();
    if (!text || isGenerating || modelStatus !== "ready" || !selectedAgent) return;

    setInput("");

    addMessage({ id: Date.now().toString(), role: "user", content: text });
    addMessage({ id: (Date.now() + 1).toString(), role: "assistant", content: "", isStreaming: true });
    setGenerating(true);

    const history = useAppStore
      .getState()
      .messages.filter((m) => !m.isStreaming && m.id !== "welcome")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      await invoke("send_message", {
        messages: history,
        agentId: selectedAgent.id,
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
  const isModelBusy = modelStatus === "downloading" || modelStatus === "loading";

  return (
    <div className="grain scanline h-full flex bg-[#060608]">
      {/* Sidebar */}
      <aside
        className="w-[200px] shrink-0 flex flex-col border-r border-[#1a1a22] p-4 gap-4"
        style={{ background: "#060608" }}
      >
        <div>
          <p className="text-[11px] font-display tracking-[0.3em] uppercase text-[#00e5ff] text-glow-cyan">
            AGENT22
          </p>
          <div className="h-px bg-[#1a1a22] mt-2" />
        </div>

        {/* Agent name */}
        {selectedAgent && (
          <div>
            <p className="text-[10px] font-display tracking-[0.15em] uppercase text-[#333] mb-1">
              Active Agent
            </p>
            <p className="text-[12px] text-[#f0f0f0]">{selectedAgent.name}</p>
          </div>
        )}

        {/* Model loading indicator */}
        {isModelBusy && (
          <div className="space-y-2">
            <ProgressBar
              progress={modelStatus === "loading" ? 95 : modelProgress}
              label={modelStatus === "loading" ? "Starting engine" : "Downloading"}
            />
          </div>
        )}

        {/* Back to agents */}
        <div className="mt-auto pt-4 border-t border-[#1a1a22]">
          <button
            onClick={() => setSelectedAgent(null)}
            className="flex items-center gap-2 text-[11px] text-[#333] hover:text-[#f0f0f0] transition-colors"
          >
            <ChevronLeft size={12} />
            All agents
          </button>
        </div>
      </aside>

      {/* Main panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => (
            <ChatMsg key={msg.id} message={msg} />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#1a1a22] p-4">
          <div
            className="flex items-end gap-3 border border-[#1a1a22] rounded-sm px-4 py-3 transition-colors focus-within:border-[#2a2a2a]"
            style={{ background: "#0d0d10" }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !isModelSetup
                  ? "Waiting for model to load…"
                  : (selectedAgent?.placeholder ?? "Type a message…")
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
                background:
                  input.trim() && isModelSetup && !isGenerating
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
