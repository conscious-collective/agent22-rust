import { useState } from "react";
import { ShapleyResult } from "@/store/app";
import { ShapleyChart } from "./ShapleyChart";

interface Props {
  records: ShapleyResult[];
}

const TIER_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  "Tier 1":   { label: "Tier 1",   color: "#00e5ff", bg: "rgba(0,229,255,0.08)" },
  "Tier 2":   { label: "Tier 2",   color: "#ff6b35", bg: "rgba(255,107,53,0.08)" },
  "Nurture":  { label: "Nurture",  color: "#a855f7", bg: "rgba(168,85,247,0.08)" },
  "Poor Fit": { label: "Poor Fit", color: "#444",    bg: "rgba(255,255,255,0.04)" },
};

export function AnalysisTable({ records }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!records.length) return null;

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-[12px] border-collapse">
        <thead>
          <tr className="border-b border-[#1a1a22]">
            {["Company", "Score", "Tier", "Top Driver"].map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-[10px] font-display tracking-[0.12em] uppercase text-[#444] font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const tier   = TIER_STYLES[r.tier] ?? TIER_STYLES["Poor Fit"];
            const top    = r.contributions[0];
            const isOpen = expanded === r.company;

            return (
              <>
                <tr
                  key={r.company}
                  className="border-b border-[#0d0d10] hover:bg-[#0d0d10] cursor-pointer transition-colors"
                  onClick={() => setExpanded(isOpen ? null : r.company)}
                >
                  <td className="px-3 py-2.5 text-[#f0f0f0] font-medium">{r.company}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[#f0f0f0]">{r.score.toFixed(0)}</span>
                      {/* Mini sparkbar */}
                      <div className="w-16 h-[2px] bg-[#1a1a22] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${r.score}%`,
                            background: tier.color,
                            boxShadow: `0 0 4px ${tier.color}66`,
                          }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className="px-2 py-0.5 text-[10px] font-display tracking-[0.1em] rounded-sm"
                      style={{ color: tier.color, background: tier.bg }}
                    >
                      {tier.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#555]">
                    {top
                      ? `${top[0].replace(/_/g, " ")} (${top[1] >= 0 ? "+" : ""}${top[1].toFixed(1)})`
                      : "—"}
                  </td>
                </tr>

                {isOpen && (
                  <tr key={`${r.company}-detail`} className="bg-[#0a0a0d]">
                    <td colSpan={4} className="px-4 py-4">
                      <ShapleyChart result={r} />
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
