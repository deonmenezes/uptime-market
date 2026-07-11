import type {
  FeedEvent,
  Market,
  PricePoint,
  Side,
  TelemetryReading,
  TradeRecord,
  UserAccount,
} from "@/lib/market/types";
import { priceYes, seedForPrice, sharesForSpend, proceedsForSale } from "@/lib/market/lmsr";

export const CONFIG = {
  b: 100,
  startingCredits: 1000,
  creditsPerSol: 10_000, // 0.01 SOL deposit = 100 credits
  treasury: process.env.TREASURY_ADDRESS ?? "7Jt3LzUUf1MfAbmiaUteNpEjqP5f52qDYbB7cBYDmKD5",
  tickMs: 2000,
  // demo-compressed settlement thresholds
  sloDowntimeBudgetTicks: 8, // checkout SLO breaches after this much accumulated downtime; kept below the min incident duration so one Sev-1 always breaches
  sev1Limit: 2, // market settles NO on the 3rd Sev-1
  latencyBreachStreak: 5, // consecutive p99>300ms readings to settle NO
} as const;

export interface AppState {
  users: Map<string, UserAccount>;
  markets: Map<string, Market>;
  priceHistory: Map<string, PricePoint[]>;
  telemetry: Map<string, TelemetryReading[]>;
  downtimeTicks: Map<string, number>;
  latencyStreak: number;
  sev1Count: number;
  activeIncidents: Map<string, number>; // service -> remaining ticks
  trades: TradeRecord[];
  events: FeedEvent[];
  seq: number;
  loopStarted: boolean;
}

export const SERVICES = ["checkout-service", "payments-db", "api-gateway"] as const;

const SEEDS: Array<{
  id: string;
  ticker: string;
  question: string;
  service: string;
  settlement: Market["settlement"];
  rule: string;
  p0: number;
  closesLabel: string;
}> = [
  {
    id: "slo-checkout",
    ticker: "SLO999",
    question: "checkout-service meets its 99.9% SLO this week",
    service: "checkout-service",
    settlement: "auto",
    rule: `Settles NO the moment accumulated downtime exceeds the weekly error budget (${CONFIG.sloDowntimeBudgetTicks} unhealthy readings in demo time). Settles YES if the window closes with budget remaining. Source: uptime telemetry oracle.`,
    p0: 0.72,
    closesLabel: "FRI 17:00",
  },
  {
    id: "sev1-cap",
    ticker: "SEV1X2",
    question: "2 or fewer Sev-1 incidents across all services this week",
    service: "incidents",
    settlement: "auto",
    rule: "Settles NO immediately on the third Sev-1 incident. Settles YES if the week closes with 2 or fewer. Source: incident counter fed by the telemetry oracle.",
    p0: 0.64,
    closesLabel: "FRI 17:00",
  },
  {
    id: "db-migration",
    ticker: "SHIPFRI",
    question: "payments-db migration completes by Friday",
    service: "payments-db",
    settlement: "manual",
    rule: "Settled manually by the admin when the migration lands (or Friday 17:00 passes). The one market here a machine can't read yet.",
    p0: 0.41,
    closesLabel: "FRI 17:00",
  },
  {
    id: "gw-latency",
    ticker: "P99LT300",
    question: "api-gateway p99 latency stays under 300ms today",
    service: "api-gateway",
    settlement: "auto",
    rule: `Settles NO after ${CONFIG.latencyBreachStreak} consecutive p99 readings above 300ms. Settles YES at end of day otherwise. Source: latency telemetry oracle.`,
    p0: 0.85,
    closesLabel: "TODAY 23:59",
  },
];

const BOTS = ["sre-alice", "oncall-bob", "platform-carol", "intern-dave"];

function makeUser(name: string, isBot = false): UserAccount {
  return {
    name,
    credits: CONFIG.startingCredits,
    positions: {},
    usedSignatures: [],
    wallet: null,
    createdTs: Date.now(),
    isBot,
  };
}

function seedState(): AppState {
  const s: AppState = {
    users: new Map(),
    markets: new Map(),
    priceHistory: new Map(),
    telemetry: new Map(),
    downtimeTicks: new Map(),
    latencyStreak: 0,
    sev1Count: 0,
    activeIncidents: new Map(),
    trades: [],
    events: [],
    seq: 0,
    loopStarted: false,
  };

  const now = Date.now();
  for (const seed of SEEDS) {
    const { qYes, qNo } = seedForPrice(seed.p0, CONFIG.b);
    const m: Market = {
      id: seed.id,
      ticker: seed.ticker,
      question: seed.question,
      service: seed.service,
      settlement: seed.settlement,
      rule: seed.rule,
      status: "open",
      outcome: null,
      settledTs: null,
      settledNote: null,
      qYes,
      qNo,
      b: CONFIG.b,
      createdTs: now,
      closesLabel: seed.closesLabel,
      volumeCredits: 0,
    };
    s.markets.set(m.id, m);
    s.priceHistory.set(m.id, [{ ts: now, p: seed.p0 }]);
  }

  for (const svc of SERVICES) {
    s.telemetry.set(svc, []);
    s.downtimeTicks.set(svc, 0);
  }

  for (const b of BOTS) s.users.set(b, makeUser(b, true));

  // a little pre-existing bot flow so the tape, charts and leaderboard aren't empty
  for (let i = 0; i < 10; i++) {
    const market = [...s.markets.values()][i % s.markets.size];
    const bot = BOTS[i % BOTS.length];
    const side: Side = i % 3 === 0 ? "NO" : "YES";
    executeTrade(s, bot, market.id, side, "buy", 20 + (i % 4) * 15, now - (10 - i) * 45_000);
  }

  pushEvent(s, "system", "Uptime Market open. Four markets live. Telemetry oracle armed.");
  return s;
}

