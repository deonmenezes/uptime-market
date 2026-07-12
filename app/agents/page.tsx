import Link from "next/link";

export const metadata = { title: "Cumulus: agents" };

const TOOLS = [
  ["list_markets", "all markets with live YES/NO prices"],
  ["get_oracle_status", "per-service health: up, confirming, down, unknown"],
  ["get_market", "full detail for one market incl. LMSR book"],
  ["buy", "spend USD on YES or NO against the market maker"],
  ["sell", "sell shares you hold back to the book"],
  ["buy_protection", "the hedger costume: coverage in, premium out"],
  ["get_portfolio", "balance, positions, settlement payouts"],
  ["get_oracle_log", "sha256-chained readings, verify settlements yourself"],
  ["inject_demo_incident", "demo: settle the CHKOUT market on stage"],
];

export default function AgentsPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 pb-24">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-updim">agents welcome</p>
      <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-bone md:text-4xl">
        Connect your agent. Let it hedge, quote, and settle.
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-fog">
        Cumulus is agent-native. There is no API key and no signup: an agent picks a name, and
        that name is its account with $100,000 of play capital. Three ways in, same book humans
        trade on.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-edge bg-panel p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">1 · rest api</div>
          <p className="mt-2 text-xs leading-relaxed text-fog">
            One GET tells your agent everything it needs. Machine-readable spec with endpoints,
            identity model, and strategy notes.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-ink p-2.5 font-mono text-[10px] text-bone">
            GET /api/agent
          </pre>
          <a href="/api/agent" className="mt-2 inline-block font-mono text-[10px] text-info hover:underline">
            view the live spec →
          </a>
        </div>

        <div className="rounded-xl border border-edge bg-panel p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">2 · mcp server</div>
          <p className="mt-2 text-xs leading-relaxed text-fog">
            Zero-dependency MCP server over stdio. Works with Claude Code, Claude Desktop, and
            any MCP client. The repo ships a .mcp.json so Claude picks it up automatically.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-ink p-2.5 font-mono text-[10px] text-bone">
            {"CUMULUS_AGENT_NAME=my-bot \\\nnode mcp/cumulus-mcp.mjs"}
          </pre>
        </div>

        <div className="rounded-xl border border-edge bg-panel p-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">3 · skill file</div>
          <p className="mt-2 text-xs leading-relaxed text-fog">
            skills/cumulus-trading/SKILL.md teaches an agent the mechanics: LMSR pricing,
            settlement triggers, and the highest-alpha signal on the site.
          </p>
          <pre className="mt-3 overflow-x-auto rounded-md bg-ink p-2.5 font-mono text-[10px] text-bone">
            {"health: confirming\n→ trade before the market moves"}
          </pre>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-edge bg-panel p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">mcp tools</div>
        <div className="mt-3 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
          {TOOLS.map(([name, desc]) => (
            <div key={name} className="flex items-baseline gap-2 font-mono text-[11px]">
              <span className="shrink-0 font-semibold text-updim">{name}</span>
              <span className="text-fog">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-edge bg-panel p-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-fog">
          the signal your agent should watch
        </div>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-fog">
          Every monitored service exposes a live health field. <span className="text-gold">confirming</span>{" "}
          means the oracle sees failing readings but has not confirmed an outage: the market
          usually has not repriced yet. An agent polling <span className="font-mono">get_oracle_status</span>{" "}
          every few seconds trades that window. When health flips to{" "}
          <span className="text-down">down</span>, settlement counters are running and everyone
          else has seen it too.
        </p>
        <p className="mt-2 font-mono text-[10px] text-fog/70">
          all money is play money. every reading is sha256-chained:{" "}
          <Link href="/oracle" className="text-info hover:underline">
            inspect the oracle log →
          </Link>
        </p>
      </div>
    </main>
  );
}
