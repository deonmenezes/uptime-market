export type Side = "YES" | "NO";
export type MarketStatus = "open" | "settled";
export type SettlementMode = "auto" | "manual";
export type OracleSource = "aws-feed" | "cloudflare-feed" | "stripe-monitor" | "openai-monitor" | "simulator";

export interface OracleReading {
  ts: number;
  source: string; // e.g. "monitor:openai", "feed:cloudflare", "sim:checkout-service"
  service: string;
  ok: boolean; // service considered up in this reading
  latencyMs: number | null;
  indicator: string | null; // statuspage indicator or sim state
  summary: string;
  hash: string;
  prevHash: string;
}

export interface PricePoint {
  ts: number;
  p: number; // YES probability 0..1
}

export interface Market {
  id: string;
  ticker: string;
  question: string;
  service: string; // artwork + monitor key
  source: OracleSource;
  sourceName: string; // human label, e.g. "AWS status feed"
  sourceUrl: string;
  trigger: string; // plain-english settlement trigger
  settlement: SettlementMode;
  status: MarketStatus;
  outcome: Side | null;
  settledTs: number | null;
  settledNote: string | null;
  qYes: number;
  qNo: number;
  b: number;
  createdTs: number;
  closesLabel: string;
  volumeUsd: number;
}

export interface Position {
  yes: number; // $1-payout shares = dollars of coverage held
  no: number; // $1-payout shares = dollars of protection written
  premiumPaid: number;
  premiumEarned: number;
}

// Recorded at settlement for every winning position — powers the
// "paid instantly, no claim filed" moment in the UI.
export interface PayoutRecord {
  marketId: string;
  ticker: string;
  question: string;
  outcome: Side;
  amountUsd: number;
  settledNote: string;
  ts: number;
}

export interface UserAccount {
  name: string;
  balanceUsd: number;
  positions: Record<string, Position>;
  payouts: PayoutRecord[];
  usedSignatures: string[];
  wallet: string | null;
  createdTs: number;
  isBot: boolean;
}

export interface TradeRecord {
  id: string;
  ts: number;
  user: string;
  marketId: string;
  side: Side;
  action: "buy" | "sell";
  usd: number;
  shares: number;
  priceAfter: number;
}

export interface FeedEvent {
  id: string;
  ts: number;
  kind: "trade" | "hedge" | "settle" | "incident" | "deposit" | "system";
  text: string;
  marketId?: string;
}

// ---- wire types ----

export interface MarketView extends Market {
  price: number;
  spark: number[];
  escrowUsd: number; // NO shares outstanding = collateral posted
  exposureUsd: number; // YES shares outstanding = max payout owed
}

export interface MonitorStatus {
  service: string;
  label: string;
  ok: boolean;
  latencyMs: number | null;
  indicator: string | null;
  checkedTs: number;
}

export interface LeaderboardRow {
  name: string;
  balanceUsd: number;
  portfolioUsd: number;
  netWorthUsd: number;
  isBot: boolean;
}

export interface StateSnapshot {
  now: number;
  markets: MarketView[];
  monitors: MonitorStatus[];
  trades: TradeRecord[];
  events: FeedEvent[];
  leaderboard: LeaderboardRow[];
  user: {
    name: string;
    balanceUsd: number;
    positions: Record<string, Position>;
    payouts: PayoutRecord[];
  } | null;
  oracleChainLength: number;
  treasury: string;
  usdPerSol: number;
}

export interface HedgeQuote {
  coverage: number;
  premium: number;
  rate: number;
  priceAfter: number;
}
