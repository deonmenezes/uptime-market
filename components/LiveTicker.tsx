"use client";

import { useMarketStore } from "./StoreContext";
import type { FeedEvent } from "@/lib/market/types";

function tone(e: FeedEvent): string {
  switch (e.kind) {
    case "settle":
      return "text-gold";
    case "incident":
      return "text-down";
    case "deposit":
      return "text-info";
    case "trade":
      return e.text.includes("YES") ? "text-up" : "text-down";
    default:
      return "text-fog";
  }
}

function glyph(e: FeedEvent): string {
  switch (e.kind) {
    case "settle":
      return "⚖";
    case "incident":
      return "▲";
    case "deposit":
      return "◎";
    case "trade":
      return "→";
    default:
      return "·";
  }
}

// The pump.fun marquee, repurposed: every trade, incident and settlement scrolls by.
export default function LiveTicker() {
  const { snap } = useMarketStore();
  const items = (snap?.events ?? []).slice(0, 16);
  if (!items.length) return null;

  return (
    <div className="overflow-hidden border-b border-edge bg-panel">
      <div className="flex w-max animate-marquee items-center gap-10 py-1.5 pr-10 hover:[animation-play-state:paused]">
        {[0, 1].map((dup) => (
          <div key={dup} className="flex items-center gap-10" aria-hidden={dup === 1}>
            {items.map((e) => (
              <span key={`${dup}-${e.id}`} className="flex shrink-0 items-center gap-1.5 font-mono text-[11px]">
                <span className={tone(e)}>{glyph(e)}</span>
                <span className={e.kind === "trade" ? "text-fog" : tone(e)}>{e.text}</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
