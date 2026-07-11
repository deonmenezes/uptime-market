import { NextRequest, NextResponse } from "next/server";
import { getOrCreateUser, getState } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  ensureOracle();
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length < 2) {
    return NextResponse.json({ error: "name must be at least 2 characters" }, { status: 400 });
  }
  const u = getOrCreateUser(getState(), name);
  return NextResponse.json({ name: u.name, credits: u.credits, positions: u.positions });
}
