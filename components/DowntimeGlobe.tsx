"use client";

// Live downtime globe: orthographic canvas globe with dot-matrix continents,
// provider logo chips pinned to their regions, and site status lit by the real
// oracle monitors — green when the last reading was ok, pulsing red while
// degraded. No WebGL, no deps: 2D canvas + projection math.
//
// Land data: world-atlas land-110m rasterized to a 2°×2° grid at build time
// (scripts note: 180 cols × 90 rows, 1 bit per cell, little-endian, base64).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMarketStore } from "./StoreContext";
import type { MonitorHealth } from "@/lib/market/types";

const LAND_B64 =
  "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/gHwPwAAAAAAAAAAAAAAAAAAAAAAAOj//P//BwAAAAAAAAIAAAAAAAAAAABguA////8AAB8AAAAAPAAAAAAAAAAAwADkw////wEABAAAAABgAAAAAAAAAAAAHPUD4P//AAAAAMAA4P8DgBsAAAAAAHAR7Q3A/38AAAAAMAD8/38DAAAAARgAkD/MPwD/XwAAwAAguP8AAAjA/gcAfyCAsUUO/wDg//8H8P9IAAAAAABAAPgAAAAAAB58AP7//wGAAkAAAAAAAAAAcwAAAABAB/7Af/j/YCgAAAAAAAAAAAAA/////x/AAh4AAMDn////////////D4C/////B3gAHAAA4Of///////////QAAB7g//8HeAIAAADgx/////////9BBAAACID//x/wBwAAgEHj////////fwAPAAABAP7///kfAADAQfD///////8/AAcAAAAA/v//+T8AAGDz//////////8DAQAAAAD8////PwAAAPv//////////wIAAAAAAOj///9iAAAA/v//////////AgAAAAAA8P///4MAAAD+/////////38CAAAAAADw////BgAAAP7+6fP/////PwAAAAAAAPD//38AAADgj/nA8/////8fAwAAAAAA8P//PwAAAMBD9v7n/////wcBAAAAAADw//8PAAAA4AO0/+f///8fAgEAAAAAAOD//w8AAACA4QL/5////3/GAAAAAAAAwP//DwAAAIB/QPT/////P/IAAAAAAACA//8DAAAAwP8A8P////8/GAAAAAAAAAD//wEAAADg//f+/////38AAAAAAAAAAPwDAgAAAOD////7////fwAAAAAAAAAA+gECAAAA+P//9+f///8/AAAAAAAAAAD0AQAAAAD4///nL/j//z8AAAAAAAAAAOABAwAAAPz//+//4P//TwAAAAAAAAAA4GEIAAAA/v//33/gP/8AAAAAAAAAAADAM0AAAAD8//+ff8APfgEAAAAAAAAAAAA/AAAAAPz//58fgAf+QAAAAAAAAAAAAPAAAAAA/v//vweAA/hAAAAAAAAAAAAAwAAAAAD8//9/AYAD+EEAAAAAAAAAAACA8AAAAPz///8MAAPIAAEAAAAAAAAAAAD1DwAA+P///wcABUgAAAAAAAAAAAAAAPgfAADw////BwAEAAABAAAAAAAAAAAA+P8AAGDh//8DAAA0GAAAAAAAAAAAAAD4/wEAAID//wEAACgcAAAAAAAAAAAAAPz/AQAAgP//AAAAGF4AAAAAAAAAAAAA/P8HAADA/38AAAAwHhgAAAAAAAAAAAD8/z8AAID/PwAAAGBu1AEAAAAAAAAAAP7//wAAAP8/AAAAQICABwAAAAAAAAAA/P//AQAA/z8AAACAA4APAQAAAAAAAAD4//8AAAD/PwAAAAAQAQsEAAAAAAAAAPj/fwAAAP4/AAAAAAAAAAAAAAAAAAAA8P9/AAAA/z8EAAAAADgCAAAAAAAAAADw/38AAAD/PwQAAAAAPwYgAAAAAAAAAMD/PwAAAP8fBwAAAIB/BgAAAAAAAAAAgP8/AAAA/w8HAAAAgP8HAAAAAAAAAACA/z8AAAD+DwMAAADw/x8QAAAAAAAAAID/DwAAAP4PAwAAAPj/HwAAAAAAAAAAgP8DAAAA/gcBAAAA+P8/AAAAAAAAAACA/wMAAAD8AwAAAAD4/38AAAAAAAAAAMD/AQAAAPwDAAAAAPj/fwAAAAAAAAAAwP8BAAAA+AEAAAAA8P9/AAAAAAAAAADA/wAAAAD4AAAAAADw4D8AAAAAAAAAAMAfAAAAAAAAAAAAABCAHwABAAAAAAAA4D8AAAAAAAAAAAAAAAAfAAIAAAAAAADgBwAAAAAAAAAAAAAAAAAABgAAAAAAAOAFAAAAAAAAAAAAAAAADAADAAAAAAAAwAMAAAAAAAAAAAAAAAAIgAEAAAAAAADgAQAAAAAAAAAAAAAAAADAAAAAAAAAAOABAAAAAAAAAAAAAAAAAAAAAAAAAAAA8AAAAAAAAAAAEAAAAAAAAAAAAAAAAABwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAB4AEDwn/8HAAAAAAAAAAAAAwAAAAAAyP8f/v////8AAAAAAAAAAMAHAAAA+P///8///////z8AAAAAAMAhAA8AAPj/////////////fwAAAPD/L///AwAA/v////////////8fAACA/////wcAAPj//////////////w8AAPL/////BwAO////////////////DwAAAP////9/AAH///////////////8DAADg/////////////////////////x8AAP4DAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const GRID_COLS = 180;
