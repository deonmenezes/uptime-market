"use client";

import { use } from "react";
import Link from "next/link";
import { useMarketStore } from "@/components/StoreContext";
import { fmtCredits, fmtPct, timeAgo } from "@/lib/format";
import { RUNTIMES } from "@/lib/runtimes";
import ProbChart from "@/components/ProbChart";
import TradePanel from "@/components/TradePanel";
import TradeTape from "@/components/TradeTape";
import NameGate from "@/components/NameGate";
import StatusStrip from "@/components/StatusStrip";
import LiveTicker from "@/components/LiveTicker";

export default function MarketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { snap, flashes } = useMarketStore();
  const market = snap?.markets.find((m) => m.id === id);

  if (snap && !market) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-24 text-center">
        <p className="font-display text-3xl font-bold text-down">market not found</p>
        <Link href="/" className="mt-4 inline-block font-mono text-xs uppercase text-up underline">
          ← back to markets
        </Link>
      </main>
    );
  }

  if (!market) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-md border border-edge bg-panel" />
      </main>
    );
  }

  const settled = market.status === "settled";
  const flash = flashes[market.id];
  const reading = snap?.telemetry.find((t) => t.service === market.service);
  const myPos = snap?.user?.positions[market.id];

  return (
    <main>
      <NameGate />
      <StatusStrip />
      <LiveTicker />

      <div className="mx-auto max-w-7xl px-4 py-4 pb-24">
        <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-fog hover:text-up">
          ← markets
        </Link>

        {/* header */}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <div
            className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-edge"
            style={{
              backgroundImage: `url(/art/light/${market.service}.png), linear-gradient(135deg, #f4f7f2, #ffffff)`,
              backgroundSize: "cover, cover",
              backgroundPosition: "center, center",
            }}
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-xl font-bold leading-tight text-bone md:text-2xl">
              {market.question}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-fog">
              <span className="text-gold">{market.ticker}</span>
              {RUNTIMES[market.service] && (
                <span className="flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={RUNTIMES[market.service].logo}
                    alt={RUNTIMES[market.service].provider}
                    className="h-4 w-auto max-w-8"
                  />
                  {market.service} · {RUNTIMES[market.service].product}
                </span>
              )}
              <span className={market.settlement === "auto" ? "text-info" : "text-gold"}>
                {market.settlement === "auto" ? "oracle-settled" : "manually settled"}
              </span>
              <span>closes {market.closesLabel}</span>
              <span className="tabular">{fmtCredits(market.volumeCredits)} cr volume</span>
            </div>
          </div>

          <div
            key={flash?.at ?? "p"}
            className={[
              "rounded-md border border-edge bg-panel px-5 py-2 text-right",
              flash && !settled ? (flash.dir === "up" ? "animate-flash-up" : "animate-flash-down") : "",
            ].join(" ")}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-fog">yes probability</div>
            <div
              className={[
                "tabular font-display text-4xl font-bold leading-none",
                settled ? (market.outcome === "YES" ? "text-up" : "text-down") : market.price >= 0.5 ? "text-up" : "text-down",
              ].join(" ")}
            >
              {fmtPct(market.price)}
            </div>
          </div>
        </div>

        {/* content grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_330px]">
          <div className="space-y-4">
            <div className="rounded-md border border-edge bg-panel p-2">
              <div className="flex items-center justify-between px-2 pt-1">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
                  probability · live
                </span>
                {market.service === "api-gateway" && (
                  <span className="font-mono text-[10px] text-info">p99 latency overlaid</span>
                )}
              </div>
              <ProbChart marketId={id} showLatency={market.service === "api-gateway"} />
            </div>

            {reading && (
              <div className="grid-tex rounded-md border border-edge bg-panel p-3">
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
                    oracle reading · {reading.service}
                  </span>
                  <span className="tabular font-mono text-xs text-bone">up {reading.uptimePct.toFixed(2)}%</span>
                  <span className={["tabular font-mono text-xs", reading.errorRatePct > 2 ? "text-down" : "text-bone"].join(" ")}>
                    err {reading.errorRatePct.toFixed(2)}%
                  </span>
                  <span className={["tabular font-mono text-xs", reading.p99Ms > 300 ? "text-down" : "text-bone"].join(" ")}>
                    p99 {reading.p99Ms}ms
                  </span>
                  <span
                    className={[
                      "ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest",
                      reading.incident ? "text-down" : "text-up",
                    ].join(" ")}
                  >
                    <span className={["h-1.5 w-1.5 rounded-full", reading.incident ? "animate-siren bg-down" : "bg-up"].join(" ")} />
                    {reading.incident ? "incident active" : "nominal"}
                  </span>
                </div>
              </div>
            )}

            <TradeTape marketId={id} />
          </div>

          <div className="space-y-4">
            <TradePanel market={market} />

            {myPos && (myPos.yes > 0 || myPos.no > 0) && (
              <div className="rounded-md border border-edge bg-panel p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">your position</div>
                <div className="tabular mt-2 space-y-1 font-mono text-xs">
                  {myPos.yes > 0 && (
                    <div className="flex justify-between">
                      <span className="text-up">{myPos.yes.toFixed(1)} YES</span>
                      <span className="text-fog">worth ~{(myPos.yes * market.price).toFixed(1)} cr</span>
                    </div>
                  )}
                  {myPos.no > 0 && (
                    <div className="flex justify-between">
                      <span className="text-down">{myPos.no.toFixed(1)} NO</span>
                      <span className="text-fog">worth ~{(myPos.no * (1 - market.price)).toFixed(1)} cr</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-md border border-edge bg-panel p-3">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">settlement rules</div>
              <p className="mt-1.5 text-xs leading-relaxed text-fog">{market.rule}</p>
              {settled && (
                <p className="mt-2 border-t border-edge pt-2 font-mono text-[11px] text-gold">
                  settled {market.outcome} · {market.settledNote}
                  {market.settledTs && snap ? ` · ${timeAgo(market.settledTs, snap.now)} ago` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
