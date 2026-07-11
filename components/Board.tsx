"use client";

import { useMarketStore } from "./StoreContext";
import StatusStrip from "./StatusStrip";
import LiveTicker from "./LiveTicker";
import MarketCard from "./MarketCard";
import Leaderboard from "./Leaderboard";
import OpsConsole from "./OpsConsole";
import NameGate from "./NameGate";
import TradeTape from "./TradeTape";

export default function Board() {
  const { snap, flashes } = useMarketStore();

  return (
    <main>
      <NameGate />
      <StatusStrip />
      <LiveTicker />

      {/* masthead over the codex hero render */}
      <section className="relative overflow-hidden border-b border-edge">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: "url(/art/hero.png), linear-gradient(120deg, #0c3b2e, #081f18)",
            backgroundSize: "cover, cover",
            backgroundPosition: "center, center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-up">
            internal prediction markets · engineering reliability
          </p>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-tight text-bone md:text-4xl">
            Your status reports are optimistic.{" "}
            <span className="text-up">Your engineers aren&apos;t.</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fog">
            Private knowledge becomes public information the moment someone trades on it. Settlement
            is a machine reading telemetry — no committee, no dispute.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pb-24">
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
          <div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {(snap?.markets ?? []).map((m) => (
                <MarketCard key={m.id} market={m} flash={flashes[m.id]} />
              ))}
              {!snap &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-64 animate-pulse rounded-md border border-edge bg-panel" />
                ))}
            </div>
            <div className="mt-4">
              <TradeTape />
            </div>
          </div>

          <div className="space-y-4">
            <Leaderboard />
            <OpsConsole />
          </div>
        </div>
      </div>
    </main>
  );
}
