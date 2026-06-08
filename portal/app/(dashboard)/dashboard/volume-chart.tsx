"use client";

import { useEffect, useState } from "react";

interface DayBar { label: string; value: number; }

function generateBars(totalVolume: number): DayBar[] {
  const days: DayBar[] = [];
  const now = new Date();
  // Distribute total volume across 14 days with realistic variance
  const base = totalVolume / 14;
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("es-EC", { day: "2-digit", month: "short" });
    // Add pseudo-random variance seeded by day
    const seed = d.getDate() * 7 + d.getMonth() * 3;
    const factor = 0.4 + ((seed % 13) / 13) * 1.6;
    days.push({ label, value: Math.round(base * factor * 100) / 100 });
  }
  return days;
}

export function VolumeChart({ totalVolume }: { totalVolume: number }) {
  const [bars, setBars] = useState<DayBar[]>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    setBars(generateBars(totalVolume));
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, [totalVolume]);

  const max = Math.max(...bars.map(b => b.value), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end gap-1.5 flex-1 pt-4">
        {bars.map((bar, i) => {
          const pct = (bar.value / max) * 100;
          const isHov = hovered === i;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group"
              onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {isHov && (
                <div className="bg-[#003358] text-white text-[10px] font-semibold px-2 py-1 rounded-lg whitespace-nowrap mb-1">
                  ${bar.value.toLocaleString("es-EC", { minimumFractionDigits: 2 })}
                </div>
              )}
              <div className="w-full rounded-t-md transition-all duration-500"
                style={{
                  height: animated ? `${Math.max(pct, 3)}%` : "0%",
                  background: isHov
                    ? "#F89937"
                    : `linear-gradient(to top, #003358cc, #0066FF88)`,
                  transitionDelay: `${i * 30}ms`,
                }} />
            </div>
          );
        })}
      </div>
      {/* X axis labels — show every 2 days */}
      <div className="flex gap-1.5 mt-2">
        {bars.map((bar, i) => (
          <div key={i} className="flex-1 text-center">
            {i % 2 === 0 && (
              <span className="text-[9px] text-gray-400 leading-none">{bar.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
