// AI voice alerts: when a monitored service goes down, Cumulus places a real
// phone call. The script is written by an LLM on NVIDIA's API and spoken by
// Twilio text-to-speech (the Glide-project voice rail, pointed at outages).
//
// Env (all optional; the demo degrades gracefully without them):
//   NVIDIA_API_KEY          key for integrate.api.nvidia.com (script generation)
//   TWILIO_ACCOUNT_SID      Twilio Account SID (AC...), always required for calls
//   TWILIO_AUTH_TOKEN       auth option A: the account auth token
//   TWILIO_API_KEY_SID      auth option B: an API key (SK...) ...
//   TWILIO_API_KEY_SECRET   ... plus its secret (preferred over the auth token)
//   TWILIO_FROM_NUMBER      the Twilio number that places the call, E.164
//   ALERT_PHONE_NUMBER      the number to call when downtime is confirmed, E.164

import type { AppState } from "./state";
import { pushEvent } from "./state";

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = process.env.NVIDIA_MODEL ?? "meta/llama-3.1-8b-instruct";

function fallbackScript(question: string, note: string): string {
  const simulated = /simulated|simulation/i.test(note);
  return (
    `This is Cumulus, your downtime protection desk. ${simulated ? "This is a simulated outage exercise." : "We have confirmed an outage."} ` +
    `${question}. The oracle recorded the evidence: ${note}. ` +
    `Your protection has been paid out automatically. No claim to file. Goodbye.`
  );
}

async function generateScript(question: string, note: string): Promise<string> {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) return fallbackScript(question, note);
  try {
    const res = await fetch(NVIDIA_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        max_tokens: 120,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "You are the calm, professional AI voice of Cumulus, a downtime protection market. Write a spoken phone alert under 55 words. If the oracle evidence says this is simulated, clearly call it a simulation; otherwise state that the outage is confirmed. Name the service, mention the oracle evidence briefly, and confirm the protection payout was automatic with no claim to file. Plain speech only, no markdown, no emojis.",
          },
          { role: "user", content: `Contract: ${question}. Oracle evidence: ${note}.` },
        ],
      }),
    });
    if (!res.ok) return fallbackScript(question, note);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 20 ? text : fallbackScript(question, note);
  } catch {
    return fallbackScript(question, note);
  }
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toTwiml(script: string): string {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const speech = sentences
    .map((sentence) => `<Say voice="Polly.Joanna-Neural">${xmlEscape(sentence)}</Say><Pause length="0"/>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/>${speech}</Response>`;
}

async function placeCall(script: string): Promise<{ ok: boolean; detail: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const from = process.env.TWILIO_FROM_NUMBER;
  const to = process.env.ALERT_PHONE_NUMBER;
  // auth: an API key pair (SK... + secret) or the account auth token
  const keySid = process.env.TWILIO_API_KEY_SID;
  const keySecret = process.env.TWILIO_API_KEY_SECRET;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  // Prefer the account token when it is configured. This matches Gridpath's
  // proven outbound-call setup, while retaining API-key support as a fallback.
  const authUser = authToken ? accountSid : keySid && keySecret ? keySid : undefined;
  const authPass = authToken ?? (keySid && keySecret ? keySecret : undefined);
  if (!accountSid || !authUser || !authPass || !from || !to) {
    return {
      ok: false,
      detail:
        "Twilio env not configured (need TWILIO_ACCOUNT_SID, TWILIO_FROM_NUMBER, ALERT_PHONE_NUMBER, and either TWILIO_API_KEY_SID+TWILIO_API_KEY_SECRET or TWILIO_AUTH_TOKEN)",
    };
  }
  try {
    const twiml = toTwiml(script);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        authorization: `Basic ${Buffer.from(`${authUser}:${authPass}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: to, Twiml: twiml }).toString(),
    });
    const data = (await res.json().catch(() => null)) as { sid?: string; message?: string } | null;
    if (!res.ok) return { ok: false, detail: data?.message ?? `Twilio HTTP ${res.status}` };
    return { ok: true, detail: `call ${data?.sid ?? ""} to ${to.slice(0, -4)}****` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "call failed" };
  }
}

// This is awaited by the request path. Vercel can stop unawaited work after a
// response is sent, which otherwise drops outbound calls without an error.
export async function fireDowntimeVoiceAlert(s: AppState, question: string, note: string): Promise<void> {
  try {
    const script = await generateScript(question, note);
    pushEvent(s, "incident", `AI voice alert drafted: "${script.slice(0, 110)}${script.length > 110 ? "..." : ""}"`);
    const call = await placeCall(script);
    pushEvent(
      s,
      "incident",
      call.ok ? `voice call dispatched via Twilio (${call.detail})` : `voice call skipped: ${call.detail}`
    );
  } catch {
    // Alerting must never take down settlement.
  }
}
