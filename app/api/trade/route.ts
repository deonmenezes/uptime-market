import { NextRequest, NextResponse } from "next/server";
import { executeTrade, getOrCreateUser, getState } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";
import type { Side } from "@/lib/market/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  ensureOracle();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { user, marketId, side, action, amount } = body as {
    user?: string;
    marketId?: string;
    side?: Side;
    action?: "buy" | "sell";
    amount?: number;
  };

  if (!user || !marketId || (side !== "YES" && side !== "NO") || (action !== "buy" && action !== "sell")) {
    return NextResponse.json({ error: "missing or invalid fields" }, { status: 400 });
  }

  const s = getState();
  getOrCreateUser(s, user);
  const result = executeTrade(s, user.trim().slice(0, 24), marketId, side, action, Number(amount));

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result.trade);
}
