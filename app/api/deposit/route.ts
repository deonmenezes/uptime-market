import { NextRequest, NextResponse } from "next/server";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import { CONFIG, getOrCreateUser, getState, pushEvent } from "@/lib/server/state";
import { ensureOracle } from "@/lib/server/oracle";

export const dynamic = "force-dynamic";

// Verifies a devnet SOL transfer to the treasury and credits the account.
// The client sends the tx signature after Phantom confirms it; the server
// independently reads the transaction from the chain, so a made-up signature
// or a transfer to a different address credits nothing.
export async function POST(req: NextRequest) {
  await ensureOracle();
  const body = await req.json().catch(() => null);
  const user = typeof body?.user === "string" ? body.user.trim().slice(0, 24) : "";
  const signature = typeof body?.signature === "string" ? body.signature.trim() : "";
  if (!user || !signature) {
    return NextResponse.json({ error: "user and signature required" }, { status: 400 });
  }

  const s = getState();
  const account = getOrCreateUser(s, user);
  if (account.usedSignatures.includes(signature)) {
    return NextResponse.json({ error: "signature already credited" }, { status: 400 });
  }

  try {
    const conn = new Connection(clusterApiUrl("devnet"), "confirmed");
    const tx = await conn.getParsedTransaction(signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (!tx || tx.meta?.err) {
      return NextResponse.json({ error: "transaction not found or failed" }, { status: 400 });
    }

    let lamports = 0;
    for (const ix of tx.transaction.message.instructions) {
      if ("parsed" in ix && ix.parsed?.type === "transfer") {
        const info = ix.parsed.info as { destination?: string; lamports?: number; source?: string };
        if (info.destination === CONFIG.treasury && typeof info.lamports === "number") {
          lamports += info.lamports;
        }
      }
    }
    if (lamports <= 0) {
      return NextResponse.json({ error: "no transfer to treasury found in transaction" }, { status: 400 });
    }

    const sol = lamports / 1e9;
    const usd = Math.floor(sol * CONFIG.usdPerSol);
    account.balanceUsd += usd;
    account.usedSignatures.push(signature);
    pushEvent(s, "deposit", `${user} deposited ${sol.toFixed(4)} SOL → $${usd.toLocaleString()} (devnet)`);

    return NextResponse.json({ ok: true, usd, newBalance: account.balanceUsd });
  } catch {
    return NextResponse.json({ error: "could not verify transaction on devnet RPC" }, { status: 502 });
  }
}
