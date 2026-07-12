import { NextRequest, NextResponse } from "next/server";
import { ensureOracle, injectIncident, injectNetflixOutage } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

// Demo-only: inject a simulated outage so the settlement moment is guaranteed
// on stage. service "checkout-service" (default) or "netflix-cdn" (the full
// demo arc: globe alert, repricing, settlement, payout, Twilio voice call).
export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = (await req.json().catch(() => null)) as { service?: string } | null;
  if (body?.service === "netflix-cdn") {
    const result = injectNetflixOutage();
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, service: "netflix-cdn" });
  }
  injectIncident();
  return NextResponse.json({ ok: true, service: "checkout-service" });
}
