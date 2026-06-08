"use client";

import { useState } from "react";
import type { HourlyBucket } from "@/lib/types";

export function HourlyChart({ data, peakHour }: { data: HourlyBucket[]; peakHour: number | null }) {
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
      <div className="flex items-end gap-1 flex-1 pt-6">
        {data.map((bar, i) => {
          const pct = (parseFloat(bar.total) / max) * 100;
          const isPeak = bar.hour === peakHour;
          const isHov = hovered === i;
          return (
            <div
              key={bar.hour}
              className="flex-1 flex flex-col items-center gap-0.5 h-full justify-end relative"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {isHov && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#003358] text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap z-10 shadow-lg">
                  {bar.label} · ${parseFloat(bar.total).toFixed(2)}
                  <br />
                  <span className="text-slate-300">{bar.cobros} cobro{bar.cobros !== 1 ? "s" : ""}</span>
                </div>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: isPeak
                    ? "#F89937"
                    : isHov
                    ? "#0066FF"
                    : "linear-gradient(to top, #003358cc, #0066FF66)",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* X axis — mostrar cada 3 horas */}
      <div className="flex gap-1 mt-2">
        {data.map((bar, i) => (
          <div key={i} className="flex-1 text-center">
            {bar.hour % 3 === 0 && (
              <span className="text-[9px] text-gray-400 leading-none">{bar.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
