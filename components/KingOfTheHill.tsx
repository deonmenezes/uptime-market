"use client";

import Link from "next/link";
import type { Market } from "@/lib/types";
import { fmtSol, fmtCents } from "@/lib/format";

export default function KingOfTheHill({ market }: { market: Market }) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-crown-bob text-3xl">👑</div>
      <div className="rounded-sm border border-amber/60 bg-panel p-3 shadow-[0_0_40px_rgba(255,197,61,0.12)]">
        <div className="text-center font-display text-xl uppercase tracking-wide text-amber">
          king of the hill
        </div>
        <Link href={`/m/${market.id}`} className="mt-2 flex items-center gap-3">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-amber/40 text-2xl"
            style={{
              background: `linear-gradient(135deg, hsl(${market.hue} 70% 20%), hsl(${(market.hue + 40) % 360} 80% 9%))`,
            }}
          >
            {market.emoji}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-bone">{market.question}</p>
            <div className="mt-1 flex gap-3 font-mono text-[11px]">
              <span className="text-lime">YES {fmtCents(market.yesCents)}</span>
              <span className="text-hot">NO {fmtCents(100 - market.yesCents)}</span>
              <span className="text-amber">🔥 {fmtSol(market.vol5mSol)} ◎ / 5m</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
