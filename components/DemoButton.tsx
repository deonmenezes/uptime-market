"use client";

// The big red button: one press runs the whole demo arc for this market and
// ends with a real phone call. Rendered on the market pages that support the
// full simulation (Netflix, Claude API).

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

const SIMULATABLE: Record<string, string> = {
  "netflix-30m": "netflix-cdn",
  "anthropic-30m": "anthropic-api",
};

export default function DemoButton({ marketId, compact = false }: { marketId: string; compact?: boolean }) {
  const { snap, injectIncident } = useMarketStore();
  const [firing, setFiring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = SIMULATABLE[marketId];
  const market = snap?.markets.find((m) => m.id === marketId);
  if (!service || !market) return null;

  const monitor = snap?.monitors.find((m) => m.service === service);
  const settled = market.status === "settled";
  const health = monitor?.health ?? "up";
  const running = !settled && (health === "confirming" || health === "down");
  const name = market.ticker;

  const fire = async () => {
    if (firing || running || settled) return;
    setFiring(true);
    setError(null);
    try {
      await injectIncident(service);
    } catch (e) {
      setError(e instanceof Error ? e.message : "simulation failed");
    } finally {
      setFiring(false);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={fire}
          disabled={firing || running || settled}
          className={[
            "mt-1.5 w-full rounded-md border py-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.15em] transition-colors",
            settled
              ? "border-gold/50 bg-gold/10 text-gold"
              : running
                ? "animate-pulse border-down bg-down text-white"
                : "border-down/50 bg-down/10 text-down hover:bg-down hover:text-white",
          ].join(" ")}
          title="globe goes red, contract settles YES, holders paid, your phone rings"
        >
          {settled
            ? "settled · paid · call sent"
            : running
              ? health === "confirming"
                ? "confirming…"
                : "down · settling…"
              : firing
                ? "injecting…"
                : "⚡ simulate downtime"}
        </button>
        {error && <p className="mt-1 font-mono text-[9px] text-down">{error}</p>}
      </>
    );
  }

  const label = settled
    ? `SETTLED YES · HOLDERS PAID · CALL DISPATCHED`
    : running
      ? health === "confirming"
        ? "ORACLE CONFIRMING… (globe is going yellow)"
        : `${name} IS DOWN · SETTLING IN SECONDS…`
      : firing
        ? "INJECTING…"
        : `⚡ SIMULATE DOWNTIME · ${name}`;

  return (
    <button
      onClick={fire}
      disabled={firing || running || settled}
      className={[
        "mt-4 block w-full rounded-xl border-2 px-6 py-5 text-center font-display text-xl font-bold tracking-tight transition-all md:text-2xl",
        settled
          ? "border-gold/60 bg-gold/10 text-gold"
          : running
            ? "animate-pulse border-down bg-down text-white"
            : "border-down bg-down text-white shadow-[0_12px_40px_rgba(207,63,56,0.35)] hover:scale-[1.01] hover:shadow-[0_16px_48px_rgba(207,63,56,0.45)]",
      ].join(" ")}
    >
      {label}
      <span className="mt-1 block font-mono text-[10px] font-medium uppercase tracking-[0.2em] opacity-90">
        {settled
          ? "redeploy or restart to reset the demo"
          : error ?? "globe goes red → contract settles YES → protection holders paid instantly → your phone rings with the AI outage call"}
      </span>
    </button>
  );
}
