"use client";

import { useEngine, useNow } from "@/lib/useEngine";
import { fmtSol, fmtCents, timeAgo } from "@/lib/format";

export default function TradeTape({ marketId }: { marketId: string }) {
  const engine = useEngine();
  const now = useNow();
  const trades = engine.tape.filter((t) => t.marketId === marketId).slice(0, 20);

  return (
    <div className="rounded-sm border border-edge bg-panel">
      <div className="border-b border-edge px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-fog">
        trades
      </div>
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-fog/60">
        <span>account</span><span>side</span><span className="text-right">sol</span><span className="text-right">time</span>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {trades.length === 0 && (
          <p className="px-3 py-4 text-center font-mono text-[11px] text-fog/60">no trades yet — be first</p>
        )}
        {trades.map((t) => {
          const buyYes = (t.action === "buy") === (t.side === "YES");
          return (
            <div
              key={t.id}
              className="tape-row grid grid-cols-[1fr_auto_auto_auto] gap-x-4 border-t border-edge/50 px-3 py-1.5 font-mono text-[11px]"
            >
              <span className="truncate text-fog">{t.wallet}</span>
              <span className={buyYes ? "text-lime" : "text-hot"}>
                {t.action} {t.side} @ {fmtCents(t.priceCents)}
              </span>
              <span className="text-right text-bone">{fmtSol(t.sol)} ◎</span>
              <span className="text-right text-fog/70">{now !== null ? timeAgo(t.ts, now) : "…"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
