import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Machine-readable API spec for agents. GET /api/agent and you know how to
// trade here. The same spec ships as an MCP server (mcp/cumulus-mcp.mjs) and
// a skill file (skills/cumulus-trading/SKILL.md).
export async function GET() {
  return NextResponse.json({
    name: "Cumulus Agent API",
    version: "1",
    description:
      "Tradeable downtime protection. Binary LMSR prediction markets on cloud, API, gaming and streaming outages, settled automatically by a telemetry oracle. Play money: every new account starts with $100,000.",
    identity:
      "No auth. Your account is your name string (2-24 chars). Pass it consistently as `user`. First use auto-creates the account.",
    endpoints: [
      {
        method: "GET",
        path: "/api/state?user=<name>",
        purpose:
          "Full snapshot: markets (id, question, price=YES probability, b, qYes, qNo), monitors (health: up|confirming|down|unknown), recent trades, events, leaderboard, and your balance/positions/payouts when `user` is passed.",
      },
      {
        method: "POST",
        path: "/api/user",
        body: { name: "string" },
        purpose: "Create or fetch an account. Returns balance and positions.",
      },
      {
        method: "POST",
        path: "/api/trade",
        body: { user: "string", marketId: "string", side: "YES|NO", action: "buy|sell", amount: "number" },
        purpose:
          "Trade against the LMSR market maker. buy: amount is USD to spend. sell: amount is shares to sell (must hold them). Returns the fill with priceAfter. Winning shares pay $1 at settlement.",
      },
      {
        method: "POST",
        path: "/api/hedge",
        body: { user: "string", marketId: "string", coverage: "number (USD, min 100)" },
        purpose:
          "Insurance costume over the same book: buy `coverage` YES shares, pay a quoted premium (LMSR cost + 1% fee). If the outage happens you are paid the full coverage automatically.",
      },
      {
        method: "GET",
        path: "/api/market/<id>/history",
        purpose: "Price history for one market.",
      },
      {
        method: "GET",
        path: "/api/oracle/log",
        purpose: "The sha256-chained oracle readings. Verify settlement evidence yourself.",
      },
      {
        method: "POST",
        path: "/api/admin/incident",
        purpose: "Demo only: inject a simulated outage on checkout-service. Settles the CHKOUT market YES in ~20s.",
      },
    ],
    strategy_notes: [
      "price = P(outage). YES profits if the outage happens, NO profits if it does not.",
      "monitors[].health 'confirming' means the oracle sees failing readings but has not confirmed degradation. Prices usually have not moved yet: this is the fastest signal on the site.",
      "LMSR with b=250000: a $10K order moves a 12% market roughly half a point. Size accordingly.",
      "Markets settle automatically from telemetry. No counterparty risk: winning shares always pay $1, escrow is full-collateral.",
    ],
    mcp: "Run `node mcp/cumulus-mcp.mjs` from the repo (CUMULUS_URL, CUMULUS_AGENT_NAME env vars) for MCP tool access.",
  });
}
