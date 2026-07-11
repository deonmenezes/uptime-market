"use client";

import { useMarketStore } from "./StoreContext";
import { fmtPct, timeAgo } from "@/lib/format";

export default function TradeTape({ marketId }: { marketId?: string }) {
  const { snap } = useMarketStore();
  const trades = (snap?.trades ?? [])
    .filter((t) => !marketId || t.marketId === marketId)
    .slice(0, 14);

  return (
    <div className="rounded-md border border-edge bg-panel">
      <div className="border-b border-edge px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
        live tape
      </div>
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fog/50">
        <span>time</span><span>account</span><span>action</span><span className="text-right">credits</span><span className="text-right">→ prob</span>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {trades.map((t) => {
          const m = snap?.markets.find((x) => x.id === t.marketId);
          const bullish = (t.action === "buy") === (t.side === "YES");
          return (
            <div
              key={t.id}
              className="tape-row grid grid-cols-[auto_1fr_auto_auto_auto] items-baseline gap-x-4 border-t border-edge/50 px-3 py-1.5 font-mono text-[11px]"
            >
              <span className="tabular text-fog/60">{snap ? timeAgo(t.ts, snap.now) : ""}</span>
              <span className="truncate text-fog">
                {t.user} <span className="text-fog/50">on {m?.ticker ?? t.marketId}</span>
              </span>
              <span className={bullish ? "text-up" : "text-down"}>
                {t.action} {t.shares} {t.side}
              </span>
              <span className="tabular text-right text-bone">{t.credits}</span>
              <span className={["tabular text-right", bullish ? "text-up" : "text-down"].join(" ")}>
                {fmtPct(t.priceAfter)}
              </span>
            </div>
          );
        })}
        {!trades.length && (
          <p className="px-3 py-4 text-center font-mono text-[11px] text-fog/60">no trades yet</p>
        )}
      </div>
    </div>
  );
}
