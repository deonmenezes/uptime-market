import { createHash } from "node:crypto";
import type {
  FeedEvent,
  Market,
  OracleReading,
  PayoutRecord,
  PricePoint,
  Side,
  TradeRecord,
  UserAccount,
} from "@/lib/market/types";
import { priceYes, seedForPrice, sharesForSpend, proceedsForSale, costForShares } from "@/lib/market/lmsr";

export const CONFIG = {
  b: 250_000, // deep enough that a $50K hedge moves ~12% -> ~14%, per the demo script
  startingBalanceUsd: 100_000,
  botBalanceUsd: 2_000_000,
  usdPerSol: 10_000, // devnet SOL deposit rate (play money)
  treasury: process.env.TREASURY_ADDRESS ?? "7Jt3LzUUf1MfAbmiaUteNpEjqP5f52qDYbB7cBYDmKD5",
  hedgeFeePct: 0.01,
  simTickMs: 2000,
  realTickMs: 15_000,
  // demo market: simulated error-rate breach threshold, in consecutive readings
  simBreachTicks: 8,
  // openai weekly availability trigger
  openaiSloPct: 99.5,
  openaiMinReadings: 60,
  // stripe cumulative downtime trigger (readings at ~15s cadence; 120 ≈ 30 min)
  stripeDownReadings: 120,
  // a monitor failure only counts toward settlement after this many consecutive
  // failing readings - one egress blip from our own runtime is not an outage
  monitorConfirmFails: 2,
  // demo simulation: failing sim readings (2s cadence) before the contract
  // settles YES. Time-compressed so the full arc fits a stage demo.
  simOutageBreachTicks: 12,
} as const;

// services with a one-button, full-arc outage simulation (globe alert →
// repricing → settlement → payout → voice call), mapped to their market
export const SIM_OUTAGE_MARKETS: Record<string, string> = {
  "netflix-cdn": "netflix-30m",
  "anthropic-api": "anthropic-30m",
};

export interface AppState {
  users: Map<string, UserAccount>;
  markets: Map<string, Market>;
  priceHistory: Map<string, PricePoint[]>;
  oracleChain: OracleReading[];
  lastByService: Map<string, OracleReading>;
  downReadings: Map<string, number>; // per service, cumulative confirmed "not ok" real readings
  upReadings: Map<string, number>;
  consecFails: Map<string, number>; // per service, current consecutive failing readings
  simIncidentTicks: number; // remaining ticks of the injected demo incident
  simConsecutiveDown: number;
  simOutages: Map<string, { ticksLeft: number; down: number }>; // active simulated outages by service
  trades: TradeRecord[];
  events: FeedEvent[];
  seq: number;
}

