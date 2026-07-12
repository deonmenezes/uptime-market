"use client";

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

// Demo controls (PRD §4.5): inject an outage into the SIMULATED service only.
// The four real contracts settle from live feeds and cannot be faked from here.
export default function OpsConsole() {
  const { snap, injectIncident, settle } = useMarketStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const demo = snap?.markets.find((m) => m.id === "demo-checkout");
  const demoOpen = demo?.status === "open";
  const nflxOpen = snap?.markets.find((m) => m.id === "netflix-30m")?.status === "open";
  const cldOpen = snap?.markets.find((m) => m.id === "anthropic-30m")?.status === "open";

  const fire = async (service?: string) => {
    setBusy(service ?? "checkout");
    setError(null);
    try {
      await injectIncident(service);
    } catch (e) {
      setError(e instanceof Error ? e.message : "injection failed");
    } finally {
      setBusy(null);
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
          onClick={() => fire()}
          disabled={busy !== null || !demoOpen}
          className="flex w-full items-center justify-between rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-[11px] text-bone transition-colors hover:border-down hover:text-down disabled:opacity-40"
        >
          <span>inject outage · checkout-service</span>
          <span className="text-down">{busy === "checkout" ? "firing…" : demoOpen ? "▲" : "settled"}</span>
        </button>

        <button
          onClick={() => fire("netflix-cdn")}
          disabled={busy !== null || !nflxOpen}
          className="flex w-full items-center justify-between rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-[11px] text-bone transition-colors hover:border-down hover:text-down disabled:opacity-40"
        >
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/netflix.svg" alt="Netflix" className="h-4 w-auto" />
            simulate outage · netflix (full arc + voice call)
          </span>
          <span className="text-down">{busy === "netflix-cdn" ? "firing…" : nflxOpen ? "▲" : "settled"}</span>
        </button>

        <button
          onClick={() => fire("anthropic-api")}
          disabled={busy !== null || !cldOpen}
          className="flex w-full items-center justify-between rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-[11px] text-bone transition-colors hover:border-down hover:text-down disabled:opacity-40"
        >
          <span className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/claude.svg" alt="Claude" className="h-4 w-auto" />
            simulate outage · claude api (full arc + voice call)
          </span>
          <span className="text-down">{busy === "anthropic-api" ? "firing…" : cldOpen ? "▲" : "settled"}</span>
        </button>
        <p className="font-mono text-[9px] leading-relaxed text-fog/60">
          full arc: globe turns yellow then red → LPs reprice → the contract settles YES in ~25s →
          holders paid → Twilio places an AI voice call (script by NVIDIA LLM) announcing the
          outage. time-compressed simulation; the real monitor resumes after settlement.
        </p>
        {error && <p className="font-mono text-[10px] text-down">⚠ {error}</p>}

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
