"use client";

import { useEffect, useSyncExternalStore } from "react";
import { engine } from "./engine";

// Re-renders the caller on every engine tick; read data straight off `engine`.
export function useEngine() {
  useSyncExternalStore(engine.subscribe, engine.getVersion, engine.getVersion);
  useEffect(() => {
    engine.start();
  }, []);
  return engine;
}

// Ticks once a second for relative timestamps; null until mounted (SSR-safe).
import { useState } from "react";

export function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}
