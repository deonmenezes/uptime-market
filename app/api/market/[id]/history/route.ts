import { NextRequest, NextResponse } from "next/server";
import { getState } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await ensureOracle();
  const { id } = await ctx.params;
  const s = getState();
  const m = s.markets.get(id);
  if (!m) return NextResponse.json({ error: "unknown market" }, { status: 404 });

  return NextResponse.json({
    prices: s.priceHistory.get(id) ?? [],
    readings: s.oracleChain.filter((r) => r.service === m.service).slice(0, 150),
  });
}
