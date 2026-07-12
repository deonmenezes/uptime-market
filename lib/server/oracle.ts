// The oracle: real signal collection + settlement evaluation + the demo simulator.
// Two cadences: a 2s sim tick (demo service, bots, price history) and a 15s real
// tick (synthetic monitors + public status feeds). Every reading is hashed into
// an append-only chain (see appendReading) - tamper-evident settlement history.

import { AppState, CONFIG, SIM_OUTAGE_MARKETS, appendReading, executeTrade, getState, pushEvent, settleMarket } from "./state";
import { collectSignals } from "./feeds";
import { fireDowntimeVoiceAlert } from "./notify";
import { priceYes } from "@/lib/market/lmsr";

// ---- demo simulator (the stage safety net) ----

export function injectIncident(): { ok: boolean } {
  const s = getState();
  s.simIncidentTicks = 14 + Math.floor(Math.random() * 6);
  pushEvent(s, "incident", "SEV-1 injected on checkout-service: error rate spiking (simulated)");
  return { ok: true };
}

// The full demo arc, per simulatable service (Netflix, Claude): simulated
// failing readings on that monitor, time-compressed (2s cadence, settles
// after simOutageBreachTicks) so the whole story fits a stage demo: globe
// turns yellow then red, LPs reprice, the contract settles YES, holders are
// paid, and Twilio places the AI voice call.
export function injectSimulatedOutage(service: string): { ok: boolean; error?: string } {
  const s = getState();
  const marketId = SIM_OUTAGE_MARKETS[service];
  if (!marketId) return { ok: false, error: `no simulation available for ${service}` };
  const m = s.markets.get(marketId);
  if (!m || m.status !== "open") return { ok: false, error: `${m?.ticker ?? marketId} is not open` };
  if ((s.simOutages.get(service)?.ticksLeft ?? 0) > 0) return { ok: false, error: "simulation already running" };
  s.simOutages.set(service, { ticksLeft: CONFIG.simOutageBreachTicks + 4, down: 0 });
  pushEvent(s, "incident", `SEV-1 injected on ${service}: simulated outage, time-compressed for demo`);
  return { ok: true };
}

async function simOutageTick(s: AppState, ts: number) {
  for (const [service, sim] of s.simOutages) {
    if (sim.ticksLeft <= 0) continue;
    sim.ticksLeft -= 1;
    sim.down += 1;

    appendReading(s, {
      ts,
      source: `sim:${service}`,
      service,
      ok: false,
      latencyMs: null,
      indicator: "simulated-outage",
      summary: `${service} unreachable [simulated outage, reading ${sim.down}/${CONFIG.simOutageBreachTicks}]`,
    });
    // drive the same tri-state the real monitors use: confirming, then down
    const fails = (s.consecFails.get(service) ?? 0) + 1;
    s.consecFails.set(service, fails);
    if (fails === CONFIG.monitorConfirmFails) {
      pushEvent(s, "incident", `oracle: degradation confirmed on ${service} (simulated outage)`);
    }

    const m = s.markets.get(SIM_OUTAGE_MARKETS[service]);
    if (m?.status === "open" && sim.down >= CONFIG.simOutageBreachTicks) {
      const note = `oracle logged ${sim.down} consecutive failing readings on ${service} (simulated outage, time-compressed demo)`;
      settleMarket(s, m.id, "YES", note);
      await fireDowntimeVoiceAlert(s, m.question, note);
      // recovery: stop the simulation and let the monitor read green again
      sim.ticksLeft = 0;
      s.consecFails.set(service, 0);
      pushEvent(s, "incident", `${service} recovered; simulated outage resolved`);
    }
  }
}

