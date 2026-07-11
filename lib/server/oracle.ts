// The oracle: real signal collection + settlement evaluation + the demo simulator.
// Two cadences: a 2s sim tick (demo service, bots, price history) and a 15s real
// tick (synthetic monitors + public status feeds). Every reading is hashed into
// an append-only chain (see appendReading) — tamper-evident settlement history.

import { AppState, CONFIG, appendReading, executeTrade, getState, pushEvent, settleMarket } from "./state";
import { collectSignals } from "./feeds";
import { priceYes } from "@/lib/market/lmsr";

// ---- demo simulator (the stage safety net) ----

export function injectIncident(): { ok: boolean } {
  const s = getState();
  s.simIncidentTicks = 14 + Math.floor(Math.random() * 6);
  pushEvent(s, "incident", "SEV-1 injected on checkout-service: error rate spiking (simulated)");
  return { ok: true };
}

function simTick(s: AppState) {
  const incident = s.simIncidentTicks > 0;
  if (incident) s.simIncidentTicks -= 1;
  const errorRate = incident ? 12 + Math.random() * 20 : Math.max(0.05, 0.4 + (Math.random() - 0.5) * 0.3);
  const latency = incident ? 900 + Math.random() * 1200 : 160 + (Math.random() - 0.5) * 40;
  const ok = !incident;

  s.simConsecutiveDown = ok ? 0 : s.simConsecutiveDown + 1;

  appendReading(s, {
    ts: Date.now(),
    source: "sim:checkout-service",
    service: "checkout-service",
    ok,
    latencyMs: Math.round(latency),
    indicator: incident ? "incident" : "nominal",
    summary: `checkout-service err=${errorRate.toFixed(2)}% p99=${Math.round(latency)}ms${incident ? " [injected incident]" : ""}`,
  });

  if (incident && s.simIncidentTicks === 0) {
    pushEvent(s, "incident", "checkout-service recovered; simulated incident resolved");
  }

  const demo = s.markets.get("demo-checkout");
  if (demo?.status === "open" && s.simConsecutiveDown >= CONFIG.simBreachTicks) {
    settleMarket(
      s,
      "demo-checkout",
      "YES",
      `oracle observed ${s.simConsecutiveDown} consecutive failing readings (threshold ${CONFIG.simBreachTicks})`
    );
  }
}

// ---- real signals ----

async function realTick(s: AppState) {
  const signals = await collectSignals();
  for (const sig of signals) {
    appendReading(s, {
      ts: Date.now(),
      source: sig.source,
      service: sig.service,
      ok: sig.ok,
      latencyMs: sig.latencyMs,
      indicator: sig.known ? sig.indicator : "feed-unreachable",
      summary: sig.summary,
    });
    if (!sig.known) continue; // unreachable feed never settles anything
    if (sig.ok) {
      s.consecFails.set(sig.service, 0);
      s.upReadings.set(sig.service, (s.upReadings.get(sig.service) ?? 0) + 1);
    } else {
      // Debounce: a lone failing reading (already retried once inside the
      // monitor) counts as neither up nor down — it's as likely our own
      // egress as a real outage. Once the streak reaches the confirmation
      // threshold, credit the full streak so cumulative-downtime accounting
      // stays accurate for real outages, which persist across ticks.
      const fails = (s.consecFails.get(sig.service) ?? 0) + 1;
      s.consecFails.set(sig.service, fails);
      if (fails === CONFIG.monitorConfirmFails) {
        s.downReadings.set(sig.service, (s.downReadings.get(sig.service) ?? 0) + fails);
        pushEvent(
          s,
          "incident",
          `oracle: degradation confirmed on ${sig.service} — ${fails} consecutive failing readings (${sig.summary})`
        );
      } else if (fails > CONFIG.monitorConfirmFails) {
        s.downReadings.set(sig.service, (s.downReadings.get(sig.service) ?? 0) + 1);
      }
    }
  }
  evaluateRealSettlements(s);
}

