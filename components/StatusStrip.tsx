"use client";

import { useMarketStore } from "./StoreContext";
import { RUNTIMES } from "@/lib/runtimes";

// Live service health, straight from the telemetry oracle, with the runtime
// each service actually runs on.
export default function StatusStrip() {
  const { snap } = useMarketStore();
  if (!snap) return null;

  return (
    <div className="grid-tex border-b border-edge bg-panel2/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-stretch gap-x-10 gap-y-2 px-4 py-2.5">
        {snap.telemetry.map((t) => {
          const rt = RUNTIMES[t.service];
          return (
            <div key={t.service} className="flex items-center gap-3">
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  t.incident ? "animate-siren bg-down" : t.healthy ? "bg-up" : "animate-siren bg-gold",
                ].join(" ")}
              />
              {rt && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rt.logo} alt={rt.provider} title={`${rt.provider} ${rt.product}`} className="h-5 w-auto max-w-9" />
              )}
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-[11px] font-semibold text-bone">{t.service}</span>
                  {rt && <span className="hidden font-mono text-[9px] text-fog/70 xl:inline">{rt.product}</span>}
                </div>
                <div className="tabular flex gap-3 font-mono text-[10px] text-fog">
                  <span>up {t.uptimePct.toFixed(2)}%</span>
                  <span className={t.errorRatePct > 2 ? "font-semibold text-down" : ""}>err {t.errorRatePct.toFixed(2)}%</span>
                  <span className={t.p99Ms > 300 ? "font-semibold text-down" : ""}>p99 {t.p99Ms}ms</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-fog">sev-1 this week</span>
          <span
            className={[
              "tabular rounded-sm border px-2 py-0.5 font-mono text-sm font-bold",
              snap.sev1Count > 2 ? "border-down text-down" : snap.sev1Count > 0 ? "border-gold text-gold" : "border-edge2 text-bone",
            ].join(" ")}
          >
            {snap.sev1Count}
          </span>
        </div>
      </div>
    </div>
  );
}
