import { invoke } from "@tauri-apps/api/core";
import { AGENTS, useAppStore } from "@/store/app";
import { ArrowRight } from "lucide-react";

export function AgentList() {
  const { setSelectedAgent, setModelStatus } = useAppStore();

  function handleSelectAgent(agent: (typeof AGENTS)[number]) {
    // Start model setup (download if needed, then load). No-op if already ready.
    setModelStatus("downloading");
    invoke("start_model_setup").catch(() => {});
    setSelectedAgent(agent);
  }

  return (
    <div className="grain h-full flex flex-col bg-[#060608] p-8">
      <div className="mb-10">
        <p className="text-[11px] font-display tracking-[0.3em] uppercase text-[#00e5ff] text-glow-cyan mb-1">
          AGENT22
        </p>
        <div className="h-px w-full bg-[#1a1a22]" />
      </div>

      <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
        <h1 className="text-[22px] font-display font-bold text-[#f0f0f0] mb-2">
          Choose an agent
        </h1>
        <p className="text-[13px] text-[#444] mb-8">
          Select an AI agent to start a conversation.
        </p>

        <div className="space-y-3">
          {AGENTS.map((agent) => (
            <button
              key={agent.id}
              onClick={() => handleSelectAgent(agent)}
              className="w-full text-left group flex items-center gap-4 p-4 rounded-sm transition-colors"
              style={{ background: "#0d0d10", border: "1px solid #1a1a22" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "#1a1a22";
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-display font-medium text-[#f0f0f0] mb-1">
                  {agent.name}
                </p>
                <p className="text-[12px] text-[#444] leading-relaxed">
                  {agent.description}
                </p>
              </div>
              <ArrowRight
                size={14}
                className="shrink-0 text-[#333] group-hover:text-[#00e5ff] transition-colors"
              />
            </button>
          ))}
        </div>
      </div>

      <p className="mt-10 text-[10px] text-[#2a2a2a] text-center">agent22.io</p>
    </div>
  );
}
