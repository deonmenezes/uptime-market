const { cost, priceYes, sharesForSpend, costForShares, proceedsForSale, seedForPrice } = require("../.lmsr-build/lmsr.js");
const assert = (c, msg) => { if (!c) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok:", msg); };
const b = 250000;

// 1. price bounds + YES/NO complement
for (const [qy, qn] of [[0,0],[500000,-200000],[-463391.7,4576.7],[1e6,0],[0,1e6]]) {
  const p = priceYes(qy, qn, b);
  assert(p > 0 && p < 1, `price in (0,1) for q=(${qy},${qn}) -> ${p}`);
  const pNo = priceYes(qn, qy, b); // NO price = symmetric
  assert(Math.abs(p + pNo - 1) < 1e-12, `YES+NO=1 (${p}+${pNo})`);
}

// 2. seedForPrice opens at requested probability
for (const p0 of [0.07, 0.12, 0.5, 0.9]) {
  const { qYes, qNo } = seedForPrice(p0, b);
  assert(Math.abs(priceYes(qYes, qNo, b) - p0) < 1e-9, `seed opens at ${p0}`);
}

// 3. demo script: $50K of COVERAGE (=50,000 YES shares via hedge flow) from 12% -> ~14%
{
  const { qYes, qNo } = seedForPrice(0.12, b);
  const coverage = 50000; // hedge: coverage dollars = YES shares (see executeHedge)
  const premium = costForShares(qYes, qNo, b, "YES", coverage);
  const pAfter = priceYes(qYes + coverage, qNo, b);
  assert(premium > 5000 && premium < 8000, `premium for $50K coverage ~ $${Math.round(premium)} (12-13% rate)`);
  assert(pAfter > 0.13 && pAfter < 0.15, `$50K coverage moves 12% -> ${(pAfter*100).toFixed(2)}% (expect ~14%)`);
}

// 4. buy/quote consistency: costForShares(sharesForSpend(x)) == x
{
  const { qYes, qNo } = seedForPrice(0.12, b);
  const sh = sharesForSpend(qYes, qNo, b, "YES", 12345.67);
  const c = costForShares(qYes, qNo, b, "YES", sh);
  assert(Math.abs(c - 12345.67) < 1e-6, `spend->shares->cost round-trip (${c})`);
}

// 5. sell round-trip returns exactly the spend (no fee in LMSR itself)
{
  const { qYes, qNo } = seedForPrice(0.3, b);
  const sh = sharesForSpend(qYes, qNo, b, "NO", 9999);
  const back = proceedsForSale(qYes, qNo + sh, b, "NO", sh);
  assert(Math.abs(back - 9999) < 1e-6, `buy-then-sell returns spend (${back})`);
}

// 6. bounded loss: worst-case subsidy = b*ln2 from a 50/50 start
{
  const c0 = cost(0, 0, b);
  assert(Math.abs(c0 - b * Math.LN2) < 1e-6, `C(0,0) = b*ln2 = $${Math.round(b*Math.LN2).toLocaleString()}`);
  // settle YES after huge one-sided buying: max payout - collected <= b*ln2
  let qy = 0, qn = 0, collected = 0;
  for (let i = 0; i < 50; i++) { const sh = sharesForSpend(qy, qn, b, "YES", 1e6); collected += 1e6; qy += sh; }
  const maxLoss = qy - collected; // pay $1/share on YES
  assert(maxLoss <= b * Math.LN2 + 1e-6, `realized loss ${Math.round(maxLoss)} <= b*ln2 ${Math.round(b*Math.LN2)}`);
}

// 7. monotonicity: bigger trades move price more
{
  const { qYes, qNo } = seedForPrice(0.12, b);
  const p1 = priceYes(qYes + sharesForSpend(qYes, qNo, b, "YES", 1000), qNo, b);
  const p2 = priceYes(qYes + sharesForSpend(qYes, qNo, b, "YES", 100000), qNo, b);
  assert(p2 > p1 && p1 > 0.12, `monotone impact: ${(p1*100).toFixed(2)}% < ${(p2*100).toFixed(2)}%`);
}
console.log(process.exitCode ? "TESTS FAILED" : "ALL LMSR INVARIANTS PASS");
