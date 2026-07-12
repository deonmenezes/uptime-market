"use client";

import { use, useState } from "react";
import Link from "next/link";
import type { Side } from "@/lib/market/types";
import { useMarketStore } from "@/components/StoreContext";
import { fmtPct, fmtUsd, timeAgo } from "@/lib/format";
import { SOURCES } from "@/lib/runtimes";
import ProbChart from "@/components/ProbChart";
import TradePanel from "@/components/TradePanel";
import HedgePanel from "@/components/HedgePanel";
import TradeTape from "@/components/TradeTape";
import NameGate from "@/components/NameGate";
import StatusStrip from "@/components/StatusStrip";
import LiveTicker from "@/components/LiveTicker";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { snap, flashes, mode, setMode } = useMarketStore();
  const [pickedSide, setPickedSide] = useState<Side | null>(null);
  const market = snap?.markets.find((m) => m.id === id);

  const pickSide = (s: Side) => {
    setPickedSide(s);
    setMode("trader"); // taking a side is the trader costume
  };

  if (snap && !market) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-display text-3xl font-bold text-down">contract not found</p>
        <Link href="/" className="mt-4 inline-block font-mono text-xs uppercase text-updim underline">
          ← back to markets
        </Link>
      </main>
    );
  }

  if (!market) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-xl border border-edge bg-panel2" />
      </main>
    );
  }

  const settled = market.status === "settled";
  const flash = flashes[market.id];
  const monitor = snap?.monitors.find((t) => t.service === market.service);
  const src = SOURCES[market.service];
  const collateralized = market.exposureUsd > 0 ? Math.min(1, market.escrowUsd / market.exposureUsd) : 1;

  return (
    <main>
      <NameGate />
      <StatusStrip />
      <LiveTicker />

      <div className="mx-auto max-w-7xl px-4 py-4 pb-24">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-fog hover:text-updim">
          ← markets
        </Link>

        {/* header */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-edge"
            style={{
              backgroundImage: `url(/art/light/${market.service}.png), linear-gradient(135deg, #f4f7f2, #ffffff)`,
              backgroundSize: "cover, cover",
              backgroundPosition: "center, center",
            }}
          >
            {src && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/92 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src.logo} alt={src.provider} className="h-6 w-6 object-contain" />
                </span>
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight text-bone md:text-2xl">
              {market.question}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-fog">
              <span className="text-gold">{market.ticker}</span>
              {src && (
                <span className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src.logo} alt={src.provider} className="h-4 w-auto max-w-8" />
                  {src.provider}
                </span>
              )}
              <a href={market.sourceUrl} target="_blank" rel="noreferrer" className="text-info hover:underline">
                {market.sourceName} ↗
              </a>
              <span>closes {market.closesLabel}</span>
              <span className="tabular">{fmtUsd(market.volumeUsd)} volume</span>
            </div>
          </div>

          <div
            key={flash?.at ?? "p"}
            className={[
              "rounded-lg border border-edge bg-panel px-5 py-2 text-right",
              flash && !settled ? (flash.dir === "up" ? "animate-flash-down" : "animate-flash-up") : "",
            ].join(" ")}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">
              {mode === "hedger" ? "premium rate" : "yes probability"}
            </div>
            <div
              className={[
                "tabular font-display text-4xl font-bold leading-none",
                settled ? (market.outcome === "YES" ? "text-gold" : "text-fog") : market.price >= 0.5 ? "text-down" : "text-bone",
              ].join(" ")}
            >
              {fmtPct(market.price)}
            </div>
            {!settled && (
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => pickSide("YES")}
                  className={[
                    "rounded-md border py-1.5 px-3 font-mono text-[11px] font-bold transition-colors",
                    pickedSide === "YES"
                      ? "border-up bg-up text-white"
                      : "border-up/40 bg-up/10 text-updim hover:bg-up hover:text-white",
                  ].join(" ")}
                >
                  YES {Math.round(market.price * 100)}¢
                </button>
                <button
                  onClick={() => pickSide("NO")}
                  className={[
                    "rounded-md border py-1.5 px-3 font-mono text-[11px] font-bold transition-colors",
                    pickedSide === "NO"
                      ? "border-down bg-down text-white"
                      : "border-down/40 bg-down/10 text-down hover:bg-down hover:text-white",
                  ].join(" ")}
                >
                  NO {Math.round((1 - market.price) * 100)}¢
                </button>
              </div>
            )}
          </div>
        </div>

        {/* content grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-edge bg-panel p-2">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
                  {mode === "hedger" ? "premium rate · live" : "probability · live"}
                </span>
                {monitor && (
                  <span className="tabular font-mono text-[10px] text-info">
                    {monitor.latencyMs !== null ? `monitor: ${monitor.latencyMs}ms` : monitor.indicator}
                  </span>
                )}
              </div>
              <ProbChart marketId={id} showLatency={false} />
            </div>

            {/* what settles this */}
            <div className="grid-tex rounded-xl border border-edge bg-panel p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
                  what settles this contract
                </span>
                {monitor && (
                  <span
                    className={[
                      "ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest",
                      monitor.ok ? "text-updim" : "text-down",
                    ].join(" ")}
                  >
                    <span className={["h-1.5 w-1.5 rounded-full", monitor.ok ? "bg-up" : "animate-siren bg-down"].join(" ")} />
                    {monitor.ok ? "nominal" : "degraded"}
                    {monitor.latencyMs !== null && ` · ${monitor.latencyMs}ms`}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-fog">{market.trigger}</p>
              <p className="mt-1.5 font-mono text-[10px] text-fog/70">
                no committee resolves this. The monitor does.{" "}
                <Link href="/oracle" className="text-info hover:underline">
                  inspect the signed reading chain →
                </Link>
              </p>
            </div>

            <TradeTape marketId={id} />
          </div>

          <div className="space-y-4">
            {mode === "hedger" ? (
              <HedgePanel market={market} />
            ) : (
              <TradePanel key={pickedSide ?? "url"} market={market} initialSide={pickedSide ?? undefined} />
            )}

            {/* escrow panel */}
            <div className="rounded-xl border border-edge bg-panel p-3.5">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">collateral escrow</div>
              <div className="tabular mt-2 flex justify-between font-mono text-xs">
                <span className="text-bone">{fmtUsd(market.escrowUsd)} escrowed</span>
                <span className="text-fog">{fmtUsd(market.exposureUsd)} max payout</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-updim to-up transition-[width] duration-700"
                  style={{ width: `${collateralized * 100}%` }}
                />
              </div>
              <p className="mt-1.5 font-mono text-[10px] leading-relaxed text-fog/70">
                every dollar of written protection is escrowed at $1 per share, so sellers cannot write
                uncollateralized coverage
              </p>
            </div>

            {settled && (
              <div className="rounded-xl border border-gold/40 bg-gold/5 p-3.5">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">settlement record</div>
                <p className="mt-1.5 text-xs leading-relaxed text-fog">
                  settled {market.outcome} · {market.settledNote}
                  {market.settledTs && snap ? ` · ${timeAgo(market.settledTs, snap.now)} ago` : ""}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
