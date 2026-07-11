# pred.fun

A degen-styled prediction market UI. Original implementation inspired by launchpad-board layouts: dense live card grid, trade ticker, king of the hill, candlestick market pages, bonding-curve graduation mechanic.

**Demo mode**: all market data is simulated client-side by `lib/engine.ts` so the whole thing feels alive with zero backend.

## Run

```bash
npm install
npm run dev
```

## Where things live

- `lib/engine.ts` - the fake exchange. Deterministic seed data (SSR-safe), then a client-side interval emits trades, comments, and new markets. This is the ONLY file to replace when wiring a real backend.
- `lib/useEngine.ts` - React binding (useSyncExternalStore) + a mounted-gated `useNow()` for relative timestamps.
- `components/Board.tsx` - home board: ticker, king of the hill, filters, live grid.
- `components/Chart.tsx` - lightweight-charts candlesticks fed by engine events.
- `components/TradePanel.tsx` - YES/NO buy/sell panel (simulated fills).
- `app/m/[id]/page.tsx` - market page. `app/create/page.tsx` - launch form.

## Swapping in a real backend

The engine exposes exactly the surface a real service needs to provide:

1. Replace seed data with a REST fetch (markets, candles, tape, comments, holders).
2. Replace the `setInterval` in `engine.start()` with a WebSocket subscription (Supabase Realtime, Socket.io, or a Helius/Geyser-fed relay) that calls the same `emit({type: "trade" | "market" | "comment"})` handlers.
3. Replace `userTrade`/`createMarket` with signed transactions.

Everything downstream (flashing cards, chart updates, tape, ticker) already listens to those events and will keep working unchanged.
