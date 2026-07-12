"use client";

// The big red button: one press runs the whole Netflix demo arc and ends with
// a real phone call. Unmissable by design.

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

export default function DemoButton() {
  const { snap, injectIncident } = useMarketStore();
  const [firing, setFiring] = useState(false);

  const market = snap?.markets.find((m) => m.id === "netflix-30m");
  const monitor = snap?.monitors.find((m) => m.service === "netflix-cdn");
  const settled = market?.status === "settled";
  const health = monitor?.health ?? "up";
  const running = !settled && (health === "confirming" || health === "down");

  const fire = async () => {
    if (firing || running || settled) return;
    setFiring(true);
    try {
      await injectIncident("netflix-cdn");
    } finally {
      setFiring(false);
    }
  };

  const label = settled
    ? "SETTLED YES · HOLDERS PAID · CALL DISPATCHED"
    : running
      ? health === "confirming"
        ? "ORACLE CONFIRMING… (globe is going yellow)"
        : "NETFLIX IS DOWN · SETTLING IN SECONDS…"
      : firing
        ? "INJECTING…"
        : "⚡ SIMULATE NETFLIX DOWNTIME";

  return (
    <section className="border-b border-edge bg-panel2/60">
      <div className="mx-auto max-w-7xl px-4 py-5">
        <button
          onClick={fire}
          disabled={firing || running || settled}
          className={[
            "block w-full rounded-xl border-2 px-6 py-5 text-center font-display text-xl font-bold tracking-tight transition-all md:text-2xl",
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
              : "globe goes red → NFLX30 settles YES → protection holders paid instantly → your phone rings with the AI outage call"}
          </span>
        </button>
      </div>
    </section>
  );
}