const GRID_ROWS = 90;
const GRID_ROW_BYTES = 23;

interface Site {
  name: string;
  lat: number;
  lon: number;
  service?: string; // monitored service key; undefined = decorative
  logo?: string; // /logos/*.svg → drawn as a chip pinned to the site
  flip?: boolean; // chip below the dot instead of above (declutter)
}

// Monitored services mapped to the regions they run in, plus supporting
// datacenters/PoPs so the network looks like a network.
const SITES: Site[] = [
  // cloud + API infrastructure
  { name: "AWS us-east-1", lat: 38.9, lon: -77.4, service: "aws-us-east-1", logo: "/logos/aws.svg" },
  { name: "Stripe", lat: 37.77, lon: -122.42, service: "stripe-api", logo: "/logos/stripe.svg" },
  { name: "Stripe · Dublin", lat: 53.35, lon: -6.26, service: "stripe-api" },
  { name: "OpenAI", lat: 41.6, lon: -93.6, service: "openai-api", logo: "/logos/openai.svg", flip: true },
  { name: "Cloudflare", lat: 51.5, lon: -0.12, service: "cloudflare-net", logo: "/logos/cloudflare.svg" },
  { name: "Cloudflare · Frankfurt", lat: 50.11, lon: 8.68, service: "cloudflare-net" },
  { name: "Cloudflare · Singapore", lat: 1.35, lon: 103.86, service: "cloudflare-net" },
  { name: "Cloudflare · Tokyo", lat: 35.68, lon: 139.69, service: "cloudflare-net" },
  { name: "Cloudflare · Sydney", lat: -33.87, lon: 151.21, service: "cloudflare-net" },
  { name: "Cloudflare · São Paulo", lat: -23.55, lon: -46.63, service: "cloudflare-net" },
  { name: "Cloudflare · Mumbai", lat: 19.07, lon: 72.88, service: "cloudflare-net" },
  { name: "Cloudflare · Johannesburg", lat: -26.2, lon: 28.05, service: "cloudflare-net" },
  // games + streaming
  { name: "Fortnite / Epic", lat: 35.79, lon: -78.78, service: "epic-fortnite", logo: "/logos/epicgames.svg", flip: true },
  { name: "Netflix OC · Amsterdam", lat: 52.37, lon: 4.9, service: "netflix-cdn", logo: "/logos/netflix.svg", flip: true },
  { name: "Valorant / Riot", lat: 34.02, lon: -118.45, service: "riot-valorant", logo: "/logos/valorant.svg", flip: true },
  { name: "Supercell · Helsinki", lat: 60.17, lon: 24.94, logo: "/logos/supercell.svg" },
  // the sim
  { name: "checkout-service", lat: 40.71, lon: -74.0, service: "checkout-service", logo: "/logos/kubernetes.svg" },
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

// arcs between hubs — the "traffic" layer (resolved by site name)
const ARC_PAIRS: Array<[string, string]> = [
  ["AWS us-east-1", "Stripe"],
  ["AWS us-east-1", "Cloudflare"],
  ["Cloudflare", "Cloudflare · Singapore"],
  ["Cloudflare · Singapore", "Cloudflare · Tokyo"],
  ["Stripe", "Cloudflare · Tokyo"],
  ["AWS us-east-1", "Cloudflare · São Paulo"],
  ["Cloudflare", "Cloudflare · Mumbai"],
  ["checkout-service", "AWS us-east-1"],
  ["Fortnite / Epic", "AWS us-east-1"],
  ["Netflix OC · Amsterdam", "AWS us-east-1"],
  ["Valorant / Riot", "Cloudflare · Tokyo"],
  ["Supercell · Helsinki", "Cloudflare"],
];

const DEG = Math.PI / 180;
const SPIN_MS_PER_DEG = 90; // one revolution ≈ 32s

interface P3 {
  x: number;
  y: number;
  z: number;
}

function project(lat: number, lon: number, lon0: number, tilt: number, r: number, cx: number, cy: number): P3 {
  const φ = lat * DEG;
  const λ = lon * DEG - lon0;
  const cosφ = Math.cos(φ);
  const x = cosφ * Math.sin(λ);
  const y = Math.cos(tilt) * Math.sin(φ) - Math.sin(tilt) * cosφ * Math.cos(λ);
  const z = Math.sin(tilt) * Math.sin(φ) + Math.cos(tilt) * cosφ * Math.cos(λ);
  return { x: cx + r * x, y: cy - r * y, z };
}

// decode the land bitmap once: array of { sinLat*, cosLat, lonRad } per land cell
function decodeLand(): Array<{ sinLat: number; cosLat: number; lon: number }> {
  const bin = atob(LAND_B64);
  const out: Array<{ sinLat: number; cosLat: number; lon: number }> = [];
  for (let j = 0; j < GRID_ROWS; j++) {
    const lat = 89 - j * 2;
    if (lat < -62) continue; // Antarctica reads as noise at hero size
    const φ = lat * DEG;
    for (let i = 0; i < GRID_COLS; i++) {
      const byte = bin.charCodeAt(j * GRID_ROW_BYTES + (i >> 3));
      if ((byte >> (i & 7)) & 1) {
        out.push({ sinLat: Math.sin(φ), cosLat: Math.cos(φ), lon: (-179 + i * 2) * DEG });
      }
    }
  }
  return out;
}

// SVG logos in /public are viewBox-only; give them explicit dimensions so
// canvas drawImage rasterizes them in every browser.
function loadLogo(src: string): Promise<HTMLImageElement | null> {
  return fetch(src)
    .then((r) => r.text())
    .then(
      (svg) =>
        new Promise<HTMLImageElement | null>((resolve) => {
          const sized = svg.replace(/<svg /, '<svg width="64" height="64" ');
          const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = url;
        })
    )
    .catch(() => null);
}

export default function DowntimeGlobe({ expandable = true }: { expandable?: boolean }) {
  const { snap } = useMarketStore();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<Map<string, MonitorHealth>>(new Map());
  const logosRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const marketByServiceRef = useRef<Map<string, string>>(new Map());
  const hitsRef = useRef<Array<{ x: number; y: number; service: string }>>([]);
  const [fullscreen, setFullscreen] = useState(false);
  // interaction: drag to rotate (horizontal) and tilt (vertical); auto-spin
  // pauses while dragging and resumes from wherever you leave it
  const viewRef = useRef({ lonOffsetDeg: 0, tiltDeg: 16, spinBaseMs: 0, dragging: false, moved: 0 });
  const dragRef = useRef<{ x: number; y: number; lastT: number } | null>(null);

  // latest monitor health + service->market mapping in refs for the rAF loop
  useEffect(() => {
    if (!snap) return;
    const m = new Map<string, MonitorHealth>();
    for (const mon of snap.monitors) m.set(mon.service, mon.health ?? (mon.ok ? "up" : "down"));
    statusRef.current = m;
    const mm = new Map<string, string>();
    for (const mk of snap.markets) if (mk.status === "open") mm.set(mk.service, mk.id);
    marketByServiceRef.current = mm;
  }, [snap]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  useEffect(() => {
    let alive = true;
    const srcs = [...new Set(SITES.map((s) => s.logo).filter((l): l is string => !!l))];
    for (const src of srcs) {
      loadLogo(src).then((img) => {
        if (alive && img) logosRef.current.set(src, img);
      });
    }
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const land = decodeLand();
    const arcs = ARC_PAIRS.map(([a, b]) => [
      SITES.find((s) => s.name === a)!,
      SITES.find((s) => s.name === b)!,
    ]);

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
      const cy = h / 2 + h * 0.03;
      const r = Math.min(w, h) * 0.44;
      const v = viewRef.current;
      if (!v.dragging && v.spinBaseMs) v.lonOffsetDeg += (t - v.spinBaseMs) / SPIN_MS_PER_DEG;
      v.spinBaseMs = t;
      const lon0 = (v.lonOffsetDeg % 360) * DEG;
      const tilt = v.tiltDeg * DEG;
      const sinT = Math.sin(tilt);
      const cosT = Math.cos(tilt);

      // sphere body
      const body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      body.addColorStop(0, "#ffffff");
      body.addColorStop(1, "#edf2ea");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = body;
      ctx.fill();
      ctx.strokeStyle = "#ccd6ca";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // faint graticule
      ctx.strokeStyle = "rgba(95,111,100,0.10)";
      ctx.lineWidth = 0.7;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let pen = false;
        for (let lon = -180; lon <= 180; lon += 5) {
          const p = project(lat, lon, lon0, tilt, r, cx, cy);
          if (p.z > 0) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        }
        ctx.stroke();
      }

      // dot-matrix continents
      const dotR = Math.max(0.9, r * 0.0065);
      ctx.fillStyle = "rgba(23,89,74,0.42)";
      for (const d of land) {
        const λ = d.lon - lon0;
        const cosλ = Math.cos(λ);
        const z = sinT * d.sinLat + cosT * d.cosLat * cosλ;
        if (z <= 0.02) continue;
        const x = cx + r * (d.cosLat * Math.sin(λ));
        const y = cy - r * (cosT * d.sinLat - sinT * d.cosLat * cosλ);
        ctx.globalAlpha = Math.min(1, z * 1.6);
        ctx.beginPath();
        ctx.arc(x, y, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // arcs (lerp lat/lon, lift toward midpoint)
      for (const [a, b] of arcs) {
        const aH = a.service ? statusRef.current.get(a.service) : undefined;
        const bH = b.service ? statusRef.current.get(b.service) : undefined;
        const hot = aH === "down" || bH === "down";
        ctx.beginPath();
        let pen = false;
        let dLon = b.lon - a.lon;
        if (dLon > 180) dLon -= 360;
        if (dLon < -180) dLon += 360;
        for (let i = 0; i <= 24; i++) {
          const f = i / 24;
          const lift = 1 + 0.09 * Math.sin(f * Math.PI);
          const p = project(a.lat + (b.lat - a.lat) * f, a.lon + dLon * f, lon0, tilt, r * lift, cx, cy);
          if (p.z > -0.05) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        }
        ctx.strokeStyle = hot ? "rgba(207,63,56,0.5)" : "rgba(12,138,77,0.25)";
        ctx.lineWidth = hot ? 1.4 : 1;
        ctx.stroke();
      }

      // sites: dots + incident pulses first, then chips front-to-back
      hitsRef.current = [];
      const chipQueue: Array<{ s: Site; p: P3; health: MonitorHealth | undefined }> = [];
      for (const s of SITES) {
        const p = project(s.lat, s.lon, lon0, tilt, r, cx, cy);
        if (p.z <= 0) continue;
        const monitored = s.service !== undefined;
        const health = monitored ? statusRef.current.get(s.service!) : undefined;
        const down = health === "down";
        const confirming = health === "confirming";
        const near = Math.min(1, Math.max(0.35, p.z));

        if (down || confirming) {
          const phase = (t % 1600) / 1600;
          for (const off of [0, 0.5]) {
            const q = (phase + off) % 1;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4 + q * 18, 0, Math.PI * 2);
            ctx.strokeStyle = down
              ? `rgba(207,63,56,${(1 - q) * 0.55 * near})`
              : `rgba(168,124,31,${(1 - q) * 0.5 * near})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, monitored ? 3 : 1.8, 0, Math.PI * 2);
        ctx.fillStyle = down
          ? `rgba(207,63,56,${near})`
          : confirming
            ? `rgba(168,124,31,${near})`
            : monitored
              ? `rgba(12,138,77,${near})`
              : `rgba(95,111,100,${0.5 * near})`;
        ctx.fill();

        if (monitored && p.z > 0.25) hitsRef.current.push({ x: p.x, y: p.y, service: s.service! });
        if (s.logo && p.z > 0.25) chipQueue.push({ s, p, health });
        else if ((down || confirming) && p.z > 0.25) {
          ctx.font = "9px var(--font-plex-mono), monospace";
          ctx.fillStyle = down ? `rgba(207,63,56,${near})` : `rgba(168,124,31,${near})`;
          ctx.textBaseline = "middle";
          ctx.fillText(`${s.name}: ${down ? "DOWN" : "CONFIRMING"}`, p.x + 7, p.y);
        }
      }

      // logo chips, back-to-front so the nearest reads on top
      chipQueue.sort((a, b) => a.p.z - b.p.z);
      const chip = 24;
      for (const { s, p, health } of chipQueue) {
        const img = logosRef.current.get(s.logo!);
        const down = health === "down";
        const confirming = health === "confirming";
        const alpha = Math.min(1, Math.max(0.45, p.z * 1.3));
        const stem = 12;
        const cyChip = s.flip ? p.y + stem + chip / 2 : p.y - stem - chip / 2;
        const edgeColor = down ? "#cf3f38" : confirming ? "#a87c1f" : "#ccd6ca";
        if (s.service) hitsRef.current.push({ x: p.x, y: cyChip, service: s.service });

        ctx.globalAlpha = alpha;
        ctx.strokeStyle = down
          ? "rgba(207,63,56,0.7)"
          : confirming
            ? "rgba(168,124,31,0.7)"
            : "rgba(95,111,100,0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, s.flip ? p.y + 4 : p.y - 4);
        ctx.lineTo(p.x, s.flip ? cyChip - chip / 2 : cyChip + chip / 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.roundRect(p.x - chip / 2, cyChip - chip / 2, chip, chip, 6);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = edgeColor;
        ctx.lineWidth = down || confirming ? 1.5 : 1;
        ctx.stroke();

        if (img) {
          const pad = 4.5;
          ctx.drawImage(img, p.x - chip / 2 + pad, cyChip - chip / 2 + pad, chip - pad * 2, chip - pad * 2);
        }

        // status LED on the chip corner
        ctx.beginPath();
        ctx.arc(p.x + chip / 2 - 2, cyChip - chip / 2 + 2, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = down ? "#cf3f38" : confirming ? "#a87c1f" : s.service ? "#0c8a4d" : "#ccd6ca";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (down || confirming) {
          ctx.font = "bold 9px var(--font-plex-mono), monospace";
          ctx.fillStyle = down ? "#cf3f38" : "#a87c1f";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(down ? "DOWN" : "CONFIRMING", p.x, s.flip ? cyChip + chip / 2 + 3 : cyChip - chip / 2 - 12);
          ctx.textAlign = "left";
        }
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const down = snap ? snap.monitors.filter((m) => m.health === "down") : [];
  const confirming = snap ? snap.monitors.filter((m) => m.health === "confirming") : [];

  const hitAt = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best: { service: string; d: number } | null = null;
    for (const h of hitsRef.current) {
      const d = Math.hypot(h.x - mx, h.y - my);
      if (d < 16 && (!best || d < best.d)) best = { service: h.service, d };
    }
    return best;
  };

  const onClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (viewRef.current.moved > 5) return; // that was a drag, not a click
    const hit = hitAt(e);
    if (hit) {
      const marketId = marketByServiceRef.current.get(hit.service);
      if (marketId) {
        router.push(`/m/${marketId}`);
        return;
      }
    }
    if (expandable) setFullscreen(true);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    viewRef.current.dragging = true;
    viewRef.current.moved = 0;
    dragRef.current = { x: e.clientX, y: e.clientY, lastT: performance.now() };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const v = viewRef.current;
    if (v.dragging && dragRef.current) {
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current = { x: e.clientX, y: e.clientY, lastT: performance.now() };
      v.moved += Math.abs(dx) + Math.abs(dy);
      v.lonOffsetDeg -= dx * 0.35; // drag right, globe turns with you
      v.tiltDeg = Math.max(-40, Math.min(70, v.tiltDeg + dy * 0.25));
      e.currentTarget.style.cursor = "grabbing";
      return;
    }
    e.currentTarget.style.cursor = hitAt(e) ? "pointer" : "grab";
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    viewRef.current.dragging = false;
    e.currentTarget.style.cursor = "grab";
  };

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="h-full w-full touch-none"
        aria-label="global datacenter and API status. drag to rotate, click a pin to open its market"
      />
      <div className="pointer-events-none absolute left-4 top-3">
        <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-fog">
          oracle telemetry · live
        </div>
        <div className="mt-1 flex items-center gap-2 font-mono text-[10px]">
          {down.length > 0 ? (
            <>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-down" />
              <span className="text-down">
                {down.length} service{down.length > 1 ? "s" : ""} down: {down.map((d) => d.label).join(", ")}
              </span>
            </>
          ) : confirming.length > 0 ? (
            <>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-gold" />
              <span className="text-gold">
                confirming degradation on {confirming.map((d) => d.label).join(", ")}
              </span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-up" />
              <span className="text-updim">all monitored regions nominal</span>
            </>
          )}
        </div>
      </div>

      {/* live per-service legend: green up, yellow deciding, red confirmed down */}
      {snap && (
        <div className="pointer-events-none absolute right-4 top-3 hidden rounded-md border border-edge bg-white/80 px-3 py-2 backdrop-blur-sm md:block">
          {snap.monitors.map((m) => {
            const h = m.health ?? (m.ok ? "up" : "down");
            return (
              <div key={m.service} className="flex items-center gap-2 py-0.5 font-mono text-[9px]">
                <span
                  className={[
                    "inline-block h-1.5 w-1.5 rounded-full",
                    h === "down"
                      ? "animate-pulse bg-down"
                      : h === "confirming"
                        ? "animate-pulse bg-gold"
                        : h === "unknown"
                          ? "bg-edge2"
                          : "bg-up",
                  ].join(" ")}
                />
                <span
                  className={
                    h === "down"
                      ? "font-semibold text-down"
                      : h === "confirming"
                        ? "font-semibold text-gold"
                        : "text-fog"
                  }
                >
                  {m.label}
                </span>
                <span className="ml-auto pl-3 text-fog/60">
                  {h === "up" && (m.latencyMs !== null ? `${m.latencyMs}ms` : "feed ok")}
                  {h === "confirming" && "checking"}
                  {h === "down" && (m.indicator ?? "down")}
                  {h === "unknown" && "no data"}
                </span>
              </div>
            );
          })}
          <div className="mt-1.5 flex items-center gap-3 border-t border-edge pt-1.5 font-mono text-[8px] text-fog/70">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-up" /> up
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> confirming
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-down" /> down
            </span>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-4 font-mono text-[9px] text-fog/70">
        drag to spin · click a pin to trade its market{expandable ? " · click open water to expand" : ""}
      </div>

      {/* fullscreen overlay */}
      {expandable && fullscreen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-ink/98 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-edge px-5 py-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.25em] text-fog">
              cumulus · global downtime map
            </div>
            <button
              onClick={() => setFullscreen(false)}
              className="rounded-sm border border-edge px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-fog hover:border-edge2 hover:text-bone"
            >
              close (esc)
            </button>
          </div>
          <div className="relative min-h-0 flex-1">
            <DowntimeGlobe expandable={false} />
          </div>
        </div>
      )}
    </div>
  );
}
