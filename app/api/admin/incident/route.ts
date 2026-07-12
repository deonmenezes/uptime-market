import { NextRequest, NextResponse } from "next/server";
import { ensureOracle, injectIncident, injectSimulatedOutage } from "@/lib/server/oracle";
import { getState, SIM_OUTAGE_MARKETS } from "@/lib/server/state";

export const dynamic = "force-dynamic";

// Demo-only: inject a simulated outage so the settlement moment is guaranteed
// on stage. service "checkout-service" (default), or any full-arc service in
// SIM_OUTAGE_MARKETS ("netflix-cdn", "anthropic-api"). Injection only starts
// the outage: the oracle logs failing readings, and the sim tick settles the
// contract and places the Twilio voice call once the breach threshold is hit
// (~25s for the full-arc services, ~16s for checkout-service).
export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = (await req.json().catch(() => null)) as { service?: string } | null;
  const service = body?.service;
  const s = getState();
  if (service && service in SIM_OUTAGE_MARKETS) {
    const result = injectSimulatedOutage(service);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, service, voiceAlert: "fires at settlement" });
  }
  if (service && service !== "checkout-service") {
    return NextResponse.json({ error: `unknown simulatable service ${service}` }, { status: 400 });
  }
  const demo = s.markets.get("demo-checkout");
  if (demo?.status !== "open") return NextResponse.json({ error: "demo-checkout is not open" }, { status: 400 });
  injectIncident();
  return NextResponse.json({ ok: true, service: "checkout-service", voiceAlert: "fires at settlement" });
}
