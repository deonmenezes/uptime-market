"use client";

import { useState } from "react";
import { useEngine, useNow } from "@/lib/useEngine";
import { timeAgo } from "@/lib/format";

export default function Thread({ marketId }: { marketId: string }) {
  const engine = useEngine();
  const now = useNow();
  const [draft, setDraft] = useState("");
  const comments = engine.comments.get(marketId) ?? [];

  const post = () => {
    const text = draft.trim();
    if (!text) return;
    engine.comments.get(marketId)?.unshift({
      id: `you-${Date.now()}`,
      wallet: "you",
      text,
      ts: Date.now(),
      likes: 0,
    });
    setDraft("");
  };

  return (
    <div className="rounded-sm border border-edge bg-panel">
      <div className="border-b border-edge px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-fog">
        thread [{comments.length}]
      </div>

      <div className="flex gap-2 border-b border-edge px-3 py-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && post()}
          placeholder="say something bullish…"
          className="w-full rounded-sm border border-edge bg-ink px-2 py-1.5 font-mono text-xs text-bone placeholder:text-fog/50 focus:border-lime focus:outline-none"
        />
        <button
          onClick={post}
          className="shrink-0 rounded-sm border border-lime bg-lime/10 px-3 font-mono text-xs uppercase text-lime hover:bg-lime/20"
        >
          post
        </button>
      </div>

      <div className="max-h-72 divide-y divide-edge/50 overflow-y-auto">
        {comments.map((c) => (
          <div key={c.id} className="px-3 py-2">
            <div className="flex items-center gap-2 font-mono text-[10px] text-fog">
              <span className={c.wallet === "you" ? "text-lime" : "text-amber"}>{c.wallet}</span>
              <span>{now !== null ? `${timeAgo(c.ts, now)} ago` : "…"}</span>
              <button className="ml-auto hover:text-lime">▲ {c.likes}</button>
            </div>
            <p className="mt-0.5 text-xs text-bone">{c.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
