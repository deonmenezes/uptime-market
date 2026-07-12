#!/usr/bin/env node
// Cumulus MCP server: lets any MCP client (Claude Code, Claude Desktop, Cowork,
// or your own agent) trade downtime protection on Cumulus.
//
// Zero dependencies: speaks MCP (JSON-RPC 2.0, newline-delimited) over stdio
// and calls the Cumulus REST API with fetch.
//
// Usage:
//   CUMULUS_URL=https://culumus.vercel.app CUMULUS_AGENT_NAME=my-agent node mcp/cumulus-mcp.mjs
//
// Or register it (see .mcp.json in this repo) and the tools show up in Claude.

const BASE = (process.env.CUMULUS_URL ?? "https://culumus.vercel.app").replace(/\/$/, "");
const AGENT = (process.env.CUMULUS_AGENT_NAME ?? "mcp-agent").slice(0, 24);

const PROTOCOL_VERSION = "2024-11-05";

async function api(path, init) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status} on ${path}`);
  return data;
}

function marketBrief(m) {
  return {
    id: m.id,
    ticker: m.ticker,
    question: m.question,
    yesPrice: Math.round(m.price * 1000) / 1000,
    noPrice: Math.round((1 - m.price) * 1000) / 1000,
    status: m.status,
    outcome: m.outcome,
    closes: m.closesLabel,
    settlement: m.trigger,
    volumeUsd: Math.round(m.volumeUsd),
  };
}

const TOOLS = [
  {
    name: "list_markets",
    description:
      "List all downtime markets with live YES/NO prices (price = outage probability). Cloud (AWS, Cloudflare), APIs (Stripe, OpenAI), gaming/streaming (Fortnite, Netflix, Valorant) and the demo checkout-service.",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      const s = await api("/api/state");
      return { markets: s.markets.map(marketBrief) };
    },
  },
  {
    name: "get_oracle_status",
    description:
      "Live oracle telemetry per monitored service. health is one of: up, confirming (failing readings, outage not yet confirmed - the fastest tradeable signal), down (confirmed, counting toward settlement), unknown (status feed unreachable).",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      const s = await api("/api/state");
      return {
        monitors: s.monitors.map((m) => ({
          service: m.service,
          label: m.label,
          health: m.health ?? (m.ok ? "up" : "down"),
          latencyMs: m.latencyMs,
          indicator: m.indicator,
        })),
      };
    },
  },
  {
    name: "get_market",
    description: "Full detail for one market: prices, LMSR book (qYes/qNo/b), escrow, exposure, settlement trigger.",
    inputSchema: {
      type: "object",
      properties: { marketId: { type: "string", description: "market id, e.g. aws-use1" } },
      required: ["marketId"],
    },
    run: async ({ marketId }) => {
      const s = await api("/api/state");
      const m = s.markets.find((x) => x.id === marketId);
      if (!m) throw new Error(`unknown market ${marketId}. ids: ${s.markets.map((x) => x.id).join(", ")}`);
      return m;
    },
  },
  {
    name: "buy",
    description:
      "Buy YES or NO shares by spending USD against the LMSR market maker. Always fills. Winning shares pay $1 at settlement. Returns shares received and the price after.",
    inputSchema: {
      type: "object",
      properties: {
        marketId: { type: "string" },
        side: { type: "string", enum: ["YES", "NO"] },
        usd: { type: "number", description: "dollars to spend" },
      },
      required: ["marketId", "side", "usd"],
    },
    run: async ({ marketId, side, usd }) =>
      api("/api/trade", {
        method: "POST",
        body: JSON.stringify({ user: AGENT, marketId, side, action: "buy", amount: usd }),
      }),
  },
  {
    name: "sell",
    description: "Sell shares you hold back to the market maker. amount is SHARES, not dollars.",
    inputSchema: {
      type: "object",
      properties: {
        marketId: { type: "string" },
        side: { type: "string", enum: ["YES", "NO"] },
        shares: { type: "number" },
      },
      required: ["marketId", "side", "shares"],
    },
    run: async ({ marketId, side, shares }) =>
      api("/api/trade", {
        method: "POST",
        body: JSON.stringify({ user: AGENT, marketId, side, action: "sell", amount: shares }),
      }),
  },
  {
    name: "buy_protection",
    description:
      "The hedger costume: buy downtime protection. Pays out `coverageUsd` automatically if the outage happens (no claim to file). You pay a quoted premium upfront. Same book as buy YES.",
    inputSchema: {
      type: "object",
      properties: {
        marketId: { type: "string" },
        coverageUsd: { type: "number", description: "coverage amount in USD, min 100" },
      },
      required: ["marketId", "coverageUsd"],
    },
    run: async ({ marketId, coverageUsd }) =>
      api("/api/hedge", {
        method: "POST",
        body: JSON.stringify({ user: AGENT, marketId, coverage: coverageUsd }),
      }),
  },
  {
    name: "get_portfolio",
    description: "Your balance, open positions per market, and settlement payouts you have received.",
    inputSchema: { type: "object", properties: {} },
    run: async () => {
      await api("/api/user", { method: "POST", body: JSON.stringify({ name: AGENT }) });
      const s = await api(`/api/state?user=${encodeURIComponent(AGENT)}`);
      return { agent: AGENT, ...s.user };
    },
  },
  {
    name: "get_oracle_log",
    description: "Recent sha256-chained oracle readings: the tamper-evident evidence trail every settlement cites.",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "number", description: "max readings, default 20" } },
    },
    run: async ({ limit = 20 }) => {
      const log = await api("/api/oracle/log");
      const readings = Array.isArray(log?.readings) ? log.readings : Array.isArray(log) ? log : [];
      return { readings: readings.slice(0, limit) };
    },
  },
  {
    name: "inject_demo_incident",
    description:
      "DEMO ONLY: inject a simulated outage on checkout-service. The oracle logs ~8 failing readings and settles the CHKOUT market YES in about 20 seconds. Does not touch real markets.",
    inputSchema: { type: "object", properties: {} },
    run: async () => api("/api/admin/incident", { method: "POST", body: "{}" }),
  },
];

// ---- MCP stdio plumbing (newline-delimited JSON-RPC 2.0) ----

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

async function handle(req) {
  const { id, method, params } = req;
  if (method === "initialize") {
    return send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: "cumulus", version: "1.0.0" },
      },
    });
  }
  if (method === "notifications/initialized") return; // notification, no reply
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });
  if (method === "tools/list") {
    return send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      },
    });
  }
  if (method === "tools/call") {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) {
      return send({ jsonrpc: "2.0", id, error: { code: -32602, message: `unknown tool ${params?.name}` } });
    }
    try {
      const result = await tool.run(params?.arguments ?? {});
      return send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    } catch (e) {
      return send({
        jsonrpc: "2.0",
        id,
        result: { content: [{ type: "text", text: `error: ${e.message}` }], isError: true },
      });
    }
  }
  if (id !== undefined) {
    send({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${method}` } });
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let nl;
  while ((nl = buffer.indexOf("\n")) !== -1) {
    const line = buffer.slice(0, nl).trim();
    buffer = buffer.slice(nl + 1);
    if (!line) continue;
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      continue;
    }
    void handle(msg);
  }
});
process.stdin.on("end", () => process.exit(0));
