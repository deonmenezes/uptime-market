"use client";

import { useEffect, useRef } from "react";
import { createChart, AreaSeries, ColorType, type UTCTimestamp } from "lightweight-charts";
import type { PricePoint } from "@/lib/market/types";

// Live probability chart for one contract.
export default function ProbChart({ marketId }: { marketId: string; showLatency?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#5f6f64",
        fontFamily: "var(--font-plex-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(22,33,27,0.06)" },
        horzLines: { color: "rgba(22,33,27,0.06)" },
      },
      rightPriceScale: { borderColor: "#e5eae2" },
      timeScale: { borderColor: "#e5eae2", timeVisible: true, secondsVisible: true },
      crosshair: {
        vertLine: { color: "#0c8a4d", width: 1, style: 3, labelBackgroundColor: "#0c8a4d" },
        horzLine: { color: "#0c8a4d", width: 1, style: 3, labelBackgroundColor: "#0c8a4d" },
      },
      autoSize: true,
    });

    const prob = chart.addSeries(AreaSeries, {
      lineColor: "#0c8a4d",
      topColor: "rgba(12, 138, 77, 0.18)",
      bottomColor: "rgba(12, 138, 77, 0.01)",
      lineWidth: 2,
      priceFormat: { type: "custom", formatter: (p: number) => `${(p * 100).toFixed(1)}%`, minMove: 0.001 },
    });

    let dead = false;
    let fitted = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/market/${marketId}/history`, { cache: "no-store" });
        if (!res.ok || dead) return;
        const data: { prices: PricePoint[] } = await res.json();

        // lightweight-charts wants strictly ascending unique timestamps
        const seen = new Set<number>();
        const points = data.prices
          .slice()
          .sort((a, b) => a.ts - b.ts)
          .map((p) => ({ time: Math.floor(p.ts / 1000) as UTCTimestamp, value: p.p }))
          .filter((p) => {
            if (seen.has(p.time)) return false;
            seen.add(p.time);
            return true;
          });
        // a single point draws no line; anchor it a minute back so the chart reads
        if (points.length === 1) {
          points.unshift({ time: (points[0].time - 60) as UTCTimestamp, value: points[0].value });
        }
        prob.setData(points);

        if (!fitted && points.length) {
          chart.timeScale().fitContent();
          fitted = true;
        }
      } catch {
        // next poll retries
      }
    };

    load();
    const t = setInterval(load, 2000);
    return () => {
      dead = true;
      clearInterval(t);
      chart.remove();
    };
  }, [marketId]);

  return <div ref={ref} className="h-[340px] w-full" />;
}
