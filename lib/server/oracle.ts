// The oracle: a telemetry simulator plus a settlement evaluator.
// This file is deliberately the ONLY thing that knows where readings come from.
// Swap `readService` for a Datadog/AWS-status/PagerDuty fetch and nothing else changes.

import type { TelemetryReading } from "@/lib/market/types";
import { AppState, CONFIG, SERVICES, executeTrade, getState, pushEvent, settleMarket } from "./state";
import { priceYes } from "@/lib/market/lmsr";

interface ServiceProfile {
  baseErr: number;
  baseP99: number;
}

const PROFILES: Record<string, ServiceProfile> = {
  "checkout-service": { baseErr: 0.4, baseP99: 180 },
  "payments-db": { baseErr: 0.2, baseP99: 95 },
  "api-gateway": { baseErr: 0.6, baseP99: 210 },
};

// ---- reading generation (the swappable part) ----

function readService(s: AppState, service: string): TelemetryReading {
  const prof = PROFILES[service];
  const incidentTicks = s.activeIncidents.get(service) ?? 0;
  const incident = incidentTicks > 0;

  const errorRatePct = incident
    ? 8 + Math.random() * 18
    : Math.max(0.05, prof.baseErr + (Math.random() - 0.5) * 0.3);
  const p99Ms = incident
    ? prof.baseP99 * (4 + Math.random() * 6)
    : prof.baseP99 + (Math.random() - 0.5) * 40;
  const healthy = !incident && errorRatePct < 2;

  const downtime = s.downtimeTicks.get(service) ?? 0;
  const history = s.telemetry.get(service) ?? [];
  const totalTicks = history.length + 1;
  const uptimePct = (1 - downtime / Math.max(totalTicks, 1)) * 100;

  return {
    ts: Date.now(),
    service,
    uptimePct: Math.max(90, uptimePct),
    errorRatePct: Math.round(errorRatePct * 100) / 100,
    p99Ms: Math.round(p99Ms),
    healthy,
    incident,
  };
}

// ---- incident injection (the admin/demo button) ----

export function injectIncident(service: string): { ok: boolean; error?: string } {
  const s = getState();
  if (!SERVICES.includes(service as (typeof SERVICES)[number])) {
    return { ok: false, error: `unknown service: ${service}` };
  }
  const durationTicks = 10 + Math.floor(Math.random() * 6);
  s.activeIncidents.set(service, durationTicks);
  s.sev1Count += 1;
  pushEvent(
    s,
    "incident",
    `SEV-1 #${s.sev1Count} declared on ${service}: error rate spiking, p99 degrading`,
    undefined
  );
  return { ok: true };
}

// ---- settlement evaluation ----

function evaluateSettlements(s: AppState) {
  const slo = s.markets.get("slo-checkout");
  if (slo?.status === "open") {
    const downtime = s.downtimeTicks.get("checkout-service") ?? 0;
    if (downtime > CONFIG.sloDowntimeBudgetTicks) {
      settleMarket(
        s,
        "slo-checkout",
        "NO",
        `error budget exhausted (${downtime} unhealthy readings > ${CONFIG.sloDowntimeBudgetTicks} budget)`
      );
    }
  }

  const sev = s.markets.get("sev1-cap");
  if (sev?.status === "open" && s.sev1Count > CONFIG.sev1Limit) {
    settleMarket(s, "sev1-cap", "NO", `Sev-1 count hit ${s.sev1Count} (limit ${CONFIG.sev1Limit})`);
  }

  const lat = s.markets.get("gw-latency");
  if (lat?.status === "open" && s.latencyStreak >= CONFIG.latencyBreachStreak) {
    settleMarket(
      s,
      "gw-latency",
      "NO",
      `p99 above 300ms for ${s.latencyStreak} consecutive readings`
    );
  }
}

// ---- light bot flow so prices drift and the tape stays alive ----

function botStep(s: AppState) {
  if (Math.random() > 0.4) return;
  const bots = [...s.users.values()].filter((u) => u.isBot && u.credits > 25);
  if (!bots.length) return;
  const bot = bots[Math.floor(Math.random() * bots.length)];
  const open = [...s.markets.values()].filter((m) => m.status === "open");
  if (!open.length) return;
  const m = open[Math.floor(Math.random() * open.length)];

  // bots read the room: during an incident on a market's service they buy NO
  const affected =
    (s.activeIncidents.get(m.service) ?? 0) > 0 ||
    (m.id === "sev1-cap" && s.sev1Count > 0);
  const side = affected ? "NO" : Math.random() > 0.45 ? "YES" : "NO";
  const spend = 5 + Math.random() * (affected ? 60 : 25);
  executeTrade(s, bot.name, m.id, side, "buy", spend);
}

// ---- the loop ----

function tick() {
  const s = getState();

  for (const service of SERVICES) {
    const reading = readService(s, service);
    const arr = s.telemetry.get(service)!;
    arr.push(reading);
    if (arr.length > 600) arr.shift();

    if (!reading.healthy) {
      s.downtimeTicks.set(service, (s.downtimeTicks.get(service) ?? 0) + 1);
    }
    if (service === "api-gateway") {
      s.latencyStreak = reading.p99Ms > 300 ? s.latencyStreak + 1 : 0;
    }
    const remaining = s.activeIncidents.get(service) ?? 0;
    if (remaining > 0) {
      s.activeIncidents.set(service, remaining - 1);
      if (remaining - 1 === 0) {
        pushEvent(s, "incident", `${service} recovered; incident resolved`);
      }
    }
  }

  // append a history point per tick so charts move even without trades
  for (const m of s.markets.values()) {
    if (m.status !== "open") continue;
    const hist = s.priceHistory.get(m.id)!;
    hist.push({ ts: Date.now(), p: priceYes(m.qYes, m.qNo, m.b) });
    if (hist.length > 2500) hist.shift();
  }

  botStep(s);
  evaluateSettlements(s);
}

// Start exactly one loop per process, surviving dev HMR. On serverless
// (Vercel), the interval only runs while the instance is warm, so ensureOracle
// also runs catch-up ticks for any gap since the last one: every API request
// advances the simulation to "now" before answering.
const g = globalThis as unknown as {
  __uptimeOracleTimer?: ReturnType<typeof setInterval>;
  __uptimeLastTick?: number;
};

function tickTracked() {
  tick();
  g.__uptimeLastTick = Date.now();
}

export function ensureOracle() {
  const s = getState();
  if (!g.__uptimeOracleTimer) {
    g.__uptimeOracleTimer = setInterval(tickTracked, CONFIG.tickMs);
    g.__uptimeLastTick = Date.now();
    s.loopStarted = true;
    pushEvent(s, "system", "telemetry oracle online: reading services every 2s");
    return;
  }
  const gap = Date.now() - (g.__uptimeLastTick ?? Date.now());
  const missed = Math.min(30, Math.floor(gap / CONFIG.tickMs));
  for (let i = 0; i < missed; i++) tickTracked();
}
