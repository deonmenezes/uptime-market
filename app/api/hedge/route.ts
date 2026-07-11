import { NextRequest, NextResponse } from "next/server";
import { executeHedge, getOrCreateUser, getState } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

// The hedger costume: { marketId, coverage } in, { premium, rate } out.
// Under the hood it is a YES-share purchase on the same LMSR book.
export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const { user, marketId, coverage } = body as { user?: string; marketId?: string; coverage?: number };
  if (!user || !marketId || typeof coverage !== "number") {
    return NextResponse.json({ error: "user, marketId and coverage required" }, { status: 400 });
  }

  const s = getState();
  getOrCreateUser(s, user);
  const result = executeHedge(s, user.trim().slice(0, 24), marketId, coverage);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({
    coverage,
    premium: Math.round(result.premium * 100) / 100,
    rate: result.rate,
    priceAfter: result.priceAfter,
  });
}
