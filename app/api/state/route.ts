import { NextRequest, NextResponse } from "next/server";
import { CONFIG, getState } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";
import { priceYes } from "@/lib/market/lmsr";
import type { LeaderboardRow, MarketView, MonitorStatus, StateSnapshot } from "@/lib/market/types";

export const dynamic = "force-dynamic";

const MONITOR_LABELS: Record<string, string> = {
  "aws-us-east-1": "AWS us-east-1",
  "stripe-api": "Stripe API",
  "cloudflare-net": "Cloudflare",
  "openai-api": "OpenAI API",
  "epic-fortnite": "Fortnite / Epic",
  "netflix-cdn": "Netflix",
  "riot-valorant": "Valorant login",
  "checkout-service": "checkout-service (sim)",
};

export async function GET(req: NextRequest) {
  await ensureOracle();
  const s = getState();
  const userName = req.nextUrl.searchParams.get("user");

  // per-market collateral/exposure aggregates across all accounts
  const totals = new Map<string, { yes: number; no: number }>();
  for (const u of s.users.values()) {
    for (const [mid, pos] of Object.entries(u.positions)) {
      const t = totals.get(mid) ?? { yes: 0, no: 0 };
      t.yes += pos.yes;
      t.no += pos.no;
      totals.set(mid, t);
    }
  }

  const markets: MarketView[] = [...s.markets.values()].map((m) => {
    const hist = s.priceHistory.get(m.id) ?? [];
    const t = totals.get(m.id) ?? { yes: 0, no: 0 };
    return {
      ...m,
      price: m.status === "settled" ? (m.outcome === "YES" ? 1 : 0) : priceYes(m.qYes, m.qNo, m.b),
      spark: hist.slice(-40).map((p) => p.p),
      exposureUsd: Math.round(t.yes),
      escrowUsd: Math.round(t.no),
    };
  });

  const monitors: MonitorStatus[] = Object.entries(MONITOR_LABELS)
    .map(([service, label]) => {
      const last = s.lastByService.get(service);
      if (!last) return null;
      return {
        service,
        label,
        ok: last.ok,
        latencyMs: last.latencyMs,
        indicator: last.indicator,
        checkedTs: last.ts,
      };
    })
    .filter((m): m is MonitorStatus => m !== null);

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
        balanceUsd: Math.round(u.balanceUsd),
        portfolioUsd: Math.round(portfolio),
        netWorthUsd: Math.round(u.balanceUsd + portfolio),
        isBot: u.isBot,
      };
    })
    .sort((a, b) => b.netWorthUsd - a.netWorthUsd)
    .slice(0, 12);

  const u = userName ? s.users.get(userName) : null;

  const snapshot: StateSnapshot = {
    now: Date.now(),
    markets,
    monitors,
    trades: s.trades.slice(0, 30),
    events: s.events.slice(0, 30),
    leaderboard,
    user: u
      ? {
          name: u.name,
          balanceUsd: Math.round(u.balanceUsd * 100) / 100,
          positions: u.positions,
          payouts: u.payouts ?? [],
        }
      : null,
    oracleChainLength: s.oracleChain.length,
    treasury: CONFIG.treasury,
    usdPerSol: CONFIG.usdPerSol,
  };

  return NextResponse.json(snapshot);
}