const SEEDS: Array<{
  id: string;
  ticker: string;
  question: string;
  service: string;
  source: Market["source"];
  sourceName: string;
  sourceUrl: string;
  trigger: string;
  settlement: Market["settlement"];
  p0: number;
  closesLabel: string;
}> = [
  {
    id: "aws-use1",
    ticker: "AWSJUL",
    question: "AWS us-east-1 major outage in July",
    service: "aws-us-east-1",
    source: "aws-feed",
    sourceName: "AWS Health status feed",
    sourceUrl: "https://health.aws.amazon.com/health/status",
    trigger: "Settles YES the moment the public AWS Health feed shows an active event touching us-east-1. Settles NO if July ends clean.",
    settlement: "auto",
    p0: 0.12,
    closesLabel: "JUL 31",
  },
  {
    id: "stripe-30m",
    ticker: "STRP30",
    question: "Stripe API down more than 30 minutes this week",
    service: "stripe-api",
    source: "stripe-monitor",
    sourceName: "Cumulus synthetic monitor",
    sourceUrl: "https://status.stripe.com",
    trigger: "Cumulus pings api.stripe.com every 15s. Settles YES when cumulative failed checks exceed 30 minutes in the week. Settles NO at week close.",
    settlement: "auto",
    p0: 0.07,
    closesLabel: "SUN 23:59",
  },
  {
    id: "cf-incident",
    ticker: "CFTODAY",
    question: "Cloudflare major incident today",
    service: "cloudflare-net",
    source: "cloudflare-feed",
    sourceName: "Cloudflare status feed",
    sourceUrl: "https://www.cloudflarestatus.com",
    trigger: "Settles YES when cloudflarestatus.com reports a major or critical indicator today. Settles NO at midnight UTC.",
    settlement: "auto",
    p0: 0.09,
    closesLabel: "TODAY 23:59",
  },
  {
    id: "openai-slo",
    ticker: "OAI995",
    question: "OpenAI API availability below 99.5% this week",
    service: "openai-api",
    source: "openai-monitor",
    sourceName: "Cumulus synthetic monitor",
    sourceUrl: "https://status.openai.com",
    trigger: "Cumulus pings api.openai.com every 15s. Settles YES when weekly measured availability drops below 99.5% (min 60 readings). Settles NO at week close.",
    settlement: "auto",
    p0: 0.18,
    closesLabel: "SUN 23:59",
  },
  {
    id: "epic-fortnite",
    ticker: "FRTNTE",
    question: "Fortnite / Epic services major outage today",
    service: "epic-fortnite",
    source: "epic-feed",
    sourceName: "Epic Games status feed",
    sourceUrl: "https://status.epicgames.com",
    trigger: "Settles YES when status.epicgames.com reports a major or critical indicator today. Settles NO at midnight UTC.",
    settlement: "auto",
    p0: 0.08,
    closesLabel: "TODAY 23:59",
  },
  {
    id: "netflix-30m",
    ticker: "NFLX30",
    question: "Netflix down more than 30 minutes this week",
    service: "netflix-cdn",
    source: "netflix-monitor",
    sourceName: "Cumulus synthetic monitor",
    sourceUrl: "https://www.netflix.com",
    trigger: "Cumulus pings netflix.com every 15s. Settles YES when cumulative failed checks exceed 30 minutes in the week. Settles NO at week close.",
    settlement: "auto",
    p0: 0.05,
    closesLabel: "SUN 23:59",
  },
  {
    id: "anthropic-30m",
    ticker: "CLD30",
    question: "Claude API down more than 30 minutes this week",
    service: "anthropic-api",
    source: "anthropic-monitor",
    sourceName: "Cumulus synthetic monitor",
    sourceUrl: "https://status.anthropic.com",
    trigger: "Cumulus pings api.anthropic.com every 15s. Settles YES when cumulative failed checks exceed 30 minutes in the week. Settles NO at week close.",
    settlement: "auto",
    p0: 0.06,
    closesLabel: "SUN 23:59",
  },
  {
    id: "riot-valorant",
    ticker: "VALRNT",
    question: "Valorant login down more than 30 minutes this week",
    service: "riot-valorant",
    source: "riot-monitor",
    sourceName: "Cumulus synthetic monitor",
    sourceUrl: "https://status.riotgames.com",
    trigger: "Cumulus pings the Riot auth edge every 15s. Settles YES when cumulative failed checks exceed 30 minutes in the week. Settles NO at week close.",
    settlement: "auto",
    p0: 0.11,
    closesLabel: "SUN 23:59",
  },
  {
    id: "demo-checkout",
    ticker: "CHKOUT",
    question: "DEMO: checkout-service outage in the next hour",
    service: "checkout-service",
    source: "simulator",
    sourceName: "Simulated telemetry (stage safety net)",
    sourceUrl: "/oracle",
    trigger: "Simulated service. The ops console injects an incident; the oracle settles YES after 8 consecutive failing readings. The guaranteed on-stage settlement moment.",
    settlement: "auto",
    p0: 0.1,
    closesLabel: "+60 MIN",
  },
];

const BOTS = ["meridian-re", "atlas-capital", "helvetia-mm", "crestline-lp"];

