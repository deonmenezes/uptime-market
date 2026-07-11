"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  LineSeries,
  type UTCTimestamp,
} from "lightweight-charts";
import type { PricePoint, TelemetryReading } from "@/lib/market/types";

// Live probability chart, with the service's p99 overlaid so the audience can
// SEE telemetry move the market.
export default function ProbChart({ marketId, showLatency }: { marketId: string; showLatency: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8fa39a",
        fontFamily: "var(--font-plex-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(46,58,52,0.35)" },
        horzLines: { color: "rgba(46,58,52,0.35)" },
      },
      rightPriceScale: { borderColor: "#222b27" },
      timeScale: { borderColor: "#222b27", timeVisible: true, secondsVisible: true },
      crosshair: {
        vertLine: { color: "#4ade80", width: 1, style: 3, labelBackgroundColor: "#4ade80" },
        horzLine: { color: "#4ade80", width: 1, style: 3, labelBackgroundColor: "#4ade80" },
      },
      autoSize: true,
    });

    const prob = chart.addSeries(AreaSeries, {
      lineColor: "#4ade80",
      topColor: "rgba(74, 222, 128, 0.25)",
      bottomColor: "rgba(74, 222, 128, 0.02)",
      lineWidth: 2,
      priceFormat: { type: "custom", formatter: (p: number) => `${(p * 100).toFixed(0)}%`, minMove: 0.01 },
    });

    const latency = showLatency
      ? chart.addSeries(LineSeries, {
          color: "rgba(92, 184, 228, 0.7)",
          lineWidth: 1,
          priceScaleId: "latency",
          priceFormat: { type: "custom", formatter: (v: number) => `${Math.round(v)}ms`, minMove: 1 },
        })
      : null;
    if (latency) {
      chart.priceScale("latency").applyOptions({ visible: false });
    }

    let dead = false;
    let fitted = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/market/${marketId}/history`, { cache: "no-store" });
        if (!res.ok || dead) return;
        const data: { prices: PricePoint[]; telemetry: TelemetryReading[] } = await res.json();

        // lightweight-charts wants strictly ascending unique timestamps
        const seen = new Set<number>();
        const points = data.prices
          .map((p) => ({ time: Math.floor(p.ts / 1000) as UTCTimestamp, value: p.p }))
          .filter((p) => {
            if (seen.has(p.time)) return false;
            seen.add(p.time);
            return true;
          });
        prob.setData(points);

        if (latency) {
          const seenT = new Set<number>();
          latency.setData(
            data.telemetry
              .map((t) => ({ time: Math.floor(t.ts / 1000) as UTCTimestamp, value: t.p99Ms }))
              .filter((p) => {
                if (seenT.has(p.time)) return false;
                seenT.add(p.time);
                return true;
              })
          );
        }
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
  }, [marketId, showLatency]);

  return <div ref={ref} className="h-[340px] w-full" />;
}
