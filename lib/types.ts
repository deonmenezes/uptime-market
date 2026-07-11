export type Category = "crypto" | "politics" | "sports" | "tech" | "pop" | "memes";

export type Side = "YES" | "NO";

export interface Trade {
  id: string;
  marketId: string;
  wallet: string;
  side: Side;
  action: "buy" | "sell";
  sol: number;
  priceCents: number;
  ts: number;
}

export interface Comment {
  id: string;
  wallet: string;
  text: string;
  ts: number;
  likes: number;
}

export interface Holder {
  wallet: string;
  side: Side;
  pct: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Market {
  id: string;
  question: string;
  ticker: string;
  emoji: string;
  hue: number;
  category: Category;
  creator: string;
  createdTs: number;
  yesCents: number;
  volumeSol: number;
  vol5mSol: number;
  liquiditySol: number;
  graduationPct: number;
  replies: number;
  holders: number;
  endsLabel: string;
  lastTrade: Trade | null;
}

export type EngineEvent =
  | { type: "trade"; trade: Trade }
  | { type: "market"; market: Market }
  | { type: "comment"; marketId: string; comment: Comment };
