"use client";

import { useState } from "react";
import { useMarketStore } from "./StoreContext";
import { connectWallet, depositSol, requestAirdrop } from "@/lib/client/phantom";

const AMOUNTS = [0.01, 0.05, 0.1];

// Real crypto flow, devnet: Phantom signs a SOL transfer to the treasury,
// the server independently verifies the tx on-chain and credits the account.
export default function DepositModal({ onClose }: { onClose: () => void }) {
  const { snap, name, creditDeposit } = useMarketStore();
  const [wallet, setWallet] = useState<string | null>(null);
  const [amount, setAmount] = useState(0.05);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rate = snap?.creditsPerSol ?? 10_000;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  const connect = () =>
    run(async () => {
      const pk = await connectWallet();
      setWallet(pk);
      setStatus("wallet connected");
    });

  const airdrop = () =>
    run(async () => {
      setStatus("requesting 1 devnet SOL from the faucet…");
      await requestAirdrop();
      setStatus("airdrop landed — you have devnet SOL");
    });

  const deposit = () =>
    run(async () => {
      if (!snap) return;
      setStatus(`sending ${amount} SOL on devnet — approve in Phantom…`);
      const signature = await depositSol(snap.treasury, amount);
      setStatus("confirmed on-chain — verifying server-side…");
      const res = await creditDeposit(signature);
      setStatus(`credited ${res.credits} credits. balance: ${Math.round(res.newBalance)}`);
    });

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/85 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md animate-pop-in rounded-md border border-edge2 bg-panel p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-bone">Deposit SOL → credits</h2>
            <p className="mt-1 font-mono text-[11px] text-fog">
              solana devnet · 1 SOL = {rate.toLocaleString()} credits
            </p>
          </div>
          <button onClick={onClose} className="font-mono text-fog hover:text-bone">✕</button>
        </div>

        {!name && (
          <p className="mt-4 rounded-sm border border-gold/40 bg-gold/10 p-3 font-mono text-xs text-gold">
            pick a handle on the board first, then deposit
          </p>
        )}

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-sm border border-edge bg-ink px-3 py-2.5">
            <span className="font-mono text-xs text-fog">1 · wallet</span>
            {wallet ? (
              <span className="font-mono text-xs text-up">{wallet.slice(0, 4)}…{wallet.slice(-4)}</span>
            ) : (
              <button
                onClick={connect}
                disabled={busy}
                className="rounded-sm border border-up/60 px-2.5 py-1 font-mono text-[11px] uppercase text-up hover:bg-up/10 disabled:opacity-40"
              >
                connect phantom
              </button>
            )}
          </div>

          <div className="flex items-center justify-between rounded-sm border border-edge bg-ink px-3 py-2.5">
            <span className="font-mono text-xs text-fog">2 · need test SOL?</span>
            <button
              onClick={airdrop}
              disabled={busy || !wallet}
              className="rounded-sm border border-info/60 px-2.5 py-1 font-mono text-[11px] uppercase text-info hover:bg-info/10 disabled:opacity-40"
            >
              airdrop 1 devnet sol
            </button>
          </div>

          <div className="rounded-sm border border-edge bg-ink px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-fog">3 · amount</span>
              <div className="flex gap-1">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(a)}
                    className={[
                      "rounded-sm border px-2 py-1 font-mono text-[11px]",
                      amount === a ? "border-up text-up" : "border-edge text-fog hover:text-bone",
                    ].join(" ")}
                  >
                    {a} ◎
                  </button>
                ))}
              </div>
            </div>
            <p className="tabular mt-1.5 text-right font-mono text-[11px] text-fog">
              = {Math.floor(amount * rate).toLocaleString()} credits
            </p>
          </div>

          <button
            onClick={deposit}
            disabled={busy || !wallet || !name}
            className="w-full rounded-sm bg-up py-2.5 font-mono text-sm font-bold uppercase tracking-widest text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "working…" : `deposit ${amount} sol`}
          </button>

          {status && <p className="font-mono text-[11px] leading-relaxed text-up">{status}</p>}
          {error && <p className="font-mono text-[11px] leading-relaxed text-down">{error}</p>}

          <p className="font-mono text-[10px] leading-relaxed text-fog/60">
            devnet only — no real funds. server verifies the transaction on-chain before crediting;
            treasury: {snap?.treasury.slice(0, 8)}…
          </p>
        </div>
      </div>
    </div>
  );
}
