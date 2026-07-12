"use client";

import { useState } from "react";
import { useMarketStore } from "./StoreContext";

// First-visit overlay: pick a handle, get $100,000 of play capital.
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
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bone/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm animate-pop-in rounded-xl border border-edge bg-panel p-6 shadow-[0_24px_64px_rgba(22,33,27,0.18)]">
        <div className="flex items-center gap-2">
          <svg width="22" height="15" viewBox="0 0 26 18" aria-hidden>
            <circle cx="8" cy="11" r="6" fill="#0c8a4d" opacity="0.9" />
            <circle cx="14" cy="8" r="7" fill="#17594a" opacity="0.85" />
            <circle cx="19.5" cy="12" r="5" fill="#a87c1f" opacity="0.8" />
          </svg>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">cumulus</span>
        </div>
        <h2 className="mt-3 font-display text-2xl font-bold leading-tight text-bone">
          Prediction markets for
          <br />
          <span className="text-updim">cloud infrastructure.</span>
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fog">
          Pick a handle and get <span className="tabular font-semibold text-bone">$100,000</span> of play
          capital. Hedge an outage, or sell protection and earn the premium.
        </p>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="your handle"
          className="mt-4 w-full rounded-md border border-edge bg-ink px-3 py-2.5 font-mono text-sm text-bone placeholder:text-fog/50 focus:border-up focus:outline-none"
        />
        <button
          onClick={join}
          disabled={draft.trim().length < 2 || busy}
          className="mt-3 w-full rounded-md bg-up py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-white transition-colors hover:bg-updim disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "joining…" : "enter cumulus"}
        </button>
        <p className="mt-3 text-center font-mono text-[10px] text-fog/60">
          play money · settled by machines, not committees
        </p>
      </div>
    </div>
  );
}
