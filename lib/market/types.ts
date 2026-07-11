export type Side = "YES" | "NO";
export type MarketStatus = "open" | "settled";
export type SettlementMode = "auto" | "manual";

export interface TelemetryReading {
  ts: number;
  service: string;
  uptimePct: number;
  errorRatePct: number;
  p99Ms: number;
  healthy: boolean;
  incident: boolean;
}

export interface PricePoint {
  ts: number;
  p: number; // YES probability 0..1
}

export interface Market {
  id: string;
  ticker: string;
  question: string;
  service: string; // telemetry source + artwork key
  settlement: SettlementMode;
  rule: string;
  status: MarketStatus;
  outcome: Side | null;
  settledTs: number | null;
  settledNote: string | null;
  qYes: number;
  qNo: number;
  b: number;
  createdTs: number;
  closesLabel: string;
  volumeCredits: number;
}

export interface Position {
  yes: number;
  no: number;
}

export interface UserAccount {
  name: string;
  credits: number;
  positions: Record<string, Position>;
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
  credits: number;
  shares: number;
  priceAfter: number;
}

export interface FeedEvent {
  id: string;
  ts: number;
  kind: "trade" | "settle" | "incident" | "deposit" | "system";
  text: string;
  marketId?: string;
}

// ---- wire types (what /api/state returns) ----

export interface MarketView extends Market {
  price: number; // current YES probability
  spark: number[]; // recent price points for card sparklines
}

export interface LeaderboardRow {
  name: string;
  credits: number;
  portfolio: number; // mark-to-market value of open positions
  netWorth: number;
  isBot: boolean;
}

export interface StateSnapshot {
  now: number;
  markets: MarketView[];
  telemetry: TelemetryReading[]; // latest reading per service
  sev1Count: number;
  trades: TradeRecord[];
  events: FeedEvent[];
  leaderboard: LeaderboardRow[];
  user: { name: string; credits: number; positions: Record<string, Position> } | null;
  treasury: string;
  creditsPerSol: number;
}
