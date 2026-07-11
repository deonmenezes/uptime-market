// Real-world signal collection: synthetic endpoint monitors + public status feeds.
// Everything here degrades gracefully: a fetch failure produces an "unknown"
// reading rather than a settlement-triggering one.

export interface RawSignal {
  service: string;
  source: string;
  ok: boolean;
  known: boolean; // false = feed unreachable, do not use for settlement
  latencyMs: number | null;
  indicator: string | null;
  summary: string;
}

const TIMEOUT_MS = 8000;
const RETRY_TIMEOUT_MS = 4000;

async function timedFetch(
  url: string,
  init?: RequestInit,
  timeoutMs = TIMEOUT_MS
): Promise<{ res: Response | null; ms: number }> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
      headers: { "user-agent": "cumulus-oracle/0.1", ...init?.headers },
    });
    return { res, ms: Date.now() - started };
  } catch {
    return { res: null, ms: Date.now() - started };
  }
}

// Monitors get one immediate retry on a network-level failure: a single
// timeout is as likely to be our runtime's egress as the target's outage.
// A real outage fails both attempts (and the next tick, and the one after).
async function monitorFetch(url: string): Promise<{ res: Response | null; ms: number }> {
  const first = await timedFetch(url);
  if (first.res !== null) return first;
  return timedFetch(url, undefined, RETRY_TIMEOUT_MS);
}

// ---- synthetic monitors: ping the actual API edge. Any HTTP answer < 500
// (including 401) proves the service is up and gives a real latency number.

export async function monitorStripe(): Promise<RawSignal> {
  const { res, ms } = await monitorFetch("https://api.stripe.com/v1/charges");
  const ok = res !== null && res.status < 500;
  return {
    service: "stripe-api",
    source: "monitor:stripe",
    ok,
    known: true,
    latencyMs: res ? ms : null,
    indicator: res ? `http ${res.status}` : "timeout",
    summary: res ? `api.stripe.com answered ${res.status} in ${ms}ms` : "api.stripe.com unreachable",
  };
}

export async function monitorOpenAI(): Promise<RawSignal> {
  const { res, ms } = await monitorFetch("https://api.openai.com/v1/models");
  const ok = res !== null && res.status < 500;
  return {
    service: "openai-api",
    source: "monitor:openai",
    ok,
    known: true,
    latencyMs: res ? ms : null,
    indicator: res ? `http ${res.status}` : "timeout",
    summary: res ? `api.openai.com answered ${res.status} in ${ms}ms` : "api.openai.com unreachable",
  };
}

export async function monitorNetflix(): Promise<RawSignal> {
  const { res, ms } = await monitorFetch("https://www.netflix.com/");
  const ok = res !== null && res.status < 500;
  return {
    service: "netflix-cdn",
    source: "monitor:netflix",
    ok,
    known: true,
    latencyMs: res ? ms : null,
    indicator: res ? `http ${res.status}` : "timeout",
    summary: res ? `netflix.com answered ${res.status} in ${ms}ms` : "netflix.com unreachable",
  };
}

export async function monitorRiot(): Promise<RawSignal> {
  // Riot auth edge fronts login for Valorant/LoL — any HTTP answer proves it's up
  const { res, ms } = await monitorFetch("https://auth.riotgames.com/");
  const ok = res !== null && res.status < 500;
  return {
    service: "riot-valorant",
    source: "monitor:riot",
    ok,
    known: true,
    latencyMs: res ? ms : null,
    indicator: res ? `http ${res.status}` : "timeout",
    summary: res ? `auth.riotgames.com answered ${res.status} in ${ms}ms` : "auth.riotgames.com unreachable",
  };
}

// ---- public status feeds (statuspage.io JSON + AWS health events)

