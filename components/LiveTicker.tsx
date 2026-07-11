"use client";

import Link from "next/link";
import { useEngine } from "@/lib/useEngine";
import { fmtSol, fmtCents } from "@/lib/format";

export default function LiveTicker() {
  const engine = useEngine();
  const items = engine.tape.slice(0, 18);

  return (
    <div className="overflow-hidden border-b border-edge bg-panel">
      <div className="flex w-max animate-marquee items-center gap-8 py-1.5 pr-8 hover:[animation-play-state:paused]">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center gap-8" aria-hidden={dup === 1}>
            {items.map((t) => {
              const m = engine.markets.get(t.marketId);
              if (!m) return null;
              const buyYes = (t.action === "buy") === (t.side === "YES");
              return (
                <Link
                  key={`${dup}-${t.id}`}
                  href={`/m/${m.id}`}
                  className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] tracking-tight"
                >
                  <span className={buyYes ? "text-lime" : "text-hot"}>{buyYes ? "▲" : "▼"}</span>
                  <span className="text-fog">{t.wallet}</span>
                  <span className={t.action === "buy" ? "text-lime" : "text-hot"}>
                    {t.action === "buy" ? "bought" : "sold"} {fmtSol(t.sol)} SOL {t.side}
                  </span>
                  <span className="text-bone">{m.emoji} {m.ticker}</span>
                  <span className="text-fog">@ {fmtCents(t.priceCents)}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
