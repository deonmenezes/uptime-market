import type { Candle, Comment, EngineEvent, Holder, Market, Side, Trade } from "./types";

// Deterministic PRNG so the server render and first client render agree.
// All live randomness starts only after mount (setInterval never runs on the server).
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BASE_TS = 1_760_000_000_000; // fixed epoch for seeded data; display times are relative

const WALLETS = [
  "wifhat_god", "anon420", "0xGigaChad", "solPriest", "milady_maxi", "rug_survivor",
  "degenerate.eth", "hyperliquidated", "CTRL_ALT_PUMP", "friedchickenDAO", "basedretail",
  "0xF00d…c0de", "gm_gn_gm", "sniperooni", "exit_liquidity", "candle_whisperer",
  "leverage_larry", "shrimp2whale", "notfinancialadv", "ser_pump",
];

const SEED_MARKETS: Array<{
  question: string; ticker: string; emoji: string; hue: number;
  category: Market["category"]; yes: number; ends: string;
}> = [
  { question: "BTC ABOVE $250K BY DEC 31?", ticker: "BTC250", emoji: "🟠", hue: 28, category: "crypto", yes: 34, ends: "DEC 31" },
  { question: "SOL FLIPS ETH THIS CYCLE?", ticker: "FLIPPED", emoji: "☀️", hue: 268, category: "crypto", yes: 18, ends: "DEC 31" },
  { question: "FED CUTS RATES IN SEPTEMBER?", ticker: "JPOWCUT", emoji: "🏦", hue: 208, category: "politics", yes: 62, ends: "SEP 18" },
  { question: "GTA 6 DELAYED AGAIN?", ticker: "GTA6D", emoji: "🎮", hue: 320, category: "pop", yes: 71, ends: "NOV 19" },
  { question: "AGI DECLARED BY A MAJOR LAB IN 2026?", ticker: "AGI26", emoji: "🤖", hue: 180, category: "tech", yes: 9, ends: "DEC 31" },
  { question: "MESSI WINS ANOTHER BALLON D'OR?", ticker: "GOAT8", emoji: "⚽", hue: 200, category: "sports", yes: 22, ends: "OCT 30" },
  { question: "US RECESSION DECLARED IN 2026?", ticker: "RECESH", emoji: "📉", hue: 0, category: "politics", yes: 41, ends: "DEC 31" },
  { question: "ETH ABOVE $10K BY EOY?", ticker: "ETH10K", emoji: "💎", hue: 240, category: "crypto", yes: 27, ends: "DEC 31" },
  { question: "SPACEX UNCREWED MARS LAUNCH THIS YEAR?", ticker: "MARSGO", emoji: "🚀", hue: 12, category: "tech", yes: 15, ends: "DEC 31" },
  { question: "TIKTOK FULLY BANNED IN THE US?", ticker: "NOTOK", emoji: "📵", hue: 340, category: "politics", yes: 12, ends: "DEC 31" },
  { question: "NEW MEME COIN TOP-10 BY MCAP IN 2026?", ticker: "DOGEAT", emoji: "🐸", hue: 96, category: "memes", yes: 55, ends: "DEC 31" },
  { question: "APPLE SHIPS FOLDABLE IPHONE IN 2026?", ticker: "FOLDME", emoji: "📱", hue: 210, category: "tech", yes: 44, ends: "DEC 31" },
  { question: "LAKERS MAKE THE FINALS?", ticker: "LEBRONX", emoji: "🏀", hue: 275, category: "sports", yes: 19, ends: "JUN 20" },
  { question: "OIL ABOVE $100 ANY DAY THIS YEAR?", ticker: "CRUDE100", emoji: "🛢️", hue: 40, category: "politics", yes: 31, ends: "DEC 31" },
  { question: "A HUMANOID ROBOT DOES A PUBLIC BACKFLIP FAIL?", ticker: "ROBOFLOP", emoji: "🦾", hue: 160, category: "memes", yes: 83, ends: "DEC 31" },
  { question: "NVIDIA ABOVE $6T MARKET CAP?", ticker: "JENSEN6", emoji: "🖥️", hue: 110, category: "tech", yes: 48, ends: "DEC 31" },
];

