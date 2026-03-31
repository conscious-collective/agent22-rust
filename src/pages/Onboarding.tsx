import { ArrowRight, Shield, Cpu, Bot } from "lucide-react";
import { useAppStore } from "@/store/app";

export function Onboarding() {
  const setOnboarded = useAppStore((s) => s.setOnboarded);

  return (
    <div className="grain h-full flex items-center justify-center bg-[#060608] p-8">
      <div className="w-full max-w-md">
        <div className="mb-12">
          <p className="text-[11px] font-display tracking-[0.3em] uppercase text-[#00e5ff] text-glow-cyan mb-1">
            AGENT22
          </p>
          <div className="h-px w-full bg-[#1a1a22]" />
        </div>

        <div className="fade-in space-y-8">
          <div>
            <h1 className="text-[28px] font-display font-bold text-[#f0f0f0] leading-tight tracking-tight mb-4">
              Your personal
              <br />
              <span
                className="text-transparent"
                style={{
                  background: "linear-gradient(90deg, #00e5ff, #a855f7)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                }}
              >
                AI agents.
              </span>
            </h1>
            <p className="text-[14px] text-[#444] leading-relaxed">
              Specialised AI agents that run entirely on your machine.
              No cloud, no subscriptions, no data leaving your device.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: <Bot size={14} />,
                title: "Specialised agents",
                desc: "Each agent is tuned for a specific role — from coding teacher to content creator.",
              },
              {
                icon: <Shield size={14} />,
                title: "Fully private",
                desc: "Everything runs on-device. Your conversations never touch a remote server.",
              },
              {
                icon: <Cpu size={14} />,
                title: "Local AI model",
                desc: "Powered by a local language model. No cloud, no subscriptions, no API keys.",
              },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-3 items-start">
                <div
                  className="mt-0.5 shrink-0 w-6 h-6 rounded-sm flex items-center justify-center text-[#00e5ff]"
                  style={{ background: "rgba(0,229,255,0.08)", border: "1px solid #1a1a22" }}
                >
                  {icon}
                </div>
                <div>
                  <p className="text-[12px] font-display font-medium text-[#f0f0f0] mb-0.5">
                    {title}
                  </p>
                  <p className="text-[12px] text-[#444] leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setOnboarded(true)}
            className="btn-primary w-full flex items-center justify-center gap-3 px-6 py-3.5 text-[11px] font-display font-medium tracking-[0.15em] uppercase text-[#060608] transition-opacity hover:opacity-90"
            style={{
              background: "linear-gradient(90deg, #ff6b35, #ff8c55)",
              boxShadow: "0 0 20px rgba(255,107,53,0.2)",
            }}
          >
            Get Started
            <ArrowRight size={13} />
          </button>
        </div>

        <p className="mt-10 text-[10px] text-[#2a2a2a] text-center">
          Free forever · agent22.io
        </p>
      </div>
    </div>
  );
}
