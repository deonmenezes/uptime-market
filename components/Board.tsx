"use client";

import { useMarketStore } from "./StoreContext";
import StatusStrip from "./StatusStrip";
import LiveTicker from "./LiveTicker";
import MarketCard from "./MarketCard";
import Leaderboard from "./Leaderboard";
import OpsConsole from "./OpsConsole";
import NameGate from "./NameGate";
import TradeTape from "./TradeTape";
import DowntimeGlobe from "./DowntimeGlobe";
import DemoButton from "./DemoButton";

export default function Board() {
  const { snap, flashes, mode, setMode } = useMarketStore();

  return (
    <main>
      <NameGate />
      <StatusStrip />
      <LiveTicker />

      {/* masthead: copy left, live downtime globe right */}
      <section className="border-b border-edge bg-panel">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="animate-fade-in">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-updim">
              tradeable downtime protection
            </p>
            <h1 className="mt-3 max-w-xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-bone md:text-5xl">
              SLA credits are toy insurance.{" "}
              <span className="text-updim">This is the real hedge.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-fog">
              An open market where any company can buy real downtime protection, anyone can sell
              it, and settlement is a machine reading cloud telemetry. A parametric policy is a
              prediction market contract. Flip the toggle and watch.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                onClick={() => setMode(mode === "hedger" ? "trader" : "hedger")}
                className="rounded-md bg-up px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-updim"
              >
                {mode === "hedger" ? "I'm here to trade →" : "I need protection →"}
              </button>
              <div className="flex items-center gap-4 opacity-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/aws.svg" alt="AWS" className="h-7" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/stripe.svg" alt="Stripe" className="h-5" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/cloudflare.svg" alt="Cloudflare" className="h-6" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/openai.svg" alt="OpenAI" className="h-5" />
              </div>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-edge bg-panel shadow-[0_16px_48px_rgba(22,33,27,0.10)]">
            <div className="relative aspect-[16/10]">
              <DowntimeGlobe />
            </div>
          </div>
        </div>
      </section>

      <DemoButton />

      <div id="markets" className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(snap?.markets ?? []).map((m) => (
                <MarketCard key={m.id} market={m} flash={flashes[m.id]} />
              ))}
              {!snap &&
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-72 animate-pulse rounded-xl border border-edge bg-panel2" />
                ))}
            </div>
            <div className="mt-5">
              <TradeTape />
            </div>
          </div>

          <div className="space-y-5">
            <Leaderboard />
            <OpsConsole />
          </div>
        </div>
      </div>
    </main>
  );
}
