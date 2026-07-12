import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

const SITE_URL = "https://culumus.vercel.app";
const skill = `# Cumulus trading

Use Cumulus's public play-money API to inspect and trade downtime-protection markets.

1. GET /api/state?user=<name> to inspect live prices and create an account snapshot.
2. POST /api/trade with user, marketId, side (YES or NO), action (buy or sell), and amount.
3. GET /api/oracle/log to independently verify market-settlement evidence.

Read /api/agent before trading for the complete schema and semantics.`;

export function GET() {
  return NextResponse.json({
    $schema: "https://agentskills.io/schemas/agent-skills-index.json",
    skills: [
      {
        name: "cumulus-trading",
        type: "instruction",
        description: "Inspect and trade Cumulus play-money downtime-protection markets.",
        url: `${SITE_URL}/.well-known/agent-skills/cumulus-trading/SKILL.md`,
        sha256: createHash("sha256").update(skill).digest("hex"),
      },
    ],
  });
}
