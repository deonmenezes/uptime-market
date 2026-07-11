// Hanson's Logarithmic Market Scoring Rule for binary markets.
// C(q) = b * ln(e^(qYes/b) + e^(qNo/b))
// price(YES) = e^(qYes/b) / (e^(qYes/b) + e^(qNo/b))

export function cost(qYes: number, qNo: number, b: number): number {
  // log-sum-exp with max-subtraction for numerical stability
  const m = Math.max(qYes, qNo);
  return m + b * Math.log(Math.exp((qYes - m) / b) + Math.exp((qNo - m) / b));
}

export function priceYes(qYes: number, qNo: number, b: number): number {
  return 1 / (1 + Math.exp((qNo - qYes) / b));
}

// Shares received when spending `credits` on `side`.
// Solves C(q + delta) - C(q) = credits for delta in closed form.
export function sharesForSpend(
  qYes: number,
  qNo: number,
  b: number,
  side: "YES" | "NO",
  credits: number
): number {
  const qSame = side === "YES" ? qYes : qNo;
  const qOther = side === "YES" ? qNo : qYes;
  // e^((qSame+d)/b) = e^(c/b) * (e^(qSame/b) + e^(qOther/b)) - e^(qOther/b)
  const m = Math.max(qSame, qOther);
  const eSame = Math.exp((qSame - m) / b);
  const eOther = Math.exp((qOther - m) / b);
  const target = Math.exp(credits / b) * (eSame + eOther) - eOther;
  if (target <= 0) return 0;
  const dq = m + b * Math.log(target) - qSame;
  return Math.max(0, dq);
}

// Credits received for selling `shares` of `side` (shares must be <= holding).
export function proceedsForSale(
  qYes: number,
  qNo: number,
  b: number,
  side: "YES" | "NO",
  shares: number
): number {
  const before = cost(qYes, qNo, b);
  const after =
    side === "YES" ? cost(qYes - shares, qNo, b) : cost(qYes, qNo - shares, b);
  return Math.max(0, before - after);
}

// Seed quantities so a fresh market opens at probability p.
export function seedForPrice(p: number, b: number): { qYes: number; qNo: number } {
  const clamped = Math.min(0.99, Math.max(0.01, p));
  return { qYes: b * Math.log(clamped / (1 - clamped)), qNo: 0 };
}
