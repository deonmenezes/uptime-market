"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import { engine } from "@/lib/engine";

export default function Chart({ marketId }: { marketId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const chart = createChart(ref.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9aa88f",
        fontFamily: "var(--font-plex-mono), monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: "rgba(47,58,39,0.4)" },
        horzLines: { color: "rgba(47,58,39,0.4)" },
      },
      rightPriceScale: { borderColor: "#232b1e" },
      timeScale: { borderColor: "#232b1e", timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: "#a3ff12", width: 1, style: 3, labelBackgroundColor: "#a3ff12" },
        horzLine: { color: "#a3ff12", width: 1, style: 3, labelBackgroundColor: "#a3ff12" },
      },
      autoSize: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#a3ff12",
      downColor: "#ff4655",
      borderUpColor: "#a3ff12",
      borderDownColor: "#ff4655",
      wickUpColor: "#6faa1a",
      wickDownColor: "#c2323f",
      priceFormat: { type: "custom", formatter: (p: number) => `${p.toFixed(0)}¢`, minMove: 1 },
    });

    const load = () => {
      const candles = engine.candles.get(marketId);
      if (!candles) return;
      series.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );
    };

    load();
    chart.timeScale().fitContent();

    const unsub = engine.onEvent((e) => {
      if (e.type === "trade" && e.trade.marketId === marketId) {
        const candles = engine.candles.get(marketId);
        if (!candles?.length) return;
        const c = candles[candles.length - 1];
        series.update({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close });
      }
    });

    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      unsub();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [marketId]);

  return <div ref={ref} className="h-[360px] w-full" />;
}
