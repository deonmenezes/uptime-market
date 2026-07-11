"use client";

import type { Category } from "@/lib/types";

export type SortKey = "featured" | "new" | "volume" | "graduating";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "featured", label: "🔥 featured" },
  { key: "new", label: "🌱 new" },
  { key: "volume", label: "📊 volume" },
  { key: "graduating", label: "🎓 graduating" },
];

const CATS: Array<Category | "all"> = ["all", "crypto", "politics", "sports", "tech", "pop", "memes"];

export default function FilterBar({
  sort,
  setSort,
  cat,
  setCat,
  animations,
  setAnimations,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
  cat: Category | "all";
  setCat: (c: Category | "all") => void;
  animations: boolean;
  setAnimations: (b: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex gap-1">
        {SORTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSort(s.key)}
            className={[
              "rounded-sm border px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider",
              sort === s.key
                ? "border-lime bg-lime/10 text-lime"
                : "border-edge bg-panel text-fog hover:border-edge2 hover:text-bone",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mx-1 hidden h-4 w-px bg-edge2 sm:block" />

      <div className="flex flex-wrap gap-1">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={[
              "rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider",
              cat === c ? "border-lime text-lime" : "border-edge text-fog hover:text-bone",
            ].join(" ")}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="ml-auto flex cursor-pointer items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-fog">
        <input
          type="checkbox"
          checked={animations}
          onChange={(e) => setAnimations(e.target.checked)}
          className="accent-lime"
        />
        animations
      </label>
    </div>
  );
}
