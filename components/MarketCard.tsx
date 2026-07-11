"use client";

import Link from "next/link";
import type { MarketView } from "@/lib/market/types";
import type { FlashInfo } from "@/lib/client/useStore";
import { fmtCredits, fmtPct } from "@/lib/format";
import { RUNTIMES } from "@/lib/runtimes";
import Sparkline from "./Sparkline";

export default function MarketCard({
  market,
  flash,
}: {
  market: MarketView;
  flash: FlashInfo | undefined;
}) {
  const settled = market.status === "settled";
  const rt = RUNTIMES[market.service];

  return (
    <Link
      key={flash?.at ?? "static"}
      href={`/m/${market.id}`}
      className={[
        "card-lift group relative block overflow-hidden rounded-xl border bg-panel",
        settled
          ? market.outcome === "YES"
            ? "border-up/50"
            : "border-down/50"
          : "border-edge hover:border-up/50",
        flash && !settled ? (flash.dir === "up" ? "animate-flash-up" : "animate-flash-down") : "",
      ].join(" ")}
    >
      {/* codex-rendered light artwork banner */}
      <div className="relative h-24 overflow-hidden border-b border-edge">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url(/art/light/${market.service}.png), linear-gradient(135deg, #f4f7f2, #ffffff)`,
            backgroundSize: "cover, cover",
            backgroundPosition: "center 35%, center",
          }}
        />
        <span
          className={[
            "absolute right-3 top-3 rounded-full px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] shadow-sm backdrop-blur-sm",
            settled
              ? market.outcome === "YES"
                ? "bg-up text-white"
                : "bg-down text-white"
              : market.settlement === "auto"
                ? "bg-white/90 text-info"
                : "bg-white/90 text-gold",
          ].join(" ")}
        >
          {settled ? `settled ${market.outcome}` : market.settlement === "auto" ? "oracle-settled" : "manual settle"}
        </span>
        {rt && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={rt.logo} alt={rt.provider} className="h-4 w-auto max-w-8" />
            <span className="font-mono text-[9px] font-medium text-fog">{market.service}</span>
          </span>
        )}
      </div>

      <div className="p-4 pt-3">
        <p className="min-h-[2.5rem] text-[14px] font-semibold leading-snug text-bone group-hover:text-updim">
          {market.question}
        </p>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">yes probability</div>
            <div
              className={[
                "tabular font-display text-4xl font-bold leading-none tracking-tight",
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
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full bg-up transition-[width] duration-700"
            style={{ width: `${market.price * 100}%` }}
          />
          <div className="h-full flex-1 bg-down/40" />
        </div>

        <div className="tabular mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fog">
          <span>{market.ticker}</span>
          <span>{fmtCredits(market.volumeCredits)} cr vol</span>
          <span className="ml-auto text-gold">{settled ? market.settledNote?.slice(0, 24) : market.closesLabel}</span>
        </div>
      </div>
    </Link>
  );
}
