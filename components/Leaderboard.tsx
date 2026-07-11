"use client";

import { useMarketStore } from "./StoreContext";
import { fmtCredits } from "@/lib/format";

// Calibration leaderboard: net worth = credits + mark-to-market open positions.
export default function Leaderboard() {
  const { snap, name } = useMarketStore();
  const rows = snap?.leaderboard ?? [];

  return (
    <div id="leaderboard" className="rounded-md border border-edge bg-panel">
      <div className="border-b border-edge px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
        calibration leaderboard
      </div>
      <div className="divide-y divide-edge/50">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className={[
              "tabular flex items-center gap-2 px-3 py-1.5 font-mono text-[11px]",
              r.name === name ? "bg-up/5" : "",
            ].join(" ")}
          >
            <span className={["w-5", i === 0 ? "text-gold" : "text-fog/60"].join(" ")}>
              {i === 0 ? "★" : `${i + 1}.`}
            </span>
            <span className={r.name === name ? "font-semibold text-up" : "text-bone"}>
              {r.name}
              {r.isBot && <span className="ml-1 text-fog/50">·bot</span>}
            </span>
            <span className="ml-auto text-fog">{fmtCredits(r.portfolio)} open</span>
            <span className="w-16 text-right font-semibold text-bone">{fmtCredits(r.netWorth)}</span>
          </div>
        ))}
        {!rows.length && (
          <p className="px-3 py-4 text-center font-mono text-[11px] text-fog/60">warming up…</p>
        )}
      </div>
    </div>
  );
}
