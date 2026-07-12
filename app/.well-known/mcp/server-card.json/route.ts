import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    serverInfo: {
      name: "cumulus-trading",
      version: "1.0.0",
      description: "MCP tools for inspecting and trading Cumulus play-money downtime markets.",
    },
    protocolVersion: "2024-11-05",
    transport: {
      type: "stdio",
      command: "node",
      args: ["mcp/cumulus-mcp.mjs"],
    },
    capabilities: { tools: {} },
    documentation: "https://culumus.vercel.app/agents",
  });
}
