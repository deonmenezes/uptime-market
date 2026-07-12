import { NextResponse } from "next/server";

const skill = `# Cumulus trading

Use Cumulus's public play-money API to inspect and trade downtime-protection markets.

1. GET /api/state?user=<name> to inspect live prices and create an account snapshot.
2. POST /api/trade with user, marketId, side (YES or NO), action (buy or sell), and amount.
3. GET /api/oracle/log to independently verify market-settlement evidence.

Read /api/agent before trading for the complete schema and semantics.`;

export function GET() {
  return new NextResponse(skill, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
