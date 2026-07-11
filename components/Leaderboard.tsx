"use client";

import { useMarketStore } from "./StoreContext";
import { fmtUsd } from "@/lib/format";

// Net worth = cash + mark-to-market open positions.
export default function Leaderboard() {
  const { snap, name } = useMarketStore();
  const rows = snap?.leaderboard ?? [];

  return (
    <div id="leaderboard" className="rounded-xl border border-edge bg-panel">
      <div className="border-b border-edge px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
        capital leaderboard
      </div>
      <div className="divide-y divide-edge/60">
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
            <span className={r.name === name ? "font-semibold text-updim" : "text-bone"}>
              {r.name}
              {r.isBot && <span className="ml-1 text-fog/50">·lp</span>}
            </span>
            <span className="ml-auto text-fog">{fmtUsd(r.portfolioUsd)} open</span>
            <span className="w-16 text-right font-semibold text-bone">{fmtUsd(r.netWorthUsd)}</span>
          </div>
        ))}
        {!rows.length && (
          <p className="px-3 py-4 text-center font-mono text-[11px] text-fog/60">warming up…</p>
        )}
      </div>
    </div>
  );
}
