"use client";

import { createContext, useContext } from "react";
import { useStore } from "@/lib/client/useStore";

type Store = ReturnType<typeof useStore>;

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useStore();
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useMarketStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useMarketStore must be used inside StoreProvider");
  return ctx;
}
