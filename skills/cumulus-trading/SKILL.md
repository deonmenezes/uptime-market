---
name: cumulus-trading
description: Trade downtime protection on Cumulus, a prediction market for cloud, API, gaming and streaming outages (AWS, Stripe, Cloudflare, OpenAI, Fortnite, Netflix, Valorant). Use when asked to hedge an outage, buy or sell YES/NO on a downtime market, check what is down, monitor oracle telemetry, or run a trading strategy on culumus.vercel.app.
---

# Trading downtime markets on Cumulus

Cumulus is an LMSR prediction market where price = probability of an outage.
Settlement is automatic: a telemetry oracle pings real services every 15s and
pays winners $1 per share the moment a trigger fires. Play money; every
account starts with $100,000.

Base URL: https://culumus.vercel.app (override with CUMULUS_URL).
Identity: no auth. Pick one agent name (2-24 chars) and pass it as `user` in
every call. First use creates the account.

## Fastest path

If the Cumulus MCP server is connected, use its tools directly:
`list_markets`, `get_oracle_status`, `get_market`, `buy`, `sell`,
`buy_protection`, `get_portfolio`, `get_oracle_log`, `inject_demo_incident`.

Otherwise call the REST API:

1. `GET /api/agent` for the machine-readable spec.
2. `GET /api/state?user=<name>` for markets, monitors, and your positions.
3. `POST /api/trade` with `{user, marketId, side: "YES"|"NO", action: "buy"|"sell", amount}`.
   Buy amount is USD to spend; sell amount is shares to sell.
4. `POST /api/hedge` with `{user, marketId, coverage}` to buy protection
   (YES shares dressed as insurance; premium is quoted and charged).

## Reading the market

- `price` is the YES probability. YES pays $1 if the outage happens, NO pays
  $1 if it does not. YES + NO prices always sum to 1.
- `monitors[].health` is the oracle's live view per service:
  - `up`: last reading ok
  - `confirming`: failing readings below the confirmation threshold. The
    outage is not yet official and prices usually have not moved. This is
    the highest-alpha signal on the site.
  - `down`: confirmed degradation, counting toward settlement
  - `unknown`: the status feed itself was unreachable, never counts as downtime
- The book is LMSR with b=250,000: quotes exist at any size, bigger orders
  move the price more. A $10K order moves a 12% market about half a point.

## Settlement triggers (read `trigger` on each market for exact wording)

- aws-use1: AWS Health feed shows an active us-east-1 event
- cf-incident: cloudflarestatus.com reports major/critical
- epic-fortnite: status.epicgames.com reports major/critical
- stripe-30m, netflix-30m, riot-valorant: cumulative failed monitor checks
  exceed 30 minutes (readings every 15s, 2-consecutive-fail debounce)
- openai-slo: measured weekly availability below 99.5%
- demo-checkout: simulated; `POST /api/admin/incident` settles it YES in ~20s

## Strategy notes

- Watch `health: confirming` and act before confirmation moves the market.
- Selling NO is writing insurance: you earn premium but escrow $1/share.
- Verify any settlement yourself: `GET /api/oracle/log` returns the
  sha256-chained readings the settlement note cites.
- Positions pay out automatically at settlement; check `payouts` in
  `GET /api/state?user=<name>`.
