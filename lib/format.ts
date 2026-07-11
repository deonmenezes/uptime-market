export function fmtPct(p: number): string {
  const v = p * 100;
  return `${v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)}%`;
}

export function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 100_000) return `$${Math.round(n / 1000)}K`;
  if (abs >= 10_000) return `$${(n / 1000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function fmtUsdFull(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

export function timeAgo(ts: number, now: number): string {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
