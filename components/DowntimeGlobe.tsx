"use client";

// Live downtime globe: an orthographic canvas globe with datacenter/API sites
// lit by the real oracle monitors — green when the last reading was ok, pulsing
// red while degraded. No WebGL, no deps: 2D canvas + projection math.

import { useEffect, useRef } from "react";
import { useMarketStore } from "./StoreContext";

interface Site {
  name: string;
  lat: number;
  lon: number;
  service?: string; // monitored service key; undefined = decorative datacenter
  major?: boolean;
}

// Monitored services mapped to the regions they run in, plus a ring of
// decorative datacenters so the network looks like a network.
const SITES: Site[] = [
  { name: "AWS us-east-1 · N. Virginia", lat: 38.9, lon: -77.4, service: "aws-us-east-1", major: true },
  { name: "Stripe API · San Francisco", lat: 37.77, lon: -122.42, service: "stripe-api", major: true },
  { name: "Stripe API · Dublin", lat: 53.35, lon: -6.26, service: "stripe-api" },
  { name: "OpenAI API · Iowa", lat: 41.6, lon: -93.6, service: "openai-api", major: true },
  { name: "Cloudflare · London", lat: 51.5, lon: -0.12, service: "cloudflare-net", major: true },
  { name: "Cloudflare · Frankfurt", lat: 50.11, lon: 8.68, service: "cloudflare-net" },
  { name: "Cloudflare · Singapore", lat: 1.35, lon: 103.86, service: "cloudflare-net" },
  { name: "Cloudflare · Tokyo", lat: 35.68, lon: 139.69, service: "cloudflare-net" },
  { name: "Cloudflare · Sydney", lat: -33.87, lon: 151.21, service: "cloudflare-net" },
  { name: "Cloudflare · São Paulo", lat: -23.55, lon: -46.63, service: "cloudflare-net" },
  { name: "Cloudflare · Mumbai", lat: 19.07, lon: 72.88, service: "cloudflare-net" },
  { name: "Cloudflare · Johannesburg", lat: -26.2, lon: 28.05, service: "cloudflare-net" },
  { name: "checkout-service · New York", lat: 40.71, lon: -74.0, service: "checkout-service", major: true },
  // decorative datacenters
  { name: "Oregon", lat: 45.84, lon: -119.7 },
  { name: "Montréal", lat: 45.5, lon: -73.57 },
  { name: "Stockholm", lat: 59.33, lon: 18.07 },
  { name: "Paris", lat: 48.86, lon: 2.35 },
  { name: "Bahrain", lat: 26.07, lon: 50.55 },
  { name: "Seoul", lat: 37.57, lon: 126.98 },
  { name: "Hong Kong", lat: 22.32, lon: 114.17 },
  { name: "Cape Town", lat: -33.92, lon: 18.42 },
  { name: "Santiago", lat: -33.45, lon: -70.67 },
];

// arcs between monitored hubs — the "traffic" layer
const ARCS: Array<[number, number]> = [
  [0, 1], // n. virginia <-> sf
  [0, 4], // n. virginia <-> london
  [4, 6], // london <-> singapore
  [6, 7], // singapore <-> tokyo
  [1, 7], // sf <-> tokyo
  [0, 9], // n. virginia <-> são paulo
  [4, 10], // london <-> mumbai
  [12, 0], // nyc <-> n. virginia
];

const DEG = Math.PI / 180;
const TILT = 16 * DEG;
const SPIN_MS_PER_DEG = 90; // one revolution ≈ 32s

function project(lat: number, lon: number, lon0: number, r: number, cx: number, cy: number) {
  const φ = lat * DEG;
  const λ = lon * DEG - lon0;
  const cosφ = Math.cos(φ);
  const x = cosφ * Math.sin(λ);
  const y = Math.cos(TILT) * Math.sin(φ) - Math.sin(TILT) * cosφ * Math.cos(λ);
  const z = Math.sin(TILT) * Math.sin(φ) + Math.cos(TILT) * cosφ * Math.cos(λ);
  return { x: cx + r * x, y: cy - r * y, z };
}

