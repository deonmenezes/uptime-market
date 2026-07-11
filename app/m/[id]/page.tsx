"use client";

import { use } from "react";
import Link from "next/link";
import { useEngine, useNow } from "@/lib/useEngine";
import { fmtSol, fmtCents, fmtCompact, timeAgo, shortWallet } from "@/lib/format";
import Chart from "@/components/Chart";
import TradePanel from "@/components/TradePanel";
import TradeTape from "@/components/TradeTape";
import Thread from "@/components/Thread";
import Holders from "@/components/Holders";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const engine = useEngine();
  const now = useNow();
  const market = engine.markets.get(id);

  if (!market) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-display text-4xl text-hot">market not found</p>
        <Link href="/" className="mt-4 inline-block font-mono text-xs uppercase text-lime underline">
          ← back to board
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-4 pb-24">
      <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-fog hover:text-lime">
        ← board
      </Link>

      {/* header row */}
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <div
          className="flex h-14 w-14 items-center justify-center rounded-sm border border-edge2 text-2xl"
          style={{
            background: `linear-gradient(135deg, hsl(${market.hue} 70% 18%), hsl(${(market.hue + 40) % 360} 80% 8%))`,
          }}
        >
          {market.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-bone">{market.question}</h1>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-fog">
            <span className="text-amber">{market.ticker}</span>
            <span>by {shortWallet(market.creator)}</span>
            <span>created {now !== null ? `${timeAgo(market.createdTs, now)} ago` : "…"}</span>
            <span>resolves {market.endsLabel}</span>
            <span className="rounded-sm border border-edge2 px-1 uppercase">{market.category}</span>
          </div>
        </div>
        <div className="flex gap-6 font-mono text-sm">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-fog">yes</div>
            <div className="font-display text-3xl leading-none text-lime">{fmtCents(market.yesCents)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-fog">no</div>
            <div className="font-display text-3xl leading-none text-hot">{fmtCents(100 - market.yesCents)}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-fog">volume</div>
            <div className="font-display text-3xl leading-none text-bone">{fmtSol(market.volumeSol)} ◎</div>
          </div>
        </div>
      </div>

      {/* main grid */}
      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          <div className="rounded-sm border border-edge bg-panel p-2">
            <Chart marketId={id} />
          </div>

          {/* graduation bar */}
          <div className="rounded-sm border border-edge bg-panel p-3">
            <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-fog">
              <span>bonding progress — graduates to the orderbook at 100%</span>
              <span className="text-lime">{market.graduationPct}%</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-ink">
              <div
                className="h-full rounded-full bg-gradient-to-r from-limedim to-lime transition-[width] duration-500"
                style={{ width: `${market.graduationPct}%` }}
              />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-fog/70">
              liquidity {fmtSol(market.liquiditySol)} ◎ · holders {fmtCompact(market.holders)} · when this market
              graduates, liquidity migrates to the central orderbook
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TradeTape marketId={id} />
            <Holders marketId={id} />
          </div>

          <Thread marketId={id} />
        </div>

        <div className="space-y-3">
          <TradePanel market={market} />

          <div className="rounded-sm border border-edge bg-panel p-3">
            <div className="font-mono text-[10px] uppercase tracking-widest text-fog">resolution rules</div>
            <p className="mt-1.5 text-xs leading-relaxed text-fog">
              Resolves YES if the event described in the question occurs before the deadline, per the cited
              resolution source. Otherwise resolves NO. Disputes go to the oracle. (Demo copy — wire your real
              rules here.)
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
