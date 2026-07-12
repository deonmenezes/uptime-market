"use client";

import { useMarketStore } from "./StoreContext";
import { SOURCES } from "@/lib/runtimes";
import { fmtPct } from "@/lib/format";
import Sparkline from "./Sparkline";

// The Cloud Reliability Index: the public-good price feed. Each contract's
// live probability, straight off the book, plus the raw monitor reading.
export default function StatusStrip() {
  const { snap } = useMarketStore();
  if (!snap) return null;

  return (
    <div className="grid-tex border-b border-edge bg-panel2/70">
      <div className="mx-auto flex max-w-7xl items-center gap-x-8 gap-y-2 overflow-x-auto px-4 py-2.5">
        <span className="shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.25em] text-fog">
          cloud reliability
          <br />
          index · live
        </span>

        {snap.markets.map((m) => {
          const src = SOURCES[m.service];
          const monitor = snap.monitors.find((x) => x.service === m.service);
          const health = monitor ? (monitor.health ?? (monitor.ok ? "up" : "down")) : "up";
          return (
            <a key={m.id} href={`/m/${m.id}`} className="flex shrink-0 items-center gap-2.5">
              {src && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src.logo} alt={src.provider} className="h-5 w-auto max-w-9" />
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={[
                      "h-1.5 w-1.5 rounded-full",
                      m.status === "settled"
                        ? "bg-gold"
                        : health === "down"
                          ? "animate-siren bg-down"
                          : health === "confirming"
                            ? "animate-pulse bg-gold"
                            : "bg-up",
                    ].join(" ")}
                  />
                  <span className="font-mono text-[10px] font-semibold text-bone">{m.ticker}</span>
                  <span
                    className={[
                      "tabular font-mono text-[11px] font-bold",
                      m.price >= 0.5 ? "text-down" : "text-updim",
                    ].join(" ")}
                  >
                    {m.status === "settled" ? `⚖ ${m.outcome}` : fmtPct(m.price)}
                  </span>
                </div>
                <div className="tabular font-mono text-[9px] text-fog">
                  {monitor
                    ? monitor.latencyMs !== null
                      ? `${monitor.label} · ${monitor.latencyMs}ms`
                      : `${monitor.label} · ${monitor.indicator ?? ""}`
                    : m.sourceName}
                </div>
              </div>
              <Sparkline data={m.spark} width={56} height={20} />
            </a>
          );
        })}

        <span className="ml-auto hidden shrink-0 font-mono text-[9px] text-fog/60 xl:block">
          sha256-chained readings: {snap.oracleChainLength}
        </span>
      </div>
    </div>
  );
}