const NEW_QUESTIONS: Array<[string, string, string, number, Market["category"]]> = [
  ["POWELL SAYS 'TRANSITORY' IN NEXT PRESSER?", "TRANSIT", "🎙️", 220, "politics"],
  ["DOGE ABOVE $1 BY HALLOWEEN?", "DOGE1", "🐕", 45, "memes"],
  ["NEXT AIRDROP META DIES IN A WEEK?", "DROPDED", "🪂", 5, "crypto"],
  ["A16Z LEADS A ROUND FOR AN AI GIRLFRIEND APP?", "WAIFUVC", "💘", 330, "memes"],
  ["SOLANA OUTAGE BEFORE EOY?", "HALTED", "🔌", 265, "crypto"],
  ["NEW COUNTRY ADOPTS BTC AS LEGAL TENDER?", "NATION2", "🏴", 30, "crypto"],
  ["MRBEAST BUYS A SPORTS TEAM?", "BEASTFC", "🦁", 15, "pop"],
  ["TWITTER/X LAUNCHES ITS OWN CHAIN?", "XCHAIN", "🐦", 195, "tech"],
];

const COMMENT_LINES = [
  "this is free money if you know you know",
  "just aped my whole bag, see you at 99¢",
  "NO holders explain yourselves",
  "the chart is literally begging for it",
  "insider here. can't say more.",
  "resolution source is airtight, read the rules people",
  "who keeps market selling YES at these levels 😭",
  "printing since 12¢, ty for the exit liquidity",
  "this resolves NO and you all know it",
  "adding on every dip until graduation",
  "smart money quietly loading, watch the tape",
  "bro this is my rent money pray for me",
];

export class MarketEngine {
  markets = new Map<string, Market>();
  order: string[] = [];
  tape: Trade[] = [];
  comments = new Map<string, Comment[]>();
  candles = new Map<string, Candle[]>();
  holders = new Map<string, Holder[]>();

  version = 0;
  private listeners = new Set<() => void>();
  private eventListeners = new Set<(e: EngineEvent) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private rng = mulberry32(1337);
  private liveRng = mulberry32(9001);
  private newIdx = 0;
  private idSeq = 0;

  constructor() {
    this.seed();
  }

  private seed() {
    SEED_MARKETS.forEach((s, i) => {
      const id = s.ticker.toLowerCase();
      const volume = 40 + this.rng() * 900;
      const m: Market = {
        id,
        question: s.question,
        ticker: s.ticker,
        emoji: s.emoji,
        hue: s.hue,
        category: s.category,
        creator: WALLETS[i % WALLETS.length],
        createdTs: BASE_TS - Math.floor(this.rng() * 72 * 3600_000),
        yesCents: s.yes,
        volumeSol: volume,
        vol5mSol: this.rng() * 40,
        liquiditySol: 8 + this.rng() * 60,
        graduationPct: Math.min(99, Math.round((volume / 850) * 100)),
        replies: Math.floor(this.rng() * 240),
        holders: 20 + Math.floor(this.rng() * 900),
        endsLabel: s.ends,
        lastTrade: null,
      };
      this.markets.set(id, m);
      this.order.push(id);
      this.seedCandles(id, s.yes);
      this.seedComments(id);
      this.seedHolders(id);
    });
    // seed tape with a few fixed trades so the page isn't empty pre-mount
    for (let i = 0; i < 14; i++) {
      const m = this.markets.get(this.order[Math.floor(this.rng() * this.order.length)])!;
      this.tape.unshift(this.makeTrade(m, this.rng, BASE_TS - (14 - i) * 9000));
    }
  }

  private seedCandles(id: string, endCents: number) {
    const out: Candle[] = [];
    let price = Math.max(3, Math.min(97, endCents + (this.rng() - 0.5) * 30));
    const start = Math.floor((BASE_TS - 96 * 15 * 60_000) / 1000);
    for (let i = 0; i < 96; i++) {
      const drift = (endCents - price) * 0.06;
      const open = price;
      const close = Math.max(2, Math.min(98, price + drift + (this.rng() - 0.5) * 4));
      out.push({
        time: start + i * 900,
        open,
        close,
        high: Math.min(99, Math.max(open, close) + this.rng() * 2),
        low: Math.max(1, Math.min(open, close) - this.rng() * 2),
      });
      price = close;
    }
    out[out.length - 1].close = endCents;
    this.candles.set(id, out);
  }

