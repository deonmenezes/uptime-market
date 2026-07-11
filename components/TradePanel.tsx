"use client";

import { useState } from "react";
import type { MarketView, Side } from "@/lib/market/types";
import { useMarketStore } from "./StoreContext";
import { sharesForSpend, proceedsForSale } from "@/lib/market/lmsr";
import { fmtPct } from "@/lib/format";

const QUICK = [10, 25, 50, 100];

export default function TradePanel({ market }: { market: MarketView }) {
  const { snap, trade } = useMarketStore();
  const [side, setSide] = useState<Side>("YES");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("25");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settled = market.status === "settled";
  const credits = snap?.user?.credits ?? 0;
  const pos = snap?.user?.positions[market.id] ?? { yes: 0, no: 0 };
  const held = side === "YES" ? pos.yes : pos.no;
  const n = parseFloat(amount) || 0;

  // client-side LMSR preview with the same math the server executes
  const previewShares =
    action === "buy" ? sharesForSpend(market.qYes, market.qNo, market.b, side, Math.min(n, credits)) : Math.min(n, held);
  const previewProceeds =
    action === "sell" ? proceedsForSale(market.qYes, market.qNo, market.b, side, Math.min(n, held)) : 0;

  const submit = async () => {
    if (busy || n <= 0) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const t = await trade(market.id, side, action, n);
      setNote(
        action === "buy"
          ? `filled: ${t.shares} ${side} for ${t.credits} cr → ${fmtPct(t.priceAfter)}`
          : `sold: ${t.shares} ${side} for ${t.credits} cr → ${fmtPct(t.priceAfter)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (settled) {
    return (
      <div className="rounded-md border border-edge bg-panel p-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">market settled</div>
        <div
          className={[
            "mt-2 font-display text-4xl font-bold",
            market.outcome === "YES" ? "text-up" : "text-down",
          ].join(" ")}
        >
          {market.outcome}
        </div>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-fog">{market.settledNote}</p>
        <p className="mt-1 font-mono text-[10px] text-fog/60">winning shares redeemed at 1 credit each</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-edge bg-panel p-3.5">
      <div className="grid grid-cols-2 gap-1">
        {(["buy", "sell"] as const).map((a) => (
          <button
            key={a}
            onClick={() => {
              setAction(a);
              setNote(null);
              setError(null);
            }}
            className={[
              "rounded-sm py-1.5 font-mono text-xs font-semibold uppercase tracking-widest transition-colors",
              action === a ? "bg-bone text-ink" : "bg-panel2 text-fog hover:text-bone",
            ].join(" ")}
          >
            {a}
          </button>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1">
        <button
          onClick={() => setSide("YES")}
          className={[
            "tabular rounded-sm border py-2.5 font-mono text-sm font-bold transition-colors",
            side === "YES" ? "border-up bg-up/15 text-up" : "border-edge text-fog hover:text-bone",
          ].join(" ")}
        >
          YES {fmtPct(market.price)}
        </button>
        <button
          onClick={() => setSide("NO")}
          className={[
            "tabular rounded-sm border py-2.5 font-mono text-sm font-bold transition-colors",
            side === "NO" ? "border-down bg-down/15 text-down" : "border-edge text-fog hover:text-bone",
          ].join(" ")}
        >
          NO {fmtPct(1 - market.price)}
        </button>
      </div>

      <div className="mt-3">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-fog">
          <span>{action === "buy" ? "spend credits" : `sell shares (held: ${held.toFixed(1)})`}</span>
          <span className="tabular">balance: {Math.round(credits)} cr</span>
        </div>
        <div className="mt-1 flex items-center rounded-sm border border-edge bg-ink px-2 focus-within:border-up">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="tabular w-full bg-transparent py-2 font-mono text-lg text-bone focus:outline-none"
          />
          <span className="font-mono text-xs text-fog">{action === "buy" ? "cr" : "sh"}</span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="flex-1 rounded-sm border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-up hover:text-up"
            >
              {q}
            </button>
          ))}
          <button
            onClick={() => setAmount(action === "buy" ? String(Math.floor(credits)) : held.toFixed(1))}
            className="flex-1 rounded-sm border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-up hover:text-up"
          >
            max
          </button>
        </div>
      </div>

      <div className="tabular mt-3 space-y-1 border-t border-edge pt-2 font-mono text-[11px] text-fog">
        {action === "buy" ? (
          <>
            <div className="flex justify-between">
              <span>you receive</span>
              <span className="text-bone">{previewShares.toFixed(1)} {side} shares</span>
            </div>
            <div className="flex justify-between">
              <span>payout if {side}</span>
              <span className="text-up">{previewShares.toFixed(1)} cr</span>
            </div>
            <div className="flex justify-between">
              <span>max return</span>
              <span className="text-up">
                {n > 0 && previewShares > 0 ? `${((previewShares / Math.min(n, credits) - 1) * 100).toFixed(0)}%` : "—"}
              </span>
            </div>
          </>
        ) : (
          <div className="flex justify-between">
            <span>you receive</span>
            <span className="text-bone">{previewProceeds.toFixed(1)} cr</span>
          </div>
        )}
      </div>

      <button
        onClick={submit}
        disabled={busy || n <= 0}
        className={[
          "mt-3 w-full rounded-sm py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40",
          side === "YES" ? "bg-up" : "bg-down",
        ].join(" ")}
      >
        {busy ? "executing…" : `${action} ${side}`}
      </button>

      {note && <p className="mt-2 font-mono text-[11px] text-up">{note}</p>}
      {error && <p className="mt-2 font-mono text-[11px] text-down">{error}</p>}

      <p className="mt-2 text-center font-mono text-[10px] text-fog/60">
        LMSR market maker · b={market.b} · price moves with every trade
      </p>
    </div>
  );
}
