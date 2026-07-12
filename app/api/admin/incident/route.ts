import { NextRequest, NextResponse } from "next/server";
import { ensureOracle, injectIncident, injectSimulatedOutage } from "@/lib/server/oracle";
import { getState, pushEvent, settleMarket, SIM_OUTAGE_MARKETS } from "@/lib/server/state";
import { fireDowntimeVoiceAlert } from "@/lib/server/notify";

export const dynamic = "force-dynamic";

// Demo-only: inject a simulated outage so the settlement moment is guaranteed
// on stage. service "checkout-service" (default), or any full-arc service in
// SIM_OUTAGE_MARKETS ("netflix-cdn", "anthropic-api"): globe alert, repricing,
// settlement, payout, and a Twilio voice call. The call is deliberate and
// immediate so a live demo verifies the configured phone rail in one click.
export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = (await req.json().catch(() => null)) as { service?: string } | null;
  const service = body?.service;
  const s = getState();
  if (service && service in SIM_OUTAGE_MARKETS) {
    const result = injectSimulatedOutage(service);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    const market = s.markets.get(SIM_OUTAGE_MARKETS[service]);
    if (!market) return NextResponse.json({ error: "market unavailable" }, { status: 500 });
    const note = `simulated outage injected on ${service}; immediate voice-alert verification`;
    settleMarket(s, market.id, "YES", note);
    const call = await fireDowntimeVoiceAlert(s, market.question, note);
    if (!call.ok) return NextResponse.json({ error: `Twilio call failed: ${call.detail}` }, { status: 502 });
    return NextResponse.json({ ok: true, service, voiceAlert: "dispatched" });
  }
  if (service && service !== "checkout-service") {
    return NextResponse.json({ error: `unknown simulatable service ${service}` }, { status: 400 });
  }
  injectIncident();
  const market = s.markets.get("demo-checkout");
  if (!market) return NextResponse.json({ error: "market unavailable" }, { status: 500 });
  const note = "simulated outage injected on checkout-service; immediate voice-alert verification";
  settleMarket(s, market.id, "YES", note);
  pushEvent(s, "incident", "checkout-service simulated outage settled immediately for voice-alert verification");
  const call = await fireDowntimeVoiceAlert(s, market.question, note);
  if (!call.ok) return NextResponse.json({ error: `Twilio call failed: ${call.detail}` }, { status: 502 });
  return NextResponse.json({ ok: true, service: "checkout-service", voiceAlert: "dispatched" });
}
