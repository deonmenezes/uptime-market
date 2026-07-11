"use client";

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

// First-visit overlay: pick a handle, get 1,000 credits. No auth by design (PRD §4.2).
export default function NameGate() {
  const { name, setName } = useMarketStore();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (name) return null;

  const join = async () => {
    if (draft.trim().length < 2 || busy) return;
    setBusy(true);
    try {
      await setName(draft);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-pop-in rounded-md border border-edge2 bg-panel p-6">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-up" />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">uptime.market</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-bone">
          Your status reports are optimistic.
          <br />
          <span className="text-up">Your engineers aren&apos;t.</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          Pick a handle and get <span className="tabular text-bone">1,000 credits</span>. Trade what you
          actually believe about the systems you run.
        </p>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="your handle"
          className="mt-4 w-full rounded-sm border border-edge bg-ink px-3 py-2.5 font-mono text-sm text-bone placeholder:text-fog/50 focus:border-up focus:outline-none"
        />
        <button
          onClick={join}
          disabled={draft.trim().length < 2 || busy}
          className="mt-3 w-full rounded-sm bg-up py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "joining…" : "enter the market"}
        </button>
        <p className="mt-3 text-center font-mono text-[10px] text-fog/60">
          anonymous by design — that&apos;s the point
        </p>
      </div>
    </div>
  );
}
