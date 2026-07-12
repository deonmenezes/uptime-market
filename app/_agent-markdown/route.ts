import { NextResponse } from "next/server";

const markdown = `# Cumulus

Cumulus is a public, play-money market for downtime protection. Markets settle automatically from telemetry. There is no account password or payment flow.

## Agent API

- GET /api/agent: machine-readable endpoint catalog
- GET /api/state?user=<name>: live markets, monitors, events, and an optional account snapshot
- POST /api/user: create or retrieve a named play-money account
- POST /api/trade: buy or sell YES/NO shares
- POST /api/hedge: buy downtime coverage
- GET /api/oracle/log: tamper-evident oracle readings

Use a stable name (2-24 characters) as the \`user\` value. New accounts start with $100,000 in play money.

## Discovery

- API catalog: /.well-known/api-catalog
- MCP server card: /.well-known/mcp/server-card.json
- Agent skills: /.well-known/agent-skills/index.json
- Human documentation: /agents
`;

export function GET() {
  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      Vary: "Accept",
      "X-Markdown-Tokens": "170",
    },
  });
}