  private seedComments(id: string) {
    const n = 3 + Math.floor(this.rng() * 5);
    const list: Comment[] = [];
    for (let i = 0; i < n; i++) {
      list.push({
        id: `${id}-c${i}`,
        wallet: WALLETS[Math.floor(this.rng() * WALLETS.length)],
        text: COMMENT_LINES[Math.floor(this.rng() * COMMENT_LINES.length)],
        ts: BASE_TS - Math.floor(this.rng() * 5 * 3600_000),
        likes: Math.floor(this.rng() * 40),
      });
    }
    list.sort((a, b) => b.ts - a.ts);
    this.comments.set(id, list);
  }

  private seedHolders(id: string) {
    const list: Holder[] = [];
    let remaining = 62;
    for (let i = 0; i < 8; i++) {
      const pct = i === 7 ? remaining : Math.max(1, Math.floor(this.rng() * remaining * 0.45));
      remaining -= pct;
      list.push({
        wallet: WALLETS[(i * 3 + 1) % WALLETS.length],
        side: this.rng() > 0.4 ? "YES" : "NO",
        pct,
      });
    }
    this.holders.set(id, list.sort((a, b) => b.pct - a.pct));
  }

  private makeTrade(m: Market, rng: () => number, ts: number): Trade {
    const side: Side = rng() > 0.45 ? "YES" : "NO";
    return {
      id: `t${this.idSeq++}`,
      marketId: m.id,
      wallet: WALLETS[Math.floor(rng() * WALLETS.length)],
      side,
      action: rng() > 0.3 ? "buy" : "sell",
      sol: Math.round((0.05 + rng() * rng() * 14) * 100) / 100,
      priceCents: m.yesCents,
      ts,
    };
  }

