import { NextResponse } from "next/server";
import { ensureOracle, injectIncident } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

// Demo-only: inject an outage into the simulated checkout-service so the
// settlement moment is guaranteed on stage.
export async function POST() {
  await ensureOracle();
  injectIncident();
  return NextResponse.json({ ok: true });
}