function makeUser(name: string, isBot = false): UserAccount {
  return {
    name,
    balanceUsd: isBot ? CONFIG.botBalanceUsd : CONFIG.startingBalanceUsd,
    positions: {},
    payouts: [],
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
    oracleChain: [],
    lastByService: new Map(),
    downReadings: new Map(),
    upReadings: new Map(),
    consecFails: new Map(),
    simIncidentTicks: 0,
    simConsecutiveDown: 0,
    simOutages: new Map(),
    trades: [],
    events: [],
    seq: 0,
  };

  const now = Date.now();
  for (const seed of SEEDS) {
    const { qYes, qNo } = seedForPrice(seed.p0, CONFIG.b);
    s.markets.set(seed.id, {
      id: seed.id,
      ticker: seed.ticker,
      question: seed.question,
      service: seed.service,
      source: seed.source,
      sourceName: seed.sourceName,
      sourceUrl: seed.sourceUrl,
      trigger: seed.trigger,
      settlement: seed.settlement,
      status: "open",
      outcome: null,
      settledTs: null,
      settledNote: null,
      qYes,
      qNo,
      b: CONFIG.b,
      createdTs: now,
      closesLabel: seed.closesLabel,
      volumeUsd: 0,
    });
    s.priceHistory.set(seed.id, [{ ts: now, p: seed.p0 }]);
  }

  for (const b of BOTS) s.users.set(b, makeUser(b, true));

  // pre-existing market-maker flow: LPs write protection (buy NO), a couple take YES
  const ids = [...s.markets.keys()];
  for (let i = 0; i < 14; i++) {
    const marketId = ids[i % ids.length];
    const bot = BOTS[i % BOTS.length];
    const side: Side = i % 4 === 0 ? "YES" : "NO";
    executeTrade(s, bot, marketId, side, "buy", 2_000 + (i % 5) * 3_000, now - (14 - i) * 40_000);
  }

  // AWS runs deep protection supply: reinsurers write a lot of NO on us-east-1,
  // so the escrow bar reads like a real book from the first pageview
  for (let i = 0; i < 4; i++) {
    executeTrade(s, BOTS[i % BOTS.length], "aws-use1", "NO", "buy", 9_000 + i * 4_000, now - (8 - i) * 25_000);
  }

  pushEvent(s, "system", "Cumulus open: five downtime contracts live. Oracle armed on real feeds + synthetic monitors.");
  return s;
}

export function pushEvent(s: AppState, kind: FeedEvent["kind"], text: string, marketId?: string) {
  s.events.unshift({ id: `e${s.seq++}`, ts: Date.now(), kind, text, marketId });
  if (s.events.length > 80) s.events.pop();
}

export function appendReading(
  s: AppState,
  r: Omit<OracleReading, "hash" | "prevHash">
): OracleReading {
  const prevHash = s.oracleChain[0]?.hash ?? "genesis";
  const hash = createHash("sha256")
    .update(JSON.stringify({ ...r, prevHash }))
    .digest("hex");
  const reading: OracleReading = { ...r, hash, prevHash };
  s.oracleChain.unshift(reading);
  if (s.oracleChain.length > 600) s.oracleChain.pop();
  s.lastByService.set(r.service, reading);
  return reading;
}

export function getOrCreateUser(s: AppState, name: string): UserAccount {
  const key = name.trim().slice(0, 24);
  let u = s.users.get(key);
  if (!u) {
    u = makeUser(key);
    s.users.set(key, u);
    pushEvent(s, "system", `${key} joined with $${CONFIG.startingBalanceUsd.toLocaleString()} (play)`);
  }
  return u;
}

function ensurePosition(u: UserAccount, marketId: string) {
  return (u.positions[marketId] ??= { yes: 0, no: 0, premiumPaid: 0, premiumEarned: 0 });
}

export function executeTrade(
  s: AppState,
  userName: string,
  marketId: string,
  side: Side,
  action: "buy" | "sell",
  amountUsd: number, // buy: dollars to spend; sell: shares to sell
  ts = Date.now()
): { ok: true; trade: TradeRecord } | { ok: false; error: string } {
  const m = s.markets.get(marketId);
  const u = s.users.get(userName);
  if (!m) return { ok: false, error: "unknown market" };
  if (!u) return { ok: false, error: "unknown user" };
  if (m.status !== "open") return { ok: false, error: "market is settled" };
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return { ok: false, error: "invalid amount" };

  const pos = ensurePosition(u, marketId);
  let usd = 0;
  let shares = 0;

  if (action === "buy") {
    usd = Math.min(amountUsd, u.balanceUsd);
    if (usd < 0.01) return { ok: false, error: "insufficient balance" };
    shares = sharesForSpend(m.qYes, m.qNo, m.b, side, usd);
    if (shares <= 0) return { ok: false, error: "trade too small" };
    u.balanceUsd -= usd;
    if (side === "YES") {
      m.qYes += shares;
      pos.yes += shares;
      pos.premiumPaid += usd;
    } else {
      // writing protection: cost equals full collateral minus premium earned
      m.qNo += shares;
      pos.no += shares;
      pos.premiumEarned += Math.max(0, shares - usd);
    }
  } else {
    const held = side === "YES" ? pos.yes : pos.no;
    shares = Math.min(amountUsd, held);
    if (shares <= 0) return { ok: false, error: "no position to sell" };
    usd = proceedsForSale(m.qYes, m.qNo, m.b, side, shares);
    u.balanceUsd += usd;
    if (side === "YES") {
      m.qYes -= shares;
      pos.yes -= shares;
    } else {
      m.qNo -= shares;
      pos.no -= shares;
    }
  }

  m.volumeUsd += usd;
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
    usd: Math.round(usd * 100) / 100,
    shares: Math.round(shares * 100) / 100,
    priceAfter: p,
  };
  s.trades.unshift(trade);
  if (s.trades.length > 200) s.trades.pop();
  if (!u.isBot || Math.abs(usd) > 500) {
    pushEvent(
      s,
      "trade",
      `${userName} ${action === "buy" ? "bought" : "sold"} $${Math.round(usd).toLocaleString()} of ${side} on ${m.ticker} → ${(p * 100).toFixed(1)}%`,
      marketId
    );
  }
  return { ok: true, trade };
}

