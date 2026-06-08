"use client";

import { useState } from "react";
import type { WeeklyBucket } from "@/lib/types";

export function WeeklyChart({ data, bestDay }: { data: WeeklyBucket[]; bestDay: string | null }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((b) => parseFloat(b.total)), 1);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        Sin datos suficientes aún
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end gap-3 flex-1 pt-6">
        {data.map((bar, i) => {
          const pct = (parseFloat(bar.total) / max) * 100;
          const isBest = bar.label === bestDay;
          const isHov = hovered === i;
          return (
            <div
              key={bar.dow}
              className="flex-1 flex flex-col items-center gap-1 h-full justify-end relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHov && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#003358] text-white text-[10px] font-semibold px-2 py-1.5 rounded-lg whitespace-nowrap z-10 shadow-lg text-center">
                  {bar.label}
                  <br />${parseFloat(bar.total).toFixed(2)}
                  <br /><span className="text-slate-300">{bar.cobros} cobro{bar.cobros !== 1 ? "s" : ""}</span>
                </div>
              )}
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: isBest
                    ? "#F89937"
                    : isHov
                    ? "#0066FF"
                    : "linear-gradient(to top, #003358cc, #0066FF66)",
                }}
              />
              <span className={`text-[10px] font-medium mt-1 ${isBest ? "text-[#F89937]" : "text-gray-400"}`}>
                {bar.label.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