export function pushEvent(s: AppState, kind: FeedEvent["kind"], text: string, marketId?: string) {
  s.events.unshift({ id: `e${s.seq++}`, ts: Date.now(), kind, text, marketId });
  if (s.events.length > 80) s.events.pop();
}

export function getOrCreateUser(s: AppState, name: string): UserAccount {
  const key = name.trim().slice(0, 24);
  let u = s.users.get(key);
  if (!u) {
    u = makeUser(key);
    s.users.set(key, u);
    pushEvent(s, "system", `${key} joined with ${CONFIG.startingCredits} credits`);
  }
  return u;
}

export function executeTrade(
  s: AppState,
  userName: string,
  marketId: string,
  side: Side,
  action: "buy" | "sell",
  amount: number, // credits for buy, shares for sell
  ts = Date.now()
): { ok: true; trade: TradeRecord } | { ok: false; error: string } {
  const m = s.markets.get(marketId);
  const u = s.users.get(userName);
  if (!m) return { ok: false, error: "unknown market" };
  if (!u) return { ok: false, error: "unknown user" };
  if (m.status !== "open") return { ok: false, error: "market is settled" };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: "invalid amount" };

  const pos = (u.positions[marketId] ??= { yes: 0, no: 0 });
  let credits = 0;
  let shares = 0;

  if (action === "buy") {
    credits = Math.min(amount, u.credits);
    if (credits < 0.01) return { ok: false, error: "insufficient credits" };
    shares = sharesForSpend(m.qYes, m.qNo, m.b, side, credits);
    if (shares <= 0) return { ok: false, error: "trade too small" };
    u.credits -= credits;
    if (side === "YES") {
      m.qYes += shares;
      pos.yes += shares;
    } else {
      m.qNo += shares;
      pos.no += shares;
    }
  } else {
    const held = side === "YES" ? pos.yes : pos.no;
    shares = Math.min(amount, held);
    if (shares <= 0) return { ok: false, error: "no position to sell" };
    credits = proceedsForSale(m.qYes, m.qNo, m.b, side, shares);
    u.credits += credits;
    if (side === "YES") {
      m.qYes -= shares;
      pos.yes -= shares;
    } else {
      m.qNo -= shares;
      pos.no -= shares;
    }
  }

  m.volumeCredits += credits;
  const p = priceYes(m.qYes, m.qNo, m.b);
  const hist = s.priceHistory.get(marketId)!;
  hist.push({ ts, p });
  if (hist.length > 2500) hist.shift();

  const trade: TradeRecord = {
    id: `t${s.seq++}`,
    ts,
    user: userName,
    marketId,
    side,
    action,
    credits: Math.round(credits * 100) / 100,
    shares: Math.round(shares * 100) / 100,
    priceAfter: p,
  };
  s.trades.unshift(trade);
  if (s.trades.length > 200) s.trades.pop();
  pushEvent(
    s,
    "trade",
    `${userName} ${action === "buy" ? "bought" : "sold"} ${trade.shares} ${side} on ${m.ticker} → ${(p * 100).toFixed(0)}%`,
    marketId
  );
  return { ok: true, trade };
}

export function settleMarket(s: AppState, marketId: string, outcome: Side, note: string) {
  const m = s.markets.get(marketId);
  if (!m || m.status !== "open") return;
  m.status = "settled";
  m.outcome = outcome;
  m.settledTs = Date.now();
  m.settledNote = note;

  let paidOut = 0;
  for (const u of s.users.values()) {
    const pos = u.positions[marketId];
    if (!pos) continue;
    const winning = outcome === "YES" ? pos.yes : pos.no;
    if (winning > 0) {
      u.credits += winning; // winning shares redeem at 1 credit
      paidOut += winning;
    }
    pos.yes = 0;
    pos.no = 0;
  }

  const hist = s.priceHistory.get(marketId)!;
  hist.push({ ts: Date.now(), p: outcome === "YES" ? 1 : 0 });
  pushEvent(
    s,
    "settle",
    `SETTLED ${outcome}: ${m.question} — ${note}. ${Math.round(paidOut)} credits paid out.`,
    marketId
  );
}

// Survives Next.js dev-server HMR: keep one state object on globalThis.
const g = globalThis as unknown as { __uptimeMarketState?: AppState };

export function getState(): AppState {
  if (!g.__uptimeMarketState) g.__uptimeMarketState = seedState();
  return g.__uptimeMarketState;
}
