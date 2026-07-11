import { NextRequest, NextResponse } from "next/server";
import { getState, settleMarket } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";
import type { Side } from "@/lib/market/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = await req.json().catch(() => null);
  const marketId = typeof body?.marketId === "string" ? body.marketId : "";
  const outcome = body?.outcome as Side;

  const s = getState();
  const m = s.markets.get(marketId);
  if (!m) return NextResponse.json({ error: "unknown market" }, { status: 400 });
  if (m.status !== "open") return NextResponse.json({ error: "already settled" }, { status: 400 });
  if (outcome !== "YES" && outcome !== "NO") {
    return NextResponse.json({ error: "outcome must be YES or NO" }, { status: 400 });
  }

  settleMarket(s, marketId, outcome, "manual settlement by admin");
  return NextResponse.json({ ok: true });
}
