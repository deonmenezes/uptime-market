"use client";

import { useEffect } from "react";

type ModelContextNavigator = Navigator & {
  modelContext?: {
    provideContext: (context: {
      tools: Array<{
        name: string;
        description: string;
        inputSchema: Record<string, unknown>;
        execute: (input: Record<string, unknown>) => Promise<unknown>;
      }>;
    }) => void;
  };
};

export default function WebMcp() {
  useEffect(() => {
    const modelContext = (navigator as ModelContextNavigator).modelContext;
    if (!modelContext?.provideContext) return;

    modelContext.provideContext({
      tools: [
        {
          name: "get_cumulus_market_state",
          description: "Get live Cumulus downtime markets, prices, monitor health, and recent oracle events.",
          inputSchema: { type: "object", properties: {} },
          execute: async () => {
            const response = await fetch("/api/state", { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error(`Cumulus state request failed: ${response.status}`);
            return response.json();
          },
        },
        {
          name: "get_cumulus_agent_api",
          description: "Get the Cumulus API schema before placing a play-money trade.",
          inputSchema: { type: "object", properties: {} },
          execute: async () => {
            const response = await fetch("/api/agent", { headers: { Accept: "application/json" } });
            if (!response.ok) throw new Error(`Cumulus API request failed: ${response.status}`);
            return response.json();
          },
        },
      ],
    });
  }, []);

  return null;
}
