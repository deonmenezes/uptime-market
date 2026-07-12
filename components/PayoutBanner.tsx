"use client";

// The demo money-shot: the instant a contract you hold settles in your favor,
// this banner drops in with the payout - no claim filed, no adjuster, no wait.
// Watches snap.user.payouts (recorded server-side at settlement) and fires for
// any payout newer than the last one this browser has seen.

import { useEffect, useRef, useState } from "react";
import { useMarketStore } from "./StoreContext";
import { fmtUsdFull } from "@/lib/format";
import type { PayoutRecord } from "@/lib/market/types";

const SEEN_KEY = "cumulus_payout_seen_ts";
const AUTO_DISMISS_MS = 15_000;

export default function PayoutBanner() {
  const { snap, mode } = useMarketStore();
  const [payout, setPayout] = useState<PayoutRecord | null>(null);
  const seenTs = useRef<number>(0);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    seenTs.current = Number(localStorage.getItem(SEEN_KEY) ?? 0);
  }, []);

  useEffect(() => {
    const latest = snap?.user?.payouts?.[0];
    if (!latest || latest.ts <= seenTs.current) return;
    seenTs.current = latest.ts;
    localStorage.setItem(SEEN_KEY, String(latest.ts));
    setPayout(latest);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setPayout(null), AUTO_DISMISS_MS);
  }, [snap]);

  useEffect(() => () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
  }, []);

  if (!payout) return null;

  return (
    <div className="fixed inset-x-0 top-14 z-[60] flex justify-center px-4" role="status" aria-live="polite">
      <div className="pointer-events-auto w-full max-w-2xl animate-flash-up rounded-md border border-up bg-panel shadow-[0_12px_48px_rgba(12,138,77,0.25)]">
        <div className="flex items-start gap-4 p-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-up font-display text-lg font-bold text-white">
            $
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-up">
              {mode === "hedger" ? "protection paid, no claim filed" : "position settled, paid in full"}
            </div>
            <div className="mt-1 font-display text-2xl font-bold tracking-tight text-bone">
              {fmtUsdFull(payout.amountUsd)} paid to your account
            </div>
            <p className="mt-1 text-xs leading-relaxed text-fog">
              {payout.ticker} settled {payout.outcome}: {payout.question}. The oracle confirmed the
              event and paid every holder automatically. No adjuster, no paperwork, no wait.
            </p>
            <p className="mt-1 truncate font-mono text-[10px] text-fog/70">{payout.settledNote}</p>
          </div>
          <button
            onClick={() => setPayout(null)}
            className="shrink-0 rounded-sm border border-edge px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-fog hover:border-edge2 hover:text-bone"
            aria-label="dismiss payout notice"
          >
            close
          </button>
        </div>
      </div>
    </div>
  );
}
