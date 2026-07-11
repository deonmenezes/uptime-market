# Cumulus — Tradeable Downtime Protection

**SLA credits are toy insurance. Cumulus is an open market where any company can buy real
downtime protection, anyone can sell it, and settlement is a machine reading cloud telemetry.**

A parametric insurance policy is a prediction market contract with one buyer and one seller.
Cumulus chops it into $1 shares: the **hedger view** sells it as coverage and premium, the
**trader view** shows the same contract as a probability. One toggle switches costumes — that
toggle is the pitch.

Live at **https://predfun.vercel.app** · repo: deonmenezes/uptime-market

## Run

```bash
npm install && npm run dev
```

## The demo (PRD §4)

1. The reliability index strip shows "AWS us-east-1 major outage in July" at ~12% — a number
   that doesn't exist anywhere else.
2. Hedger view: buy $50,000 of protection for a quoted premium. Plain English, no jargon.
3. Toggle to trader view: the purchase is YES shares; the probability just ticked up.
4. Demo console: inject an outage on the simulated checkout-service → the oracle logs 8
   failing readings → the contract settles YES and protection holders are **paid instantly,
   no claim filed**.
5. `/oracle` shows every reading sha256-chained to its predecessor — tamper-evident history.

## What's real

- **The oracle is live, not mocked**: every 15s it pings api.stripe.com and api.openai.com
  (latency + status) and polls the public AWS Health and Cloudflare status feeds. Real
  degradations move real contracts. The simulated checkout-service market exists as the stage
  safety net (real outages don't schedule themselves around demo slots).
- **LMSR market maker** (b=250,000): a quote exists at any size; a $50K hedge moves ~12%→14%.
- **Full collateralization**: writing protection escrows $1 per share; every card shows the
  escrow vs open-exposure bar.
- **Signed readings**: `sha256(reading + prev_hash)` append-only chain, verified and served at
  `/api/oracle/log`.
- **Crypto rail (devnet)**: deposit SOL via Phantom; the server verifies the transaction
  on-chain (destination, amount, replay) and credits play-USD at $10K/SOL.

## Architecture

- `lib/market/lmsr.ts` — LMSR math shared by server execution and client previews
- `lib/server/state.ts` — all state, in-memory on `globalThis` (fresh per restart, by design)
- `lib/server/feeds.ts` — the real-world signal layer: synthetic monitors + status feeds
- `lib/server/oracle.ts` — reading chain, settlement evaluation, demo simulator, LP bots;
  serverless-safe (interval + catch-up ticks)
- `app/api/*` — state, trade, hedge, deposit, admin, oracle/log, market history
- Hedger/trader views: `components/HedgePanel.tsx` vs `components/TradePanel.tsx`, toggled
  globally from the header
- Artwork: codex-generated renders in `public/art/` (Pillow compositor, no stock assets);
  provider logos are devicon/simple-icons references

## Known gaps (per PRD §10)

Correlation (one outage triggers everything — mitigated by full collateral), regulation (play
money; production needs a CFTC wrapper or licensed carrier), basis risk (region-wide index vs
your specific stack).