function evaluateRealSettlements(s: AppState) {
  // AWS us-east-1: any active health event touching the region
  const aws = s.markets.get("aws-use1");
  const awsLast = s.lastByService.get("aws-us-east-1");
  if (aws?.status === "open" && awsLast && awsLast.indicator !== "feed-unreachable" && !awsLast.ok) {
    settleMarket(s, "aws-use1", "YES", `AWS Health feed shows an active us-east-1 event (reading ${awsLast.hash.slice(0, 12)})`);
  }

  // Cloudflare: major/critical indicator on the public status page
  const cf = s.markets.get("cf-incident");
  const cfLast = s.lastByService.get("cloudflare-net");
  if (cf?.status === "open" && cfLast && cfLast.indicator !== "feed-unreachable" && !cfLast.ok) {
    settleMarket(s, "cf-incident", "YES", `cloudflarestatus.com reported ${cfLast.indicator} (reading ${cfLast.hash.slice(0, 12)})`);
  }

  // Stripe: cumulative failed monitor checks past 30 minutes
  const stripe = s.markets.get("stripe-30m");
  const stripeDown = s.downReadings.get("stripe-api") ?? 0;
  if (stripe?.status === "open" && stripeDown >= CONFIG.stripeDownReadings) {
    settleMarket(s, "stripe-30m", "YES", `synthetic monitor logged ${stripeDown} failed checks (≈${Math.round((stripeDown * CONFIG.realTickMs) / 60000)} min of downtime)`);
  }

  // OpenAI: measured weekly availability under the SLO
  const oai = s.markets.get("openai-slo");
  const up = s.upReadings.get("openai-api") ?? 0;
  const down = s.downReadings.get("openai-api") ?? 0;
  const total = up + down;
  if (oai?.status === "open" && total >= CONFIG.openaiMinReadings) {
    const availability = (up / total) * 100;
    if (availability < CONFIG.openaiSloPct) {
      settleMarket(s, "openai-slo", "YES", `measured availability ${availability.toFixed(2)}% over ${total} readings (SLO ${CONFIG.openaiSloPct}%)`);
    }
  }
}

// ---- market-maker bots: LPs quote both sides, lean on the signal ----

function botStep(s: AppState) {
  if (Math.random() > 0.5) return;
  const bots = [...s.users.values()].filter((u) => u.isBot && u.balanceUsd > 10_000);
  if (!bots.length) return;
  const bot = bots[Math.floor(Math.random() * bots.length)];
  const open = [...s.markets.values()].filter((m) => m.status === "open");
  if (!open.length) return;
  const m = open[Math.floor(Math.random() * open.length)];

  const last = s.lastByService.get(m.service);
  const degraded = last ? !last.ok : false;
  // during degradation LPs rush to buy YES (hedge their books); otherwise they
  // mostly write protection, which keeps premiums competitive
  const side = degraded ? "YES" : Math.random() > 0.3 ? "NO" : "YES";
  const spend = degraded ? 8_000 + Math.random() * 25_000 : 500 + Math.random() * 4_000;
  executeTrade(s, bot.name, m.id, side, "buy", spend);
}

// ---- loops, serverless-safe ----

function tickSimTracked() {
  const s = getState();
  simTick(s);
  botStep(s);
  // append a history point so charts move between trades
  for (const m of s.markets.values()) {
    if (m.status !== "open") continue;
    const hist = s.priceHistory.get(m.id)!;
    hist.push({ ts: Date.now(), p: priceYes(m.qYes, m.qNo, m.b) });
    if (hist.length > 2500) hist.shift();
  }
  g.__cumulusLastSim = Date.now();
}

async function tickRealTracked() {
  const s = getState();
  g.__cumulusLastReal = Date.now(); // set before await so concurrent requests don't double-fire
  await realTick(s);
}

const g = globalThis as unknown as {
  __cumulusSimTimer?: ReturnType<typeof setInterval>;
  __cumulusRealTimer?: ReturnType<typeof setInterval>;
  __cumulusLastSim?: number;
  __cumulusLastReal?: number;
};

// Awaited from route handlers: on serverless, background timers freeze between
// requests, so any due work runs (and is awaited) in the request path instead.
// Only the request that finds a real tick due pays the fetch latency.
export async function ensureOracle() {
  const s = getState();
  if (!g.__cumulusSimTimer) {
    g.__cumulusSimTimer = setInterval(tickSimTracked, CONFIG.simTickMs);
    g.__cumulusRealTimer = setInterval(() => void tickRealTracked(), CONFIG.realTickMs);
    g.__cumulusLastSim = Date.now();
    pushEvent(s, "system", "oracle online: monitors every 15s, simulator every 2s, every reading sha256-chained");
    await tickRealTracked();
    return;
  }
  // serverless catch-up: intervals pause when the instance sleeps
  const simGap = Date.now() - (g.__cumulusLastSim ?? Date.now());
  const missedSim = Math.min(30, Math.floor(simGap / CONFIG.simTickMs));
  for (let i = 0; i < missedSim; i++) tickSimTracked();
  const realGap = Date.now() - (g.__cumulusLastReal ?? 0);
  if (realGap > CONFIG.realTickMs) await tickRealTracked();
}
