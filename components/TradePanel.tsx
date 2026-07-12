"use client";

import { useEffect, useState } from "react";
import type { MarketView, Side } from "@/lib/market/types";
import { useMarketStore } from "./StoreContext";
import { sharesForSpend, proceedsForSale } from "@/lib/market/lmsr";
import { fmtPct, fmtUsd, fmtUsdFull } from "@/lib/format";

const QUICK = [1_000, 5_000, 10_000, 50_000];

// The trader costume: the same contract as shares at a probability.
export default function TradePanel({ market, initialSide }: { market: MarketView; initialSide?: Side }) {
  const { snap, trade } = useMarketStore();
  const [side, setSide] = useState<Side>(initialSide ?? "NO");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("5000");

  // deep link: /m/<id>?side=YES preselects the side (card buttons, globe clicks)
  useEffect(() => {
    if (initialSide) return; // an explicit pick on the page wins over the URL
    const want = new URLSearchParams(window.location.search).get("side");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (want === "YES" || want === "NO") setSide(want);
  }, [initialSide]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const settled = market.status === "settled";
  const balance = snap?.user?.balanceUsd ?? 0;
  const pos = snap?.user?.positions[market.id] ?? { yes: 0, no: 0, premiumPaid: 0, premiumEarned: 0 };
  const held = side === "YES" ? pos.yes : pos.no;
  const n = parseFloat(amount) || 0;

  const previewShares =
    action === "buy" ? sharesForSpend(market.qYes, market.qNo, market.b, side, Math.min(n, balance)) : Math.min(n, held);
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
        `filled: ${action === "buy" ? "" : "sold "}$${Math.round(t.shares).toLocaleString()} ${side} @ → ${fmtPct(t.priceAfter)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (settled) {
    return (
      <div className="rounded-xl border border-edge bg-panel p-4 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">market settled</div>
        <div
          className={["mt-2 font-display text-4xl font-bold", market.outcome === "YES" ? "text-gold" : "text-fog"].join(" ")}
        >
          {market.outcome}
        </div>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-fog">{market.settledNote}</p>
        <p className="mt-1 font-mono text-[10px] text-fog/60">winning shares redeemed at $1 each</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-edge bg-panel p-4">
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
              "rounded-md py-1.5 font-mono text-xs font-semibold uppercase tracking-widest transition-colors",
              action === a ? "bg-bone text-white" : "bg-panel2 text-fog hover:text-bone",
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
            "tabular rounded-md border py-2.5 font-mono text-sm font-bold transition-colors",
            side === "YES" ? "border-down bg-down/10 text-down" : "border-edge text-fog hover:text-bone",
          ].join(" ")}
        >
          YES {fmtPct(market.price)}
        </button>
        <button
          onClick={() => setSide("NO")}
          className={[
            "tabular rounded-md border py-2.5 font-mono text-sm font-bold transition-colors",
            side === "NO" ? "border-up bg-up/10 text-updim" : "border-edge text-fog hover:text-bone",
          ].join(" ")}
        >
          NO {fmtPct(1 - market.price)}
        </button>
      </div>
      <p className="mt-1.5 text-center font-mono text-[9px] text-fog/70">
        YES = the outage happens · buying NO = writing protection (collateral escrowed)
      </p>

      <div className="mt-3">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-fog">
          <span>{action === "buy" ? "spend (usd)" : `sell shares (held: ${fmtUsd(held)})`}</span>
          <span className="tabular">bal {fmtUsd(balance)}</span>
        </div>
        <div className="mt-1 flex items-center rounded-md border border-edge bg-ink px-3 focus-within:border-up">
          <span className="font-mono text-lg text-fog">$</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            inputMode="decimal"
            className="tabular w-full bg-transparent py-2 pl-1 font-mono text-lg text-bone focus:outline-none"
          />
        </div>
        <div className="mt-1.5 flex gap-1">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="flex-1 rounded-md border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-up hover:text-updim"
            >
              ${q >= 1000 ? `${q / 1000}K` : q}
            </button>
          ))}
          <button
            onClick={() => setAmount(action === "buy" ? String(Math.floor(balance)) : String(Math.floor(held)))}
            className="flex-1 rounded-md border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-up hover:text-updim"
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
              <span className="text-bone">{fmtUsd(previewShares)} {side} shares</span>
            </div>
            <div className="flex justify-between">
              <span>payout if {side}</span>
              <span className="text-updim">{fmtUsd(previewShares)}</span>
            </div>
            {side === "NO" && (
              <div className="flex justify-between">
                <span>collateral escrowed</span>
                <span className="text-gold">{fmtUsd(previewShares)} (premium netted)</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-between">
            <span>you receive</span>
            <span className="text-bone">{fmtUsdFull(previewProceeds)}</span>
          </div>
        )}
      </div>

      <button
        onClick={submit}
        disabled={busy || n <= 0}
        className={[
          "mt-3 w-full rounded-md py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40",
          side === "YES" ? "bg-down hover:opacity-90" : "bg-up hover:bg-updim",
        ].join(" ")}
      >
        {busy ? "executing…" : `${action} ${side}`}
      </button>

      {note && <p className="mt-2 font-mono text-[11px] text-updim">{note}</p>}
      {error && <p className="mt-2 font-mono text-[11px] text-down">{error}</p>}

      <p className="mt-2 text-center font-mono text-[10px] text-fog/60">
        LMSR market maker · a quote exists at every liquidity level
      </p>
    </div>
  );
}
