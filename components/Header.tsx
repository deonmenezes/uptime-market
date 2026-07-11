"use client";

import Link from "next/link";
import { useState } from "react";
import { useMarketStore } from "./StoreContext";
import { fmtCredits } from "@/lib/format";
import DepositModal from "./DepositModal";

export default function Header() {
  const { snap, name } = useMarketStore();
  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-edge bg-ink/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute h-full w-full animate-pulse-dot rounded-full bg-up" />
            </span>
            <span className="font-display text-lg font-bold tracking-tight text-bone">
              uptime<span className="text-up">.market</span>
            </span>
            <span className="hidden rounded-sm border border-edge2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-fog sm:block">
              internal
            </span>
          </Link>

          <nav className="hidden items-center gap-4 font-mono text-xs uppercase tracking-wider text-fog md:flex">
            <Link href="/" className="hover:text-up">markets</Link>
            <Link href="/#leaderboard" className="hover:text-up">leaderboard</Link>
            <Link href="/#console" className="hover:text-up">ops console</Link>
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {name && snap?.user && (
              <div className="tabular flex items-center gap-2 rounded-sm border border-edge bg-panel px-3 py-1.5 font-mono text-xs">
                <span className="text-fog">{name}</span>
                <span className="text-up">{fmtCredits(snap.user.credits)} cr</span>
              </div>
            )}
            <button
              onClick={() => setDepositOpen(true)}
              className="rounded-sm border border-up/60 bg-up/10 px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-up transition-colors hover:bg-up/20"
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
