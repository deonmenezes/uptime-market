"use client";

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

const SERVICES = ["checkout-service", "payments-db", "api-gateway"] as const;

// The demo weapon (PRD §3): inject a telemetry incident, watch the oracle
// breach-detect and auto-settle the affected market live.
export default function OpsConsole() {
  const { snap, injectIncident, settle } = useMarketStore();
  const [busy, setBusy] = useState<string | null>(null);

  const migration = snap?.markets.find((m) => m.id === "db-migration");

  const fire = async (service: string) => {
    setBusy(service);
    try {
      await injectIncident(service);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div id="console" className="rounded-md border border-down/30 bg-panel">
      <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
        <span className="h-1.5 w-1.5 animate-siren rounded-full bg-down" />
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
          ops console · demo controls
        </span>
      </div>

      <div className="space-y-2 p-3">
        <p className="font-mono text-[10px] leading-relaxed text-fog/70">
          inject an incident → telemetry spikes → oracle detects the breach → market auto-settles.
          no committee, no dispute.
        </p>

        {SERVICES.map((svc) => (
          <button
            key={svc}
            onClick={() => fire(svc)}
            disabled={busy !== null}
            className="flex w-full items-center justify-between rounded-sm border border-edge bg-ink px-3 py-2 font-mono text-[11px] text-bone transition-colors hover:border-down hover:text-down disabled:opacity-40"
          >
            <span>inject SEV-1 · {svc}</span>
            <span className="text-down">{busy === svc ? "firing…" : "▲"}</span>
          </button>
        ))}

        {migration && migration.status === "open" && (
          <div className="mt-1 border-t border-edge pt-2">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-widest text-fog">
              manual settle · {migration.ticker}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => settle(migration.id, "YES")}
                className="flex-1 rounded-sm border border-up/60 py-1.5 font-mono text-[11px] font-semibold uppercase text-up hover:bg-up/10"
              >
                shipped → yes
              </button>
              <button
                onClick={() => settle(migration.id, "NO")}
                className="flex-1 rounded-sm border border-down/60 py-1.5 font-mono text-[11px] font-semibold uppercase text-down hover:bg-down/10"
              >
                slipped → no
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
