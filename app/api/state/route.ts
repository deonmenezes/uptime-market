import { NextRequest, NextResponse } from "next/server";
import { CONFIG, getState, SERVICES } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";
import { priceYes } from "@/lib/market/lmsr";
import type { LeaderboardRow, MarketView, StateSnapshot, TelemetryReading } from "@/lib/market/types";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  ensureOracle();
  const s = getState();
  const userName = req.nextUrl.searchParams.get("user");

  const markets: MarketView[] = [...s.markets.values()].map((m) => {
    const hist = s.priceHistory.get(m.id) ?? [];
    return {
      ...m,
      price: m.status === "settled" ? (m.outcome === "YES" ? 1 : 0) : priceYes(m.qYes, m.qNo, m.b),
      spark: hist.slice(-40).map((p) => p.p),
    };
  });

  const telemetry: TelemetryReading[] = SERVICES.map(
    (svc) => s.telemetry.get(svc)?.at(-1)
  ).filter((r): r is TelemetryReading => Boolean(r));

  const leaderboard: LeaderboardRow[] = [...s.users.values()]
    .map((u) => {
      let portfolio = 0;
      for (const [mid, pos] of Object.entries(u.positions)) {
        const m = s.markets.get(mid);
        if (!m || m.status !== "open") continue;
        const p = priceYes(m.qYes, m.qNo, m.b);
        portfolio += pos.yes * p + pos.no * (1 - p);
      }
      return {
        name: u.name,
        credits: Math.round(u.credits * 10) / 10,
        portfolio: Math.round(portfolio * 10) / 10,
        netWorth: Math.round((u.credits + portfolio) * 10) / 10,
        isBot: u.isBot,
      };
    })
    .sort((a, b) => b.netWorth - a.netWorth)
    .slice(0, 12);

  const u = userName ? s.users.get(userName) : null;

  const snapshot: StateSnapshot = {
    now: Date.now(),
    markets,
    telemetry,
    sev1Count: s.sev1Count,
    trades: s.trades.slice(0, 30),
    events: s.events.slice(0, 30),
    leaderboard,
    user: u ? { name: u.name, credits: Math.round(u.credits * 10) / 10, positions: u.positions } : null,
    treasury: CONFIG.treasury,
    creditsPerSol: CONFIG.creditsPerSol,
  };

  return NextResponse.json(snapshot);
}
