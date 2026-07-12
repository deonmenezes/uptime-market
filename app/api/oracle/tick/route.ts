import { NextRequest, NextResponse } from "next/server";
import { ensureOracle } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await ensureOracle();
    return NextResponse.json({ ok: true, checkedAt: new Date().toISOString() });
  } catch (error) {
    console.error("scheduled oracle check failed", error);
    return NextResponse.json({ error: "oracle check failed" }, { status: 500 });
  }
}
