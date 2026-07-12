"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Side, StateSnapshot } from "@/lib/market/types";

const POLL_MS = 2000;
const NAME_KEY = "cumulus_name";
const MODE_KEY = "cumulus_mode";

export type ViewMode = "hedger" | "trader";

export interface FlashInfo {
  dir: "up" | "down";
  at: number;
}

export function useStore() {
  const [snap, setSnap] = useState<StateSnapshot | null>(null);
  const [name, setNameState] = useState<string | null>(null);
  const [mode, setModeState] = useState<ViewMode>("hedger");
  const [flashes, setFlashes] = useState<Record<string, FlashInfo>>({});
  const prevPrices = useRef<Record<string, number>>({});
  const nameRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) {
      nameRef.current = stored;
      setNameState(stored);
    }
    const storedMode = localStorage.getItem(MODE_KEY);
    if (storedMode === "trader" || storedMode === "hedger") setModeState(storedMode);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const q = nameRef.current ? `?user=${encodeURIComponent(nameRef.current)}` : "";
      const res = await fetch(`/api/state${q}`, { cache: "no-store" });
      if (!res.ok) return;
      const data: StateSnapshot = await res.json();

      const next: Record<string, FlashInfo> = {};
      for (const m of data.markets) {
        const prev = prevPrices.current[m.id];
        if (prev !== undefined && Math.abs(m.price - prev) > 0.0005) {
          next[m.id] = { dir: m.price > prev ? "up" : "down", at: Date.now() };
        }
        prevPrices.current[m.id] = m.price;
      }
      if (Object.keys(next).length) setFlashes((f) => ({ ...f, ...next }));
      setSnap(data);
    } catch {
      // transient network failure: keep last snapshot, next poll retries
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const setMode = useCallback((m: ViewMode) => {
    localStorage.setItem(MODE_KEY, m);
    setModeState(m);
  }, []);

  const setName = useCallback(
    async (n: string) => {
      const trimmed = n.trim().slice(0, 24);
      if (trimmed.length < 2) return;
      await fetch("/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      localStorage.setItem(NAME_KEY, trimmed);
      nameRef.current = trimmed;
      setNameState(trimmed);
      refresh();
    },
    [refresh]
  );

  const trade = useCallback(
    async (marketId: string, side: Side, action: "buy" | "sell", amount: number) => {
      if (!nameRef.current) throw new Error("set a name first");
      const res = await fetch("/api/trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: nameRef.current, marketId, side, action, amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "trade failed");
      await refresh();
      return data;
    },
    [refresh]
  );

  const hedge = useCallback(
    async (marketId: string, coverage: number) => {
      if (!nameRef.current) throw new Error("set a name first");
      const res = await fetch("/api/hedge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: nameRef.current, marketId, coverage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "hedge failed");
      await refresh();
      return data as { coverage: number; premium: number; rate: number; priceAfter: number };
    },
    [refresh]
  );

  const injectIncident = useCallback(
    async (service?: string) => {
      const res = await fetch("/api/admin/incident", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(service ? { service } : {}),
      });
      const data = await res.json().catch(() => null);
      await refresh();
      if (!res.ok) throw new Error(data?.error ?? "incident injection failed");
    },
    [refresh]
  );

  const settle = useCallback(
    async (marketId: string, outcome: Side) => {
      await fetch("/api/admin/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, outcome }),
      });
      await refresh();
    },
    [refresh]
  );

  const creditDeposit = useCallback(
    async (signature: string) => {
      if (!nameRef.current) throw new Error("set a name first");
      const res = await fetch("/api/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: nameRef.current, signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "deposit verification failed");
      await refresh();
      return data as { usd: number; newBalance: number };
    },
    [refresh]
  );

  return {
    snap,
    name,
    setName,
    mode,
    setMode,
    trade,
    hedge,
    injectIncident,
    settle,
    creditDeposit,
    flashes,
    refresh,
  };
}
