"use client";

import { useEngine } from "@/lib/useEngine";

export default function Holders({ marketId }: { marketId: string }) {
  const engine = useEngine();
  const holders = engine.holders.get(marketId) ?? [];

  return (
    <div className="rounded-sm border border-edge bg-panel">
      <div className="border-b border-edge px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-fog">
        top holders
      </div>
      <div className="divide-y divide-edge/50">
        {holders.map((h, i) => (
          <div key={`${h.wallet}-${i}`} className="flex items-center gap-2 px-3 py-1.5 font-mono text-[11px]">
            <span className="w-5 text-fog/60">{i + 1}.</span>
            <span className="truncate text-bone">{h.wallet}</span>
            <span className={h.side === "YES" ? "text-lime" : "text-hot"}>{h.side}</span>
            <span className="ml-auto text-fog">{h.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
