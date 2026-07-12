import { NextRequest, NextResponse } from "next/server";
import { ensureOracle, injectIncident, injectSimulatedOutage } from "@/lib/server/oracle";
import { SIM_OUTAGE_MARKETS } from "@/lib/server/state";

export const dynamic = "force-dynamic";

// Demo-only: inject a simulated outage so the settlement moment is guaranteed
// on stage. service "checkout-service" (default), or any full-arc service in
// SIM_OUTAGE_MARKETS ("netflix-cdn", "anthropic-api"): globe alert, repricing,
// settlement, payout, Twilio voice call.
export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = (await req.json().catch(() => null)) as { service?: string } | null;
  const service = body?.service;
  if (service && service in SIM_OUTAGE_MARKETS) {
    const result = injectSimulatedOutage(service);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, service });
  }
  if (service && service !== "checkout-service") {
    return NextResponse.json({ error: `unknown simulatable service ${service}` }, { status: 400 });
  }
  injectIncident();
  return NextResponse.json({ ok: true, service: "checkout-service" });
}