// Insurance costume over the same trade: coverage dollars = YES shares.
export function executeHedge(
  s: AppState,
  userName: string,
  marketId: string,
  coverage: number
): { ok: true; premium: number; rate: number; priceAfter: number } | { ok: false; error: string } {
  const m = s.markets.get(marketId);
  const u = s.users.get(userName);
  if (!m) return { ok: false, error: "unknown market" };
  if (!u) return { ok: false, error: "unknown user" };
  if (m.status !== "open") return { ok: false, error: "market is settled" };
  if (!Number.isFinite(coverage) || coverage < 100) return { ok: false, error: "minimum coverage is $100" };

  const base = costForShares(m.qYes, m.qNo, m.b, "YES", coverage);
  const premium = base * (1 + CONFIG.hedgeFeePct);
  if (premium > u.balanceUsd) return { ok: false, error: "insufficient balance for premium" };

  u.balanceUsd -= premium;
  m.qYes += coverage;
  const pos = ensurePosition(u, marketId);
  pos.yes += coverage;
  pos.premiumPaid += premium;
  m.volumeUsd += premium;

  const p = priceYes(m.qYes, m.qNo, m.b);
  const hist = s.priceHistory.get(marketId)!;
  hist.push({ ts: Date.now(), p });

  const trade: TradeRecord = {
    id: `t${s.seq++}`,
    ts: Date.now(),
    user: userName,
    marketId,
    side: "YES",
    action: "buy",
    usd: Math.round(premium * 100) / 100,
    shares: Math.round(coverage * 100) / 100,
    priceAfter: p,
  };
  s.trades.unshift(trade);
  if (s.trades.length > 200) s.trades.pop();
  pushEvent(
    s,
    "hedge",
    `${userName} bought $${Math.round(coverage).toLocaleString()} of protection on ${m.ticker} for $${Math.round(premium).toLocaleString()} (${((premium / coverage) * 100).toFixed(1)}%)`,
    marketId
  );
  return { ok: true, premium, rate: premium / coverage, priceAfter: p };
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
      u.balanceUsd += winning; // $1 per winning share, instantly - no claims process
      paidOut += winning;
      u.payouts.unshift({
        marketId,
        ticker: m.ticker,
        question: m.question,
        outcome,
        amountUsd: Math.round(winning * 100) / 100,
        settledNote: note,
        ts: m.settledTs!,
      } satisfies PayoutRecord);
      if (u.payouts.length > 20) u.payouts.pop();
    }
    pos.yes = 0;
    pos.no = 0;
  }

  const hist = s.priceHistory.get(marketId)!;
  hist.push({ ts: Date.now(), p: outcome === "YES" ? 1 : 0 });
  pushEvent(
    s,
    "settle",
    `SETTLED ${outcome}: ${m.question}. ${note}. $${Math.round(paidOut).toLocaleString()} paid out automatically.`,
    marketId
  );
}

const g = globalThis as unknown as { __cumulusState?: AppState };

export function getState(): AppState {
  if (!g.__cumulusState) g.__cumulusState = seedState();
  return g.__cumulusState;
}
