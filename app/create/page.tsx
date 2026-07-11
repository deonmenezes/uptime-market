"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { engine } from "@/lib/engine";
import type { Category } from "@/lib/types";

const CATS: Category[] = ["crypto", "politics", "sports", "tech", "pop", "memes"];
const EMOJIS = ["🎲", "🚀", "🔥", "🐸", "💀", "👑", "🌙", "⚡", "🧠", "🦍", "💎", "🎯"];

export default function CreatePage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [ticker, setTicker] = useState("");
  const [emoji, setEmoji] = useState("🎲");
  const [cat, setCat] = useState<Category>("crypto");

  const valid = question.trim().length >= 8 && ticker.trim().length >= 2;

  const launch = () => {
    if (!valid) return;
    const m = engine.createMarket(question, ticker, emoji, cat);
    router.push(`/m/${m.id}`);
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-10 pb-24">
      <h1 className="font-display text-4xl text-lime">launch a market</h1>
      <p className="mt-1 font-mono text-xs text-fog">
        one question. one deadline. the crowd does the rest.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-fog">question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="WILL [THING] HAPPEN BY [DATE]?"
            rows={2}
            className="mt-1 w-full rounded-sm border border-edge bg-panel px-3 py-2 text-sm text-bone placeholder:text-fog/50 focus:border-lime focus:outline-none"
          />
          <p className="mt-1 font-mono text-[10px] text-fog/60">
            make it binary and verifiable. ambiguous questions get disputed.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-fog">ticker</label>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="MOON26"
              className="mt-1 w-full rounded-sm border border-edge bg-panel px-3 py-2 font-mono text-sm text-bone placeholder:text-fog/50 focus:border-lime focus:outline-none"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-fog">category</label>
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value as Category)}
              className="mt-1 w-full rounded-sm border border-edge bg-panel px-3 py-2 font-mono text-sm text-bone focus:border-lime focus:outline-none"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-fog">icon</label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => setEmoji(e)}
                className={[
                  "flex h-10 w-10 items-center justify-center rounded-sm border text-xl",
                  emoji === e ? "border-lime bg-lime/10" : "border-edge bg-panel hover:border-edge2",
                ].join(" ")}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-sm border border-edge bg-panel p-3 font-mono text-[11px] text-fog">
          <div className="flex justify-between"><span>launch cost</span><span className="text-bone">0.02 ◎</span></div>
          <div className="mt-1 flex justify-between"><span>initial odds</span><span className="text-bone">50¢ / 50¢</span></div>
          <div className="mt-1 flex justify-between"><span>creator fee</span><span className="text-bone">1% of volume</span></div>
        </div>

        <button
          onClick={launch}
          disabled={!valid}
          className="btn-hard w-full rounded-sm border border-lime bg-lime py-3 font-mono text-sm font-bold uppercase tracking-widest text-ink disabled:cursor-not-allowed disabled:opacity-40"
        >
          launch market (demo)
        </button>
      </div>
    </main>
  );
}