  // ---- live simulation (client only) ----

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.step(), 700);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private step() {
    const r = this.liveRng;
    // 1-2 trades per tick
    const n = r() > 0.6 ? 2 : 1;
    for (let i = 0; i < n; i++) this.emitTrade();
    // occasional comment
    if (r() < 0.12) this.emitComment();
    // occasional brand-new market
    if (r() < 0.03) this.emitNewMarket();
    this.bump();
  }

  private emitTrade() {
    const r = this.liveRng;
    const id = this.order[Math.floor(r() * this.order.length)];
    const m = this.markets.get(id)!;
    const trade = this.makeTrade(m, r, Date.now());

    const push = (trade.action === "buy" ? 1 : -1) * (trade.side === "YES" ? 1 : -1);
    const impact = push * Math.min(6, trade.sol * (0.4 + r() * 0.8));
    m.yesCents = Math.max(1, Math.min(99, m.yesCents + impact));
    trade.priceCents = m.yesCents;
    m.volumeSol += trade.sol;
    m.vol5mSol = m.vol5mSol * 0.97 + trade.sol;
    m.graduationPct = Math.min(99, Math.round((m.volumeSol / 850) * 100));
    m.lastTrade = trade;

    const candles = this.candles.get(id)!;
    const last = candles[candles.length - 1];
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - last.time >= 900) {
      candles.push({ time: last.time + 900, open: last.close, close: m.yesCents, high: Math.max(last.close, m.yesCents), low: Math.min(last.close, m.yesCents) });
      if (candles.length > 300) candles.shift();
    } else {
      last.close = m.yesCents;
      last.high = Math.max(last.high, m.yesCents);
      last.low = Math.min(last.low, m.yesCents);
    }

    this.tape.unshift(trade);
    if (this.tape.length > 60) this.tape.pop();
    this.emit({ type: "trade", trade });
  }

  private emitComment() {
    const r = this.liveRng;
    const id = this.order[Math.floor(r() * this.order.length)];
    const m = this.markets.get(id)!;
    const comment: Comment = {
      id: `live-c${this.idSeq++}`,
      wallet: WALLETS[Math.floor(r() * WALLETS.length)],
      text: COMMENT_LINES[Math.floor(r() * COMMENT_LINES.length)],
      ts: Date.now(),
      likes: 0,
    };
    this.comments.get(id)!.unshift(comment);
    m.replies += 1;
    this.emit({ type: "comment", marketId: id, comment });
  }

  private emitNewMarket() {
    const spec = NEW_QUESTIONS[this.newIdx % NEW_QUESTIONS.length];
    this.newIdx++;
    const r = this.liveRng;
    const id = `${spec[1].toLowerCase()}-${this.idSeq++}`;
    const m: Market = {
      id,
      question: spec[0],
      ticker: spec[1],
      emoji: spec[2],
      hue: spec[3],
      category: spec[4],
      creator: WALLETS[Math.floor(r() * WALLETS.length)],
      createdTs: Date.now(),
      yesCents: 5 + Math.floor(r() * 60),
      volumeSol: r() * 2,
      vol5mSol: r() * 2,
      liquiditySol: 4 + r() * 10,
      graduationPct: 0,
      replies: 0,
      holders: 1,
      endsLabel: "DEC 31",
      lastTrade: null,
    };
    this.markets.set(id, m);
    this.order.unshift(id);
    this.seedCandles(id, m.yesCents);
    this.comments.set(id, []);
    this.seedHolders(id);
    this.emit({ type: "market", market: m });
  }

  // user-created market from the create form
  createMarket(question: string, ticker: string, emoji: string, category: Market["category"]): Market {
    const id = `${ticker.toLowerCase().replace(/[^a-z0-9]/g, "")}-${this.idSeq++}`;
    const m: Market = {
      id,
      question: question.toUpperCase(),
      ticker: ticker.toUpperCase(),
      emoji: emoji || "🎲",
      hue: Math.floor(this.liveRng() * 360),
      category,
      creator: "you",
      createdTs: Date.now(),
      yesCents: 50,
      volumeSol: 0,
      vol5mSol: 0,
      liquiditySol: 5,
      graduationPct: 0,
      replies: 0,
      holders: 1,
      endsLabel: "DEC 31",
      lastTrade: null,
    };
    this.markets.set(id, m);
    this.order.unshift(id);
    this.seedCandles(id, 50);
    this.comments.set(id, []);
    this.holders.set(id, [{ wallet: "you", side: "YES", pct: 100 }]);
    this.emit({ type: "market", market: m });
    this.bump();
    return m;
  }

  // user trade from the trade panel
  userTrade(marketId: string, side: Side, action: "buy" | "sell", sol: number) {
    const m = this.markets.get(marketId);
    if (!m) return;
    const trade: Trade = {
      id: `t${this.idSeq++}`, marketId, wallet: "you", side, action, sol,
      priceCents: m.yesCents, ts: Date.now(),
    };
    const push = (action === "buy" ? 1 : -1) * (side === "YES" ? 1 : -1);
    m.yesCents = Math.max(1, Math.min(99, m.yesCents + push * Math.min(8, sol)));
    trade.priceCents = m.yesCents;
    m.volumeSol += sol;
    m.lastTrade = trade;
    this.tape.unshift(trade);
    if (this.tape.length > 60) this.tape.pop();
    this.emit({ type: "trade", trade });
    this.bump();
  }

  king(): Market {
    let best = this.markets.get(this.order[0])!;
    for (const id of this.order) {
      const m = this.markets.get(id)!;
      if (m.vol5mSol > best.vol5mSol) best = m;
    }
    return best;
  }

  // ---- subscription plumbing ----

  private bump() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  private emit(e: EngineEvent) {
    this.eventListeners.forEach((l) => l(e));
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  onEvent = (cb: (e: EngineEvent) => void) => {
    this.eventListeners.add(cb);
    return () => this.eventListeners.delete(cb);
  };

  getVersion = () => this.version;
}

// module-level singleton shared by all client components
export const engine = new MarketEngine();