export async function feedEpic(): Promise<RawSignal> {
  const { res, ms } = await timedFetch("https://status.epicgames.com/api/v2/status.json");
  if (!res || !res.ok) {
    return {
      service: "epic-fortnite", source: "feed:epic", ok: true, known: false,
      latencyMs: null, indicator: null, summary: "epic games status feed unreachable",
    };
  }
  try {
    const data = (await res.json()) as { status?: { indicator?: string; description?: string } };
    const indicator = data.status?.indicator ?? "unknown";
    const breach = indicator === "major" || indicator === "critical";
    return {
      service: "epic-fortnite", source: "feed:epic", ok: !breach, known: true,
      latencyMs: ms, indicator,
      summary: `status.epicgames.com indicator=${indicator} (${data.status?.description ?? ""})`,
    };
  } catch {
    return {
      service: "epic-fortnite", source: "feed:epic", ok: true, known: false,
      latencyMs: ms, indicator: null, summary: "epic games status feed parse error",
    };
  }
}

export async function feedCloudflare(): Promise<RawSignal> {
  const { res, ms } = await timedFetch("https://www.cloudflarestatus.com/api/v2/status.json");
  if (!res || !res.ok) {
    return {
      service: "cloudflare-net", source: "feed:cloudflare", ok: true, known: false,
      latencyMs: null, indicator: null, summary: "cloudflare status feed unreachable",
    };
  }
  try {
    const data = (await res.json()) as { status?: { indicator?: string; description?: string } };
    const indicator = data.status?.indicator ?? "unknown";
    // only major/critical counts as the contract's "major incident"
    const breach = indicator === "major" || indicator === "critical";
    return {
      service: "cloudflare-net", source: "feed:cloudflare", ok: !breach, known: true,
      latencyMs: ms, indicator,
      summary: `cloudflarestatus.com indicator=${indicator} (${data.status?.description ?? ""})`,
    };
  } catch {
    return {
      service: "cloudflare-net", source: "feed:cloudflare", ok: true, known: false,
      latencyMs: ms, indicator: null, summary: "cloudflare status feed parse error",
    };
  }
}

export async function feedAws(): Promise<RawSignal> {
  const { res, ms } = await timedFetch("https://health.aws.amazon.com/public/currentevents");
  if (!res || !res.ok) {
    return {
      service: "aws-us-east-1", source: "feed:aws", ok: true, known: false,
      latencyMs: null, indicator: null, summary: "aws health feed unreachable",
    };
  }
  try {
    // feed is UTF-16LE with BOM
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let text =
      bytes[0] === 0xff && bytes[1] === 0xfe
        ? new TextDecoder("utf-16le").decode(buf)
        : bytes[1] === 0x00
          ? new TextDecoder("utf-16le").decode(buf) // BOM-less utf-16le
          : new TextDecoder("utf-8").decode(buf);
    // strip BOM/noise and isolate the JSON array
    const start = text.indexOf("[");
    const end = text.lastIndexOf("]");
    if (start === -1 || end <= start) throw new Error("no json array");
    text = text.slice(start, end + 1);
    const events = JSON.parse(text) as Array<{
      arn?: string;
      status?: string;
      event_type_category?: string;
      severity?: string | number;
    }>;
    const useast1 = events.filter((e) => (e.arn ?? "").includes("us-east-1"));
    const breach = useast1.length > 0;
    return {
      service: "aws-us-east-1", source: "feed:aws", ok: !breach, known: true,
      latencyMs: ms, indicator: `${events.length} active events`,
      summary: breach
        ? `AWS health: ${useast1.length} active event(s) touching us-east-1`
        : `AWS health: ${events.length} active event(s), none in us-east-1`,
    };
  } catch {
    return {
      service: "aws-us-east-1", source: "feed:aws", ok: true, known: false,
      latencyMs: ms, indicator: null, summary: "aws health feed parse error",
    };
  }
}

export async function collectSignals(): Promise<RawSignal[]> {
  const results = await Promise.allSettled([
    monitorStripe(),
    monitorOpenAI(),
    monitorNetflix(),
    monitorRiot(),
    feedCloudflare(),
    feedAws(),
    feedEpic(),
  ]);
  return results
    .filter((r): r is PromiseFulfilledResult<RawSignal> => r.status === "fulfilled")
    .map((r) => r.value);
}
