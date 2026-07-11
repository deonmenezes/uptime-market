"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { OracleReading } from "@/lib/market/types";
import { timeAgo } from "@/lib/format";

interface LogResponse {
  verified: boolean;
  length: number;
  readings: OracleReading[];
}

// The tamper-evident settlement history: certified sensor → cryptographic
// attestation → settlement, inspectable by anyone.
export default function OraclePage() {
  const [log, setLog] = useState<LogResponse | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/oracle/log", { cache: "no-store" });
        if (res.ok) setLog(await res.json());
        setNow(Date.now());
      } catch {
        // next poll retries
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <Link href="/" className="font-mono text-[11px] uppercase tracking-wider text-fog hover:text-updim">
        ← markets
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="font-display text-2xl font-bold text-bone">Oracle log</h1>
        {log && (
          <span
            className={[
              "flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider",
              log.verified ? "border-up/50 bg-up/10 text-updim" : "border-down bg-down/10 text-down",
            ].join(" ")}
          >
            <span className={["h-1.5 w-1.5 rounded-full", log.verified ? "bg-up" : "bg-down"].join(" ")} />
            {log.verified ? `chain verified · ${log.length} readings` : "CHAIN BROKEN"}
          </span>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fog">
        Every reading the oracle takes — synthetic monitor pings, public status feeds, the demo
        simulator — is hashed with its predecessor into an append-only chain:{" "}
        <code className="rounded bg-panel2 px-1 py-0.5 font-mono text-[11px]">
          sha256(reading + prev_hash)
        </code>
        . Settlements reference the exact reading that triggered them. Tamper with history and the
        chain breaks.
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-edge bg-panel">
        <table className="w-full text-left font-mono text-[11px]">
          <thead>
            <tr className="border-b border-edge text-[9px] uppercase tracking-[0.15em] text-fog/60">
              <th className="px-3 py-2">age</th>
              <th className="px-3 py-2">source</th>
              <th className="px-3 py-2">reading</th>
              <th className="px-3 py-2">ok</th>
              <th className="px-3 py-2">hash</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge/60">
            {(log?.readings ?? []).map((r) => (
              <tr key={r.hash} className={!r.ok ? "bg-down/5" : undefined}>
                <td className="tabular whitespace-nowrap px-3 py-1.5 text-fog/70">{timeAgo(r.ts, now)}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-info">{r.source}</td>
                <td className="max-w-md truncate px-3 py-1.5 text-fog">{r.summary}</td>
                <td className="px-3 py-1.5">
                  <span className={r.ok ? "text-updim" : "font-semibold text-down"}>{r.ok ? "up" : "DOWN"}</span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-fog/60">
                  {r.hash.slice(0, 10)}… ← {r.prevHash === "genesis" ? "genesis" : `${r.prevHash.slice(0, 10)}…`}
                </td>
              </tr>
            ))}
            {!log && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-fog/60">
                  loading chain…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
