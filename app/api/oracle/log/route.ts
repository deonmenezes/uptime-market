import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { getState } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

// Tamper-evident settlement history: each reading is hashed with its
// predecessor's hash. Anyone can re-verify the chain from this endpoint.
export function GET() {
  ensureOracle();
  const s = getState();

  // verify newest -> oldest (chain is stored newest-first)
  let verified = true;
  for (let i = 0; i < s.oracleChain.length; i++) {
    const r = s.oracleChain[i];
    const { hash, prevHash, ...payload } = r;
    const expected = createHash("sha256")
      .update(JSON.stringify({ ...payload, prevHash }))
      .digest("hex");
    if (expected !== hash) {
      verified = false;
      break;
    }
    const older = s.oracleChain[i + 1];
    if (older && prevHash !== older.hash) {
      verified = false;
      break;
    }
  }

  return NextResponse.json({
    verified,
    length: s.oracleChain.length,
    readings: s.oracleChain.slice(0, 120),
  });
}
