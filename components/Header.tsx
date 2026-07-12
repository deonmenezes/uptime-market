"use client";

import Link from "next/link";
import { useState } from "react";
import { useMarketStore } from "./StoreContext";
import { fmtUsdFull } from "@/lib/format";
import DepositModal from "./DepositModal";

export default function Header() {
  const { snap, name, mode, setMode } = useMarketStore();
  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-edge bg-ink/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2">
            {/* cumulus mark: three overlapping cloud circles */}
            <svg width="26" height="18" viewBox="0 0 26 18" aria-hidden>
              <circle cx="8" cy="11" r="6" fill="#0c8a4d" opacity="0.9" />
              <circle cx="14" cy="8" r="7" fill="#17594a" opacity="0.85" />
              <circle cx="19.5" cy="12" r="5" fill="#a87c1f" opacity="0.8" />
            </svg>
            <span className="font-display text-lg font-bold tracking-tight text-bone">cumulus</span>
            <span className="hidden rounded-sm border border-edge2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-fog sm:block">
              cloud infrastructure markets
            </span>
          </Link>

          {/* the toggle IS the pitch: same contract, two costumes */}
          <div className="ml-2 flex rounded-md border border-edge bg-panel2 p-0.5">
            {(["hedger", "trader"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  "rounded px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  mode === m ? "bg-up text-white shadow-sm" : "text-fog hover:text-bone",
                ].join(" ")}
              >
                {m}
              </button>
            ))}
          </div>

          <nav className="hidden items-center gap-4 font-mono text-xs uppercase tracking-wider text-fog lg:flex">
            <Link href="/" className="hover:text-up">markets</Link>
            <Link href="/oracle" className="hover:text-up">oracle log</Link>
            <Link href="/agents" className="hover:text-up">agents</Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {name && snap?.user && (
              <div className="tabular flex items-center gap-2 rounded-md border border-edge bg-panel px-3 py-1.5 font-mono text-xs">
                <span className="text-fog">{name}</span>
                <span className="font-semibold text-up">{fmtUsdFull(snap.user.balanceUsd)}</span>
              </div>
            )}
            <button
              onClick={() => setDepositOpen(true)}
              className="rounded-md border border-up/60 bg-up/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-updim transition-colors hover:bg-up/20"
            >
              + deposit sol
            </button>
          </div>
        </div>
      </header>
      {depositOpen && <DepositModal onClose={() => setDepositOpen(false)} />}
    </>
  );
}
