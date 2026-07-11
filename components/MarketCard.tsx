"use client";

import Link from "next/link";
import type { MarketView } from "@/lib/market/types";
import type { FlashInfo } from "@/lib/client/useStore";
import { fmtCredits, fmtPct } from "@/lib/format";
import Sparkline from "./Sparkline";

export default function MarketCard({
  market,
  flash,
}: {
  market: MarketView;
  flash: FlashInfo | undefined;
}) {
  const settled = market.status === "settled";

  return (
    <Link
      key={flash?.at ?? "static"}
      href={`/m/${market.id}`}
      className={[
        "group relative block overflow-hidden rounded-md border bg-panel transition-colors",
        settled
          ? market.outcome === "YES"
            ? "border-up/50"
            : "border-down/50"
          : "border-edge hover:border-up/50",
        flash && !settled ? (flash.dir === "up" ? "animate-flash-up" : "animate-flash-down") : "",
      ].join(" ")}
    >
      {/* codex-rendered service artwork banner */}
      <div className="relative h-20 overflow-hidden">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url(/art/${market.service}.png), linear-gradient(135deg, #0c3b2e, #081f18)`,
            backgroundSize: "cover, cover",
            backgroundPosition: "center 40%, center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-panel/30 to-transparent" />
        <span className="absolute left-3 top-2.5 rounded-sm bg-ink/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-fog backdrop-blur-sm">
          {market.service}
        </span>
        <span
          className={[
            "absolute right-3 top-2.5 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] backdrop-blur-sm",
            settled
              ? market.outcome === "YES"
                ? "bg-up/20 text-up"
                : "bg-down/20 text-down"
              : market.settlement === "auto"
                ? "bg-ink/70 text-info"
                : "bg-ink/70 text-gold",
          ].join(" ")}
        >
          {settled ? `settled ${market.outcome}` : market.settlement === "auto" ? "oracle-settled" : "manual settle"}
        </span>
      </div>

      <div className="p-3.5 pt-2">
        <p className="min-h-[2.4rem] text-[13.5px] font-semibold leading-snug text-bone group-hover:text-up">
          {market.question}
        </p>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">yes probability</div>
            <div
              className={[
                "tabular font-display text-4xl font-bold leading-none",
                settled
                  ? market.outcome === "YES"
                    ? "text-up"
                    : "text-down"
                  : market.price >= 0.5
                    ? "text-up"
                    : "text-down",
              ].join(" ")}
            >
              {fmtPct(market.price)}
            </div>
          </div>
          <Sparkline data={market.spark} />
        </div>

        {/* probability bar */}
        <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-ink">
          <div
            className="h-full bg-up transition-[width] duration-700"
            style={{ width: `${market.price * 100}%` }}
          />
          <div className="h-full flex-1 bg-down/50" />
        </div>

        <div className="tabular mt-2.5 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fog">
          <span>{market.ticker}</span>
          <span>{fmtCredits(market.volumeCredits)} cr vol</span>
          <span className="ml-auto text-gold">{settled ? market.settledNote?.slice(0, 24) : market.closesLabel}</span>
        </div>
      </div>
    </Link>
  );
}
