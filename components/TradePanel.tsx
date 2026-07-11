"use client";

import { useState } from "react";
import type { Market, Side } from "@/lib/types";
import { engine } from "@/lib/engine";
import { fmtCents } from "@/lib/format";

const QUICK = [0.1, 0.5, 1, 5];

export default function TradePanel({ market }: { market: Market }) {
  const [side, setSide] = useState<Side>("YES");
  const [action, setAction] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("1");
  const [placed, setPlaced] = useState(false);

  const sol = parseFloat(amount) || 0;
  const price = side === "YES" ? market.yesCents : 100 - market.yesCents;
  const shares = price > 0 ? (sol * 100) / price : 0;
  const payout = shares; // each winning share redeems for 1¢-unit = 0.01 SOL in this demo economy

  const submit = () => {
    if (sol <= 0) return;
    engine.userTrade(market.id, side, action, sol);
    setPlaced(true);
    setTimeout(() => setPlaced(false), 1500);
  };

  return (
    <div className="rounded-sm border border-edge bg-panel p-3">
      {/* buy / sell tabs */}
      <div className="grid grid-cols-2 gap-1">
        {(["buy", "sell"] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={[
              "rounded-sm py-1.5 font-mono text-xs font-semibold uppercase tracking-widest",
              action === a
                ? a === "buy"
                  ? "bg-lime text-ink"
                  : "bg-hot text-ink"
                : "bg-panel2 text-fog hover:text-bone",
            ].join(" ")}
          >
            {a}
          </button>
        ))}
      </div>

      {/* side toggle */}
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button
          onClick={() => setSide("YES")}
          className={[
            "rounded-sm border py-2 font-mono text-sm font-bold",
            side === "YES" ? "border-lime bg-lime/15 text-lime" : "border-edge text-fog hover:text-bone",
          ].join(" ")}
        >
          YES {fmtCents(market.yesCents)}
        </button>
        <button
          onClick={() => setSide("NO")}
          className={[
            "rounded-sm border py-2 font-mono text-sm font-bold",
            side === "NO" ? "border-hot bg-hot/15 text-hot" : "border-edge text-fog hover:text-bone",
          ].join(" ")}
        >
          NO {fmtCents(100 - market.yesCents)}
        </button>
      </div>

      {/* amount */}
      <div className="mt-3">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-fog">
          <span>amount</span>
          <span>balance: 12.42 ◎</span>
        </div>
        <div className="mt-1 flex items-center rounded-sm border border-edge bg-ink px-2">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            className="w-full bg-transparent py-2 font-mono text-lg text-bone focus:outline-none"
          />
          <span className="font-mono text-sm text-fog">SOL ◎</span>
        </div>
        <div className="mt-1.5 flex gap-1">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(String(q))}
              className="flex-1 rounded-sm border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-lime hover:text-lime"
            >
              {q}
            </button>
          ))}
          <button
            onClick={() => setAmount("12.42")}
            className="flex-1 rounded-sm border border-edge bg-panel2 py-1 font-mono text-[11px] text-fog hover:border-lime hover:text-lime"
          >
            max
          </button>
        </div>
      </div>

      {/* receipt */}
      <div className="mt-3 space-y-1 border-t border-edge pt-2 font-mono text-[11px] text-fog">
        <div className="flex justify-between">
          <span>shares</span>
          <span className="text-bone">{shares.toFixed(1)} {side}</span>
        </div>
        <div className="flex justify-between">
          <span>avg price</span>
          <span className="text-bone">{fmtCents(price)}</span>
        </div>
        <div className="flex justify-between">
          <span>payout if {side}</span>
          <span className="text-lime">{(payout / 100).toFixed(2)} ◎</span>
        </div>
      </div>

      <button
        onClick={submit}
        className={[
          "btn-hard mt-3 w-full rounded-sm border py-2.5 font-mono text-sm font-bold uppercase tracking-widest",
          side === "YES"
            ? "border-lime bg-lime text-ink"
            : "border-hot bg-hot text-ink [box-shadow:3px_3px_0_0_rgba(255,70,85,0.9)]",
        ].join(" ")}
      >
        {placed ? "✓ placed (demo)" : `${action} ${side}`}
      </button>

      <p className="mt-2 text-center font-mono text-[10px] text-fog/70">
        demo mode · trades are simulated locally
      </p>
    </div>
  );
}
