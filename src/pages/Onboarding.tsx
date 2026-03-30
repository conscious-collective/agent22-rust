import { invoke } from "@tauri-apps/api/core";
import { ArrowRight, Shield, Cpu, BarChart3 } from "lucide-react";
import { ProgressBar } from "@/components/ModelStatus";
import { useAppStore } from "@/store/app";

type Step = "welcome" | "setup";

export function Onboarding() {
  const { modelStatus, modelProgress, setOnboarded, setModelStatus } = useAppStore();
  const step: Step = modelStatus === "not_downloaded" || modelStatus === "downloading" || modelStatus === "loading" || modelStatus === "ready" || modelStatus === "error"
    ? (modelStatus === "not_downloaded" ? "welcome" : "setup")
    : "welcome";

  function handleGetStarted() {
    setModelStatus("downloading");
    invoke("start_model_setup").catch(() => {});
  }

  return (
    <div className="grain h-full flex items-center justify-center bg-[#060608] p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-12">
          <p className="text-[11px] font-display tracking-[0.3em] uppercase text-[#00e5ff] text-glow-cyan mb-1">
            AGENT22
          </p>
          <div className="h-px w-full bg-[#1a1a22]" />
        </div>

        {/* ── Welcome ── */}
        {step === "welcome" && (
          <div className="fade-in space-y-8">
            <div>
              <h1 className="text-[28px] font-display font-bold text-[#f0f0f0] leading-tight tracking-tight mb-4">
                Sales intelligence
                <br />
                <span
                  className="text-transparent"
                  style={{
                    background: "linear-gradient(90deg, #00e5ff, #a855f7)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                  }}
                >
                  for GTM teams.
                </span>
              </h1>
              <p className="text-[14px] text-[#444] leading-relaxed">
                Upload your deals. Get instant ICP analysis powered by local AI.
                Nothing leaves your machine.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: <BarChart3 size={14} />,
                  title: "Explainable ICP scoring",
                  desc: "AI discovers what makes your best accounts great — from your own data.",
                },
                {
                  icon: <Shield size={14} />,
                  title: "Fully private",
                  desc: "Analysis runs on-device. Your pipeline never touches a remote server.",
                },
                {
                  icon: <Cpu size={14} />,
                  title: "Local AI model",
                  desc: "Runs entirely on your machine. No cloud, no subscriptions, no API keys.",
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
              onClick={handleGetStarted}
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
        )}

        {/* ── Model Setup ── */}
        {step === "setup" && (
          <div className="fade-in space-y-8">
            <div>
              <h2 className="text-[20px] font-display font-bold text-[#f0f0f0] mb-2">
                Setting up your local AI
              </h2>
              <p className="text-[13px] text-[#444]">
                {modelStatus === "ready"
                  ? "Model loaded and ready."
                  : modelStatus === "downloading"
                  ? `Downloading AI model · ${modelProgress.toFixed(0)}% · stays on this device`
                  : modelStatus === "loading"
                  ? "Loading model into memory…"
                  : modelStatus === "error"
                  ? "Download failed. Check your connection and try again."
                  : "Preparing…"}
              </p>
            </div>

            <ProgressBar
              progress={
                modelStatus === "ready" ? 100 : modelStatus === "loading" ? 95 : modelProgress
              }
              label={
                modelStatus === "ready"
                  ? "Complete"
                  : modelStatus === "loading"
                  ? "Loading"
                  : "Downloading"
              }
            />

            <div className="space-y-3">
              {[
                "Your data never leaves this device",
                "No cloud processing, no subscriptions",
                "Analysis runs entirely offline after setup",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span
                    className="w-1 h-1 rounded-full bg-[#00e5ff] pulse-dot"
                    style={{ boxShadow: "0 0 4px rgba(0,229,255,0.6)" }}
                  />
                  <span className="text-[12px] text-[#444]">{item}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOnboarded(true)}
              disabled={modelStatus !== "ready"}
              className="btn-primary w-full flex items-center justify-center gap-3 px-6 py-3.5 text-[11px] font-display font-medium tracking-[0.15em] uppercase text-[#060608] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(90deg, #ff6b35, #ff8c55)",
                boxShadow: modelStatus === "ready" ? "0 0 20px rgba(255,107,53,0.2)" : "none",
              }}
            >
              Launch Agent22
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        <p className="mt-10 text-[10px] text-[#2a2a2a] text-center">
          Free forever · agent22.io
        </p>
      </div>
    </div>
  );
}
