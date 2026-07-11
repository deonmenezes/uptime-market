"use client";

import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
} from "@solana/web3.js";

interface PhantomProvider {
  isPhantom?: boolean;
  publicKey: PublicKey | null;
  connect: () => Promise<{ publicKey: PublicKey }>;
  signAndSendTransaction: (tx: Transaction) => Promise<{ signature: string }>;
}

export function getPhantom(): PhantomProvider | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    phantom?: { solana?: PhantomProvider };
    solana?: PhantomProvider;
  };
  const provider = w.phantom?.solana ?? w.solana;
  return provider?.isPhantom ? provider : null;
}

const connection = () => new Connection(clusterApiUrl("devnet"), "confirmed");

export async function connectWallet(): Promise<string> {
  const provider = getPhantom();
  if (!provider) throw new Error("Phantom wallet not found. Install it from phantom.app.");
  const { publicKey } = await provider.connect();
  return publicKey.toBase58();
}

// Sends devnet SOL to the treasury and returns the confirmed signature.
export async function depositSol(treasury: string, sol: number): Promise<string> {
  const provider = getPhantom();
  if (!provider) throw new Error("Phantom wallet not found. Install it from phantom.app.");
  const { publicKey } = await provider.connect();

  const conn = connection();
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: publicKey,
      toPubkey: new PublicKey(treasury),
      lamports: Math.round(sol * 1e9),
    })
  );
  tx.feePayer = publicKey;
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;

  const { signature } = await provider.signAndSendTransaction(tx);
  await conn.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  return signature;
}

// Devnet faucet for the connected wallet, so judges can try the flow with zero setup.
export async function requestAirdrop(): Promise<string> {
  const provider = getPhantom();
  if (!provider) throw new Error("Phantom wallet not found.");
  const { publicKey } = await provider.connect();
  const conn = connection();
  const sig = await conn.requestAirdrop(publicKey, 1e9); // 1 SOL
  await conn.confirmTransaction(sig, "confirmed");
  return sig;
}
