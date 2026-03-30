import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ArrowRight } from "lucide-react";
import { useAppStore } from "@/store/app";

const REVENUE_OPTIONS = [
  "Under $500K",
  "$500K–$1M",
  "$1M–$5M",
  "$5M–$10M",
  "$10M–$50M",
  "$50M–$200M",
  "$200M+",
];

export function LeadGate() {
  const { pendingAnalysis, setAnalysisResult, setAnalysisContext, setPendingAnalysis, setLeadSubmitted, addMessage } = useAppStore();
  const [form, setForm] = useState({ name: "", email: "", company: "", revenue: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!pendingAnalysis) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !pendingAnalysis) return;
    setSubmitting(true);
    setError(null);

    try {
      await invoke("save_lead", {
        lead: {
          name: form.name,
          email: form.email,
          company: form.company || null,
          revenue: form.revenue || null,
          challenge: null,
        },
      });

      // Release the held analysis
      setLeadSubmitted(true);
      setAnalysisResult(pendingAnalysis);
      setPendingAnalysis(null);

      const ctx = JSON.stringify({
        rationale: pendingAnalysis.rubric.rationale,
        summary: pendingAnalysis.summary,
        top_tier1: pendingAnalysis.records
          .filter((r) => r.tier === "Tier 1")
          .slice(0, 5)
          .map((r) => ({ company: r.company, score: r.score.toFixed(0) })),
        key_drivers: pendingAnalysis.summary.top_drivers,
      });
      setAnalysisContext(ctx);

      // Replace the analysing placeholder with the narrative
      useAppStore.setState((s) => {
        const msgs = [...s.messages];
        const idx = msgs.findLastIndex((m) => m.role === "assistant");
        if (idx !== -1) {
          msgs[idx] = { ...msgs[idx], content: pendingAnalysis!.llm_narrative, isStreaming: false };
        }
        return { messages: msgs };
      });
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#060608]/90 backdrop-blur-sm">
      <div
        className="w-full max-w-sm mx-4 p-8 border border-[#1a1a22] rounded-sm fade-in"
        style={{ background: "#0a0a0d" }}
      >
        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] font-display tracking-[0.2em] uppercase text-[#00e5ff] text-glow-cyan mb-3">
            Your report is ready
          </p>
          <h2 className="text-[18px] font-display font-bold text-[#f0f0f0] leading-snug">
            Where should we send
            <br />a copy of your analysis?
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Name"
              required
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="Alex Chen"
            />
            <Field
              label="Work Email"
              type="email"
              required
              value={form.email}
              onChange={(v) => setForm((f) => ({ ...f, email: v }))}
              placeholder="alex@co.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Company"
              value={form.company}
              onChange={(v) => setForm((f) => ({ ...f, company: v }))}
              placeholder="Acme Corp"
            />
            <div>
              <label className="block text-[10px] font-display tracking-[0.18em] text-[#555] uppercase mb-2">
                Annual Revenue
              </label>
              <select
                value={form.revenue}
                onChange={(e) => setForm((f) => ({ ...f, revenue: e.target.value }))}
                className="w-full bg-transparent border-b border-[#1a1a22] pb-2 text-[13px] text-[#f0f0f0] focus:outline-none focus:border-[#00e5ff] transition-colors appearance-none cursor-pointer"
              >
                <option value="" disabled className="bg-[#0d0d10] text-[#444]">
                  Select
                </option>
                {REVENUE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#0d0d10]">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-[12px] text-[#ff6b35]">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !form.name || !form.email}
            className="btn-primary w-full flex items-center justify-center gap-3 px-6 py-3.5 text-[11px] font-display font-medium tracking-[0.15em] uppercase text-[#060608] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(90deg, #ff6b35, #ff8c55)",
              boxShadow: "0 0 16px rgba(255,107,53,0.2)",
            }}
          >
            {submitting ? "Saving…" : "View Report"}
            {!submitting && <ArrowRight size={13} />}
          </button>

          <p className="text-[10px] text-[#2a2a2a] text-center">
            Your deal data stays on this device
          </p>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}

function Field({ label, value, onChange, placeholder, type = "text", required }: FieldProps) {
  return (
    <div>
      <label className="block text-[10px] font-display tracking-[0.18em] text-[#555] uppercase mb-2">
        {label}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent border-b border-[#1a1a22] pb-2 text-[13px] text-[#f0f0f0] placeholder-[#333] focus:outline-none focus:border-[#00e5ff] transition-colors"
      />
    </div>
  );
}
