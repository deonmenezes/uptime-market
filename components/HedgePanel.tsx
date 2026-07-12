"use client";

import { useState } from "react";
import type { MarketView } from "@/lib/market/types";
import { useMarketStore } from "./StoreContext";
import { costForShares } from "@/lib/market/lmsr";
import { fmtPct, fmtUsdFull } from "@/lib/format";

const COVERAGE_PRESETS = [10_000, 25_000, 50_000, 100_000];
const FEE_PCT = 0.01;

// The insurance costume. Coverage in, premium out. No shares, no jargon -
// under the hood it is exactly a YES purchase on the same LMSR book.
export default function HedgePanel({ market }: { market: MarketView }) {
  const { snap, hedge } = useMarketStore();
  const [coverage, setCoverage] = useState("50000");
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settled = market.status === "settled";
  const balance = snap?.user?.balanceUsd ?? 0;
  const pos = snap?.user?.positions[market.id];
  const n = Math.max(0, parseFloat(coverage.replace(/[^0-9.]/g, "")) || 0);

  const quote = n > 0 ? costForShares(market.qYes, market.qNo, market.b, "YES", n) * (1 + FEE_PCT) : 0;
  const rate = n > 0 ? quote / n : market.price;

  const buy = async () => {
    if (busy || n < 100) return;
    setBusy(true);
    setError(null);
    try {
      const res = await hedge(market.id, n);
      setConfirmation(
        `Protection active. If this event occurs before ${market.closesLabel}, you are paid ${fmtUsdFull(n)} automatically, no claim to file. Premium charged: ${fmtUsdFull(res.premium)} (${(res.rate * 100).toFixed(2)}%).`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (settled) {
    const paid = market.outcome === "YES";
    return (
      <div className="rounded-xl border border-edge bg-panel p-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">contract settled</div>
        <div className={["mt-2 font-display text-3xl font-bold", paid ? "text-gold" : "text-fog"].join(" ")}>
          {paid ? "CLAIMS PAID" : "NO EVENT"}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-fog">
          {paid
            ? "The oracle confirmed the outage and every protection holder was paid instantly."
            : "The window closed without a qualifying event. Premiums stay with the protection writers."}
        </p>
        <p className="mt-1 font-mono text-[10px] text-fog/70">{market.settledNote}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-base font-bold text-bone">Protect my business</h3>
        <span className="tabular font-mono text-[10px] text-fog">rate {fmtPct(rate)}</span>
      </div>

      <div className="mt-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-fog">coverage amount</label>
        <div className="mt-1 flex items-center rounded-md border border-edge bg-ink px-3 focus-within:border-up">
          <span className="font-mono text-lg text-fog">$</span>
          <input
            value={coverage}
            onChange={(e) => setCoverage(e.target.value.replace(/[^0-9]/g, ""))}
            inputMode="numeric"
            className="tabular w-full bg-transparent py-2.5 pl-1 font-mono text-lg text-bone focus:outline-none"
          />
        </div>
        <div className="mt-1.5 flex gap-1">
          {COVERAGE_PRESETS.map((c) => (
            <button
              key={c}
              onClick={() => setCoverage(String(c))}
              className="flex-1 rounded-md border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-up hover:text-updim"
            >
              ${c / 1000}K
            </button>
          ))}
        </div>
      </div>

      <div className="tabular mt-4 space-y-1.5 rounded-md border border-edge bg-panel2/60 p-3 font-mono text-[12px]">
        <div className="flex justify-between text-fog">
          <span>you pay today</span>
          <span className="font-semibold text-bone">{fmtUsdFull(quote)}</span>
        </div>
        <div className="flex justify-between text-fog">
          <span>you receive if it happens</span>
          <span className="font-semibold text-updim">{fmtUsdFull(n)}</span>
        </div>
        <div className="flex justify-between text-fog">
          <span>coverage window</span>
          <span className="text-bone">until {market.closesLabel}</span>
        </div>
        <div className="flex justify-between text-fog">
          <span>claims process</span>
          <span className="text-bone">none, paid automatically</span>
        </div>
      </div>

      <button
        onClick={buy}
        disabled={busy || n < 100 || quote > balance}
        className="mt-3 w-full rounded-md bg-up py-3 font-mono text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-updim disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "binding coverage…" : `buy ${fmtUsdFull(n)} of protection`}
      </button>
      {quote > balance && (
        <p className="mt-1.5 text-center font-mono text-[10px] text-down">
          premium exceeds your balance ({fmtUsdFull(balance)})
        </p>
      )}

      {pos && pos.yes > 0 && (
        <div className="mt-3 rounded-md border border-up/30 bg-up/5 p-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-updim">your active protection</div>
          <div className="tabular mt-1 flex justify-between font-mono text-xs">
            <span className="text-bone">{fmtUsdFull(pos.yes)} coverage</span>
            <span className="text-fog">premium paid {fmtUsdFull(pos.premiumPaid)}</span>
          </div>
        </div>
      )}

      {confirmation && <p className="mt-3 text-xs leading-relaxed text-updim">{confirmation}</p>}
      {error && <p className="mt-3 font-mono text-[11px] text-down">{error}</p>}

      <p className="mt-3 text-center font-mono text-[9px] leading-relaxed text-fog/60">
        this is a YES position on the same book the traders see. Flip the toggle
      </p>
    </div>
  );
}