async function simTick(s: AppState, ts = Date.now()) {
  const incident = s.simIncidentTicks > 0;
  if (incident) s.simIncidentTicks -= 1;
  const errorRate = incident ? 12 + Math.random() * 20 : Math.max(0.05, 0.4 + (Math.random() - 0.5) * 0.3);
  const latency = incident ? 900 + Math.random() * 1200 : 160 + (Math.random() - 0.5) * 40;
  const ok = !incident;

  s.simConsecutiveDown = ok ? 0 : s.simConsecutiveDown + 1;

  appendReading(s, {
    ts,
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
    const note = `oracle observed ${s.simConsecutiveDown} consecutive failing readings (threshold ${CONFIG.simBreachTicks})`;
    settleMarket(s, "demo-checkout", "YES", note);
    await fireDowntimeVoiceAlert(s, demo.question, note);
  }
}

// ---- real signals ----

async function realTick(s: AppState) {
  const signals = await collectSignals();
  for (const sig of signals) {
    // while a demo simulation runs, the sim owns that service's readings;
    // the real (green) monitor would fight the story mid-demo
    if ((s.simOutages.get(sig.service)?.ticksLeft ?? 0) > 0) continue;
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
      // monitor) counts as neither up nor down - it's as likely our own
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
          `oracle: degradation confirmed on ${sig.service}: ${fails} consecutive failing readings (${sig.summary})`
        );
      } else if (fails > CONFIG.monitorConfirmFails) {
        s.downReadings.set(sig.service, (s.downReadings.get(sig.service) ?? 0) + 1);
      }
    }
  }
  await evaluateRealSettlements(s);
}

async function evaluateRealSettlements(s: AppState) {
  // AWS us-east-1: any active health event touching the region
  const aws = s.markets.get("aws-use1");
  const awsLast = s.lastByService.get("aws-us-east-1");
  if (aws?.status === "open" && awsLast && awsLast.indicator !== "feed-unreachable" && !awsLast.ok) {
    const note = `AWS Health feed shows an active us-east-1 event (reading ${awsLast.hash.slice(0, 12)})`;
    settleMarket(s, "aws-use1", "YES", note);
    await fireDowntimeVoiceAlert(s, aws.question, note);
  }

  // Cloudflare: major/critical indicator on the public status page
  const cf = s.markets.get("cf-incident");
  const cfLast = s.lastByService.get("cloudflare-net");
  if (cf?.status === "open" && cfLast && cfLast.indicator !== "feed-unreachable" && !cfLast.ok) {
    const note = `cloudflarestatus.com reported ${cfLast.indicator} (reading ${cfLast.hash.slice(0, 12)})`;
    settleMarket(s, "cf-incident", "YES", note);
    await fireDowntimeVoiceAlert(s, cf.question, note);
  }

  // Stripe: cumulative failed monitor checks past 30 minutes
  const stripe = s.markets.get("stripe-30m");
  const stripeDown = s.downReadings.get("stripe-api") ?? 0;
  if (stripe?.status === "open" && stripeDown >= CONFIG.stripeDownReadings) {
    const note = `synthetic monitor logged ${stripeDown} failed checks (approximately ${Math.round((stripeDown * CONFIG.realTickMs) / 60000)} min of downtime)`;
    settleMarket(s, "stripe-30m", "YES", note);
    await fireDowntimeVoiceAlert(s, stripe.question, note);
  }

  // Fortnite/Epic: major/critical indicator on the Epic Games status page
  const epic = s.markets.get("epic-fortnite");
  const epicLast = s.lastByService.get("epic-fortnite");
  if (epic?.status === "open" && epicLast && epicLast.indicator !== "feed-unreachable" && !epicLast.ok) {
    const note = `status.epicgames.com reported ${epicLast.indicator} (reading ${epicLast.hash.slice(0, 12)})`;
    settleMarket(s, "epic-fortnite", "YES", note);
    await fireDowntimeVoiceAlert(s, epic.question, note);
  }

  // Netflix: cumulative failed monitor checks past 30 minutes
  const nflx = s.markets.get("netflix-30m");
  const nflxDown = s.downReadings.get("netflix-cdn") ?? 0;
  if (nflx?.status === "open" && nflxDown >= CONFIG.stripeDownReadings) {
    const note = `synthetic monitor logged ${nflxDown} failed checks (≈${Math.round((nflxDown * CONFIG.realTickMs) / 60000)} min of downtime)`;
    settleMarket(s, "netflix-30m", "YES", note);
    await fireDowntimeVoiceAlert(s, nflx.question, note);
  }

  // Claude API: cumulative failed monitor checks past 30 minutes
  const cld = s.markets.get("anthropic-30m");
  const cldDown = s.downReadings.get("anthropic-api") ?? 0;
  if (cld?.status === "open" && cldDown >= CONFIG.stripeDownReadings) {
    const note = `synthetic monitor logged ${cldDown} failed checks against api.anthropic.com (≈${Math.round((cldDown * CONFIG.realTickMs) / 60000)} min of downtime)`;
    settleMarket(s, "anthropic-30m", "YES", note);
    await fireDowntimeVoiceAlert(s, cld.question, note);
  }

  // Valorant: cumulative failed checks against the Riot auth edge
  const val = s.markets.get("riot-valorant");
  const valDown = s.downReadings.get("riot-valorant") ?? 0;
  if (val?.status === "open" && valDown >= CONFIG.stripeDownReadings) {
    const note = `synthetic monitor logged ${valDown} failed checks against auth.riotgames.com (approximately ${Math.round((valDown * CONFIG.realTickMs) / 60000)} min of downtime)`;
    settleMarket(s, "riot-valorant", "YES", note);
    await fireDowntimeVoiceAlert(s, val.question, note);
  }

  // OpenAI: measured weekly availability under the SLO
  const oai = s.markets.get("openai-slo");
  const up = s.upReadings.get("openai-api") ?? 0;
  const down = s.downReadings.get("openai-api") ?? 0;
  const total = up + down;
  if (oai?.status === "open" && total >= CONFIG.openaiMinReadings) {
    const availability = (up / total) * 100;
    if (availability < CONFIG.openaiSloPct) {
      const note = `measured availability ${availability.toFixed(2)}% over ${total} readings (SLO ${CONFIG.openaiSloPct}%)`;
      settleMarket(s, "openai-slo", "YES", note);
      await fireDowntimeVoiceAlert(s, oai.question, note);
    }
  }
}

