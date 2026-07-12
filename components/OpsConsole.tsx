"use client";

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

// Demo controls (PRD §4.5): inject an outage into the SIMULATED service only.
// The four real contracts settle from live feeds and cannot be faked from here.
export default function OpsConsole() {
  const { snap, injectIncident, settle } = useMarketStore();
  const [busy, setBusy] = useState(false);
  const [busyNflx, setBusyNflx] = useState(false);

  const demo = snap?.markets.find((m) => m.id === "demo-checkout");
  const demoOpen = demo?.status === "open";
  const nflx = snap?.markets.find((m) => m.id === "netflix-30m");
  const nflxOpen = nflx?.status === "open";

  const fire = async () => {
    setBusy(true);
    try {
      await injectIncident();
    } finally {
      setBusy(false);
    }
  };

  const fireNetflix = async () => {
    setBusyNflx(true);
    try {
      await injectIncident("netflix-cdn");
    } finally {
      setBusyNflx(false);
    }
  };

  return (
    <div id="console" className="rounded-xl border border-down/25 bg-panel">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span className="h-1.5 w-1.5 animate-siren rounded-full bg-down" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
          demo console · simulated service only
        </span>
      </div>

      <div className="space-y-2 p-3">
        <p className="font-mono text-[10px] leading-relaxed text-fog/70">
          inject an outage on checkout-service (the stage safety net) → the oracle logs failing
          readings → the DEMO contract settles YES and protection holders are paid. the AWS,
          Stripe, Cloudflare and OpenAI contracts settle only from real telemetry.
        </p>

        <button
          onClick={fire}
          disabled={busy || !demoOpen}
          className="flex w-full items-center justify-between rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-[11px] text-bone transition-colors hover:border-down hover:text-down disabled:opacity-40"
        >
          <span>inject outage · checkout-service</span>
          <span className="text-down">{busy ? "firing…" : demoOpen ? "▲" : "settled"}</span>
        </button>

        <button
          onClick={fireNetflix}
          disabled={busyNflx || !nflxOpen}
          className="flex w-full items-center justify-between rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-[11px] text-bone transition-colors hover:border-down hover:text-down disabled:opacity-40"
        >
          <span>simulate outage · netflix (full arc + voice call)</span>
          <span className="text-down">{busyNflx ? "firing…" : nflxOpen ? "▲" : "settled"}</span>
        </button>
        <p className="font-mono text-[9px] leading-relaxed text-fog/60">
          netflix arc: globe turns yellow then red → LPs reprice → NFLX30 settles YES in ~25s →
          holders paid → Twilio places an AI voice call (script by NVIDIA LLM) announcing the
          outage. time-compressed simulation; the real netflix monitor resumes after settlement.
        </p>

        {demoOpen && (
          <div className="flex gap-2 border-t border-edge pt-2">
            <button
              onClick={() => settle("demo-checkout", "NO")}
              className="flex-1 rounded-md border border-edge py-1.5 font-mono text-[10px] uppercase text-fog hover:text-bone"
            >
              close window → NO
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