export default function DowntimeGlobe() {
  const { snap } = useMarketStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<Map<string, boolean>>(new Map());

  // keep latest monitor status in a ref so the rAF loop reads it without re-subscribing
  useEffect(() => {
    if (!snap) return;
    const m = new Map<string, boolean>();
    for (const mon of snap.monitors) m.set(mon.service, mon.ok);
    statusRef.current = m;
  }, [snap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    });
    ro.observe(canvas);

    const draw = (t: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      if (w === 0 || h === 0) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2 + h * 0.02;
      const r = Math.min(w, h) * 0.42;
      const lon0 = ((t / SPIN_MS_PER_DEG) % 360) * DEG;

      // sphere body
      const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(1, "#eef3ec");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = "#ccd6ca";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // graticule
      ctx.strokeStyle = "rgba(95,111,100,0.16)";
      ctx.lineWidth = 0.7;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lon = -180; lon <= 180; lon += 4) {
          const p = project(lat, lon, lon0, r, cx, cy);
          if (p.z > 0) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lat = -88; lat <= 88; lat += 4) {
          const p = project(lat, lon, lon0, r, cx, cy);
          if (p.z > 0) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        }
        ctx.stroke();
      }

      // arcs (great-circle-ish: lerp lat/lon, lift toward midpoint)
      for (const [ai, bi] of ARCS) {
        const a = SITES[ai];
        const b = SITES[bi];
        const aDown = a.service ? statusRef.current.get(a.service) === false : false;
        const bDown = b.service ? statusRef.current.get(b.service) === false : false;
        const hot = aDown || bDown;
        ctx.beginPath();
        let pen = false;
        let dLon = b.lon - a.lon;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        for (let i = 0; i <= 24; i++) {
          const f = i / 24;
          const lift = 1 + 0.08 * Math.sin(f * Math.PI);
          const p = project(a.lat + (b.lat - a.lat) * f, a.lon + dLon * f, lon0, r * lift, cx, cy);
          if (p.z > -0.05) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        }
        ctx.strokeStyle = hot ? "rgba(207,63,56,0.45)" : "rgba(12,138,77,0.22)";
        ctx.lineWidth = hot ? 1.4 : 1;
        ctx.stroke();
      }

      // sites
      ctx.textBaseline = "middle";
      for (const s of SITES) {
        const p = project(s.lat, s.lon, lon0, r, cx, cy);
        if (p.z <= 0) continue;
        const monitored = s.service !== undefined;
        const down = monitored && statusRef.current.get(s.service!) === false;
        const near = Math.min(1, Math.max(0.35, p.z)); // fade toward the limb

        if (down) {
          // pulsing incident rings
          const phase = (t % 1600) / 1600;
          for (const off of [0, 0.5]) {
            const q = (phase + off) % 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 + q * 16, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(207,63,56,${(1 - q) * 0.5 * near})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        const dotR = monitored ? (s.major ? 3.4 : 2.6) : 1.8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
        ctx.fillStyle = down
          ? `rgba(207,63,56,${near})`
          : monitored
            ? `rgba(12,138,77,${near})`
            : `rgba(95,111,100,${0.55 * near})`;
        ctx.fill();

        if ((s.major || down) && p.z > 0.45) {
          ctx.font = "9px var(--font-plex-mono), monospace";
          ctx.fillStyle = down ? `rgba(207,63,56,${near})` : `rgba(95,111,100,${0.85 * near})`;
          ctx.fillText(down ? `${s.name} — DEGRADED` : s.name, p.x + 7, p.y);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const degraded = snap ? snap.monitors.filter((m) => !m.ok) : [];

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full" aria-label="global datacenter status" />
      <div className="pointer-events-none absolute left-4 top-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">
          oracle telemetry · live
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px]">
          {degraded.length === 0 ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-up" />
              <span className="text-updim">all monitored regions nominal</span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-down" />
              <span className="text-down">
                {degraded.length} service{degraded.length > 1 ? "s" : ""} degraded —{" "}
                {degraded.map((d) => d.label).join(", ")}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
