"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MarketView } from "@/lib/market/types";
import type { FlashInfo } from "@/lib/client/useStore";
import { fmtPct, fmtUsd } from "@/lib/format";
import { SOURCES } from "@/lib/runtimes";
import { useMarketStore } from "./StoreContext";
import Sparkline from "./Sparkline";

export default function MarketCard({
  market,
  flash,
}: {
  market: MarketView;
  flash: FlashInfo | undefined;
}) {
  const { mode } = useMarketStore();
  const router = useRouter();
  const settled = market.status === "settled";

  const goTrade = (e: React.MouseEvent, side: "YES" | "NO") => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/m/${market.id}?side=${side}`);
  };
  const src = SOURCES[market.service];
  const collateralized = market.exposureUsd > 0 ? Math.min(1, market.escrowUsd / market.exposureUsd) : 1;

  return (
    <Link
      key={flash?.at ?? "static"}
      href={`/m/${market.id}`}
      className={[
        "card-lift group relative block overflow-hidden rounded-xl border bg-panel",
        settled
          ? market.outcome === "YES"
            ? "border-gold/60"
            : "border-edge2"
          : "border-edge hover:border-up/50",
        flash && !settled ? (flash.dir === "up" ? "animate-flash-down" : "animate-flash-up") : "",
      ].join(" ")}
    >
      {/* codex-rendered artwork banner */}
      <div className="relative h-24 overflow-hidden border-b border-edge">
        <div
          className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
          style={{
            backgroundImage: `url(/art/light/${market.service}.png), linear-gradient(135deg, #f4f7f2, #ffffff)`,
            backgroundSize: "cover, cover",
            backgroundPosition: "center 35%, center",
          }}
        />
        {src && (
          <span className="absolute bottom-3 left-3 flex items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-black/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src.logo} alt={src.provider} className="h-6 w-auto max-w-8" />
            </span>
            <span className="rounded-full bg-white/92 px-2.5 py-1 font-mono text-[10px] font-semibold text-bone shadow-sm backdrop-blur-sm">
              {src.provider}
            </span>
          </span>
        )}
        <span
          className={[
            "absolute right-3 top-3 rounded-full px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.15em] shadow-sm backdrop-blur-sm",
            settled
              ? market.outcome === "YES"
                ? "bg-gold text-white"
                : "bg-panel2 text-fog"
              : market.settlement === "auto"
                ? "bg-white/92 text-info"
                : "bg-white/92 text-gold",
          ].join(" ")}
        >
          {settled ? `settled ${market.outcome}` : "machine-settled"}
        </span>
      </div>

      <div className="p-4 pt-3">
        <p className="min-h-[2.5rem] text-[14px] font-semibold leading-snug text-bone group-hover:text-updim">
          {market.question}
        </p>

        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">
              {mode === "hedger" ? "protection premium" : "outage probability"}
            </div>
            <div
              className={[
                "tabular font-display text-4xl font-bold leading-none tracking-tight",
                settled
                  ? market.outcome === "YES"
                    ? "text-gold"
                    : "text-fog"
                  : market.price >= 0.5
                    ? "text-down"
                    : "text-bone",
              ].join(" ")}
            >
              {settled ? (market.outcome === "YES" ? "PAID" : "CLEAN") : fmtPct(market.price)}
            </div>
            {!settled && mode === "hedger" && (
              <div className="tabular mt-1 font-mono text-[10px] text-fog">
                {fmtUsd(market.price * 50_000)} per $50K of coverage
              </div>
            )}
          </div>
          <Sparkline data={market.spark} />
        </div>

        {/* one-tap side selection; winning shares pay $1, so cheap sides pay big */}
        {!settled && (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={(e) => goTrade(e, "YES")}
              className="rounded-md border border-up/40 bg-up/10 py-1.5 font-mono text-[11px] font-bold text-updim transition-colors hover:bg-up hover:text-white"
            >
              YES {Math.round(market.price * 100)}¢
              <span className="block text-[9px] font-medium opacity-80">
                pays {(1 / Math.max(0.01, market.price)).toFixed(1)}x
              </span>
            </button>
            <button
              onClick={(e) => goTrade(e, "NO")}
              className="rounded-md border border-down/40 bg-down/10 py-1.5 font-mono text-[11px] font-bold text-down transition-colors hover:bg-down hover:text-white"
            >
              NO {Math.round((1 - market.price) * 100)}¢
              <span className="block text-[9px] font-medium opacity-80">
                pays {(1 / Math.max(0.01, 1 - market.price)).toFixed(1)}x
              </span>
            </button>
          </div>
        )}

        {/* collateral escrow bar */}
        <div className="mt-3">
          <div className="flex justify-between font-mono text-[9px] uppercase tracking-wider text-fog">
            <span>escrow {fmtUsd(market.escrowUsd)}</span>
            <span>{Math.round(collateralized * 100)}% collateralized · exposure {fmtUsd(market.exposureUsd)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-panel2">
            <div
              className="h-full rounded-full bg-gradient-to-r from-updim to-up transition-[width] duration-700"
              style={{ width: `${collateralized * 100}%` }}
            />
          </div>
        </div>

        <div className="tabular mt-3 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-fog">
          <span>{market.ticker}</span>
          <span>{fmtUsd(market.volumeUsd)} vol</span>
          <span className="ml-auto text-gold">{settled ? "auto-paid" : market.closesLabel}</span>
        </div>
      </div>
    </Link>
  );
}
