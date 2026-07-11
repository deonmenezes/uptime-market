"use client";

import { useMemo, useState } from "react";
import { useEngine, useNow } from "@/lib/useEngine";
import type { Category } from "@/lib/types";
import LiveTicker from "./LiveTicker";
import KingOfTheHill from "./KingOfTheHill";
import FilterBar, { type SortKey } from "./FilterBar";
import MarketCard from "./MarketCard";

export default function Board() {
  const engine = useEngine();
  const now = useNow();
  const [sort, setSort] = useState<SortKey>("featured");
  const [cat, setCat] = useState<Category | "all">("all");
  const [animations, setAnimations] = useState(true);

  const markets = useMemo(() => {
    let list = engine.order.map((id) => engine.markets.get(id)!);
    if (cat !== "all") list = list.filter((m) => m.category === cat);
    switch (sort) {
      case "new":
        list = [...list].sort((a, b) => b.createdTs - a.createdTs);
        break;
      case "volume":
        list = [...list].sort((a, b) => b.volumeSol - a.volumeSol);
        break;
      case "graduating":
        list = [...list].sort((a, b) => b.graduationPct - a.graduationPct);
        break;
      default:
        list = [...list].sort((a, b) => b.vol5mSol - a.vol5mSol);
    }
    return list;
    // engine.version (via useEngine re-render) is what refreshes this memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.version, sort, cat]);

  return (
    <main>
      <LiveTicker />

      <div className="mx-auto max-w-7xl px-4 pb-24">
        <div className="py-6">
          <KingOfTheHill market={engine.king()} />
        </div>

        <div className="mb-4 text-center font-display text-2xl tracking-wide text-fog">
          <span className="text-lime animate-blink">█</span> bet on anything. every outcome is a coin.{" "}
          <span className="text-lime animate-blink">█</span>
        </div>

        <FilterBar
          sort={sort}
          setSort={setSort}
          cat={cat}
          setCat={setCat}
          animations={animations}
          setAnimations={setAnimations}
        />

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {markets.map((m) => (
            <div key={m.id} className={m.createdTs > (now ?? Infinity) - 4000 ? "animate-pop-in" : ""}>
              <MarketCard market={m} now={now} animations={animations} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
