import { NextRequest, NextResponse } from "next/server";
import { ensureOracle, injectIncident } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  ensureOracle();
  const body = await req.json().catch(() => null);
  const service = typeof body?.service === "string" ? body.service : "";
  const result = injectIncident(service);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
