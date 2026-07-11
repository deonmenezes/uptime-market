"use client";

import Link from "next/link";
import type { Market } from "@/lib/types";
import { fmtSol, fmtCents, fmtCompact, timeAgo, shortWallet } from "@/lib/format";

export default function MarketCard({
  market,
  now,
  animations,
}: {
  market: Market;
  now: number | null;
  animations: boolean;
}) {
  const t = market.lastTrade;
  const flashKey = t ? t.id : "none";
  const buyYes = t ? (t.action === "buy") === (t.side === "YES") : true;
  const fresh = t && now !== null && now - t.ts < 1200;

  return (
    <Link
      key={flashKey}
      href={`/m/${market.id}`}
      className={[
        "group block rounded-sm border border-edge bg-panel p-3 transition-colors hover:border-lime/60",
        t && animations ? (buyYes ? "animate-flash-yes" : "animate-flash-no") : "",
        fresh && animations ? "animate-shake" : "",
      ].join(" ")}
    >
      <div className="flex gap-3">
        {/* deterministic gradient tile instead of an uploaded image */}
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-edge2 text-3xl"
          style={{
            background: `linear-gradient(135deg, hsl(${market.hue} 70% 18%), hsl(${(market.hue + 40) % 360} 80% 8%))`,
          }}
        >
          {market.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-mono text-[10px] uppercase tracking-widest text-fog">
              {market.ticker} · by {shortWallet(market.creator)}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-fog">
              {now !== null ? `${timeAgo(market.createdTs, now)} ago` : "…"}
            </span>
          </div>

          <p className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-tight text-bone group-hover:text-lime">
            {market.question}
          </p>

          <div className="mt-1.5 flex items-center gap-3 font-mono text-[11px]">
            <span className="text-lime">YES {fmtCents(market.yesCents)}</span>
            <span className="text-hot">NO {fmtCents(100 - market.yesCents)}</span>
            <span className="ml-auto text-fog">vol {fmtSol(market.volumeSol)} ◎</span>
          </div>
        </div>
      </div>

      {/* graduation progress */}
      <div className="mt-2.5">
        <div className="flex justify-between font-mono text-[10px] text-fog">
          <span>graduation</span>
          <span>{market.graduationPct}%</span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink">
          <div
            className="h-full rounded-full bg-gradient-to-r from-limedim to-lime transition-[width] duration-500"
            style={{ width: `${market.graduationPct}%` }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fog">
        <span>💬 {fmtCompact(market.replies)}</span>
        <span>👤 {fmtCompact(market.holders)}</span>
        <span className="ml-auto rounded-sm border border-edge2 px-1 py-px">{market.category}</span>
        <span className="text-amber">⏱ {market.endsLabel}</span>
      </div>
    </Link>
  );
}
