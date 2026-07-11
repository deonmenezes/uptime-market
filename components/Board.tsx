"use client";

import { useMarketStore } from "./StoreContext";
import StatusStrip from "./StatusStrip";
import LiveTicker from "./LiveTicker";
import MarketCard from "./MarketCard";
import Leaderboard from "./Leaderboard";
import OpsConsole from "./OpsConsole";
import NameGate from "./NameGate";
import TradeTape from "./TradeTape";
import HeroSlider from "./HeroSlider";

export default function Board() {
  const { snap, flashes } = useMarketStore();

  return (
    <main>
      <NameGate />
      <StatusStrip />
      <LiveTicker />

      {/* masthead: copy left, codex slider right */}
      <section className="border-b border-edge bg-panel">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 md:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="animate-fade-in">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-up">
              internal prediction markets · engineering reliability
            </p>
            <h1 className="mt-3 max-w-xl font-display text-4xl font-bold leading-[1.08] tracking-tight text-bone md:text-5xl">
              Your status reports are optimistic.{" "}
              <span className="text-up">Your engineers aren&apos;t.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-fog">
              Private knowledge becomes public information the moment someone trades on it.
              Settlement is a machine reading telemetry: no committee, no dispute.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a
                href="#markets"
                className="rounded-md bg-up px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-updim"
              >
                Trade the markets
              </a>
              <div className="flex items-center gap-4 opacity-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/aws.svg" alt="AWS" className="h-7" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/googlecloud.svg" alt="Google Cloud" className="h-6" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/cloudflare.svg" alt="Cloudflare" className="h-6" />
              </div>
            </div>
          </div>
          <HeroSlider />
        </div>
      </section>

      <div id="markets" className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(snap?.markets ?? []).map((m) => (
                <MarketCard key={m.id} market={m} flash={flashes[m.id]} />
              ))}
              {!snap &&
                Array.from({ length: 4 }).map((_, i) => (
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