// ---- market-maker bots: LPs quote both sides, lean on the signal ----

function botStep(s: AppState, ts = Date.now()) {
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
  executeTrade(s, bot.name, m.id, side, "buy", spend, ts);
}

// ---- loops, serverless-safe ----

// ts matters: serverless catch-up replays missed ticks with backdated,
// evenly spaced timestamps so chart history stays continuous between requests
async function tickSimTracked(ts = Date.now()) {
  const s = getState();
  await simTick(s, ts);
  await simOutageTick(s, ts);
  botStep(s, ts);
  // append a history point so charts move between trades
  for (const m of s.markets.values()) {
    if (m.status !== "open") continue;
    const hist = s.priceHistory.get(m.id)!;
    hist.push({ ts, p: priceYes(m.qYes, m.qNo, m.b) });
    if (hist.length > 2500) hist.shift();
  }
  g.__cumulusLastSim = Math.max(g.__cumulusLastSim ?? 0, ts);
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
    g.__cumulusSimTimer = setInterval(() => void tickSimTracked(), CONFIG.simTickMs);
    g.__cumulusRealTimer = setInterval(() => void tickRealTracked(), CONFIG.realTickMs);
    g.__cumulusLastSim = Date.now();
    pushEvent(s, "system", "oracle online: monitors every 15s, simulator every 2s, every reading sha256-chained");
    await tickRealTracked();
    return;
  }
  // serverless catch-up: intervals pause when the instance sleeps, so replay
  // the missed ticks with backdated timestamps spread across the gap
  const base = g.__cumulusLastSim ?? Date.now();
  const simGap = Date.now() - base;
  const missedSim = Math.min(120, Math.floor(simGap / CONFIG.simTickMs));
  const step = simGap / Math.max(1, missedSim);
  for (let i = 1; i <= missedSim; i++) await tickSimTracked(Math.round(base + i * step));
  const realGap = Date.now() - (g.__cumulusLastReal ?? 0);
  if (realGap > CONFIG.realTickMs) await tickRealTracked();
}
