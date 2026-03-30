import { ShapleyResult } from "@/store/app";

interface Props {
  result: ShapleyResult;
}

export function ShapleyChart({ result }: Props) {
  const { contributions } = result;
  if (!contributions.length) return null;

  const maxAbs = Math.max(...contributions.map(([, v]) => Math.abs(v)), 0.1);

  return (
    <div className="space-y-2.5">
      <p className="text-[10px] font-display tracking-[0.15em] uppercase text-[#444] mb-3">
        Contributing factors
      </p>
      {contributions.map(([feature, value]) => {
        const isPositive = value >= 0;
        const pct = Math.round((Math.abs(value) / maxAbs) * 100);
        return (
          <div key={feature} className="flex items-center gap-3">
            <span
              className="text-[11px] text-[#666] shrink-0 w-32 truncate"
              title={feature}
            >
              {feature.replace(/_/g, " ")}
            </span>
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-[3px] bg-[#1a1a22] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: isPositive ? "#00e5ff" : "#ff6b35",
                    boxShadow: isPositive
                      ? "0 0 4px rgba(0,229,255,0.4)"
                      : "0 0 4px rgba(255,107,53,0.4)",
                  }}
                />
              </div>
              <span
                className="text-[11px] font-display w-12 text-right"
                style={{ color: isPositive ? "#00e5ff" : "#ff6b35" }}
              >
                {isPositive ? "+" : ""}
                {value.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
