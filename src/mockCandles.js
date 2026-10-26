// Deterministic simulated intraday candles for the static demo.
// Prices use a seeded pseudo-random walk instead of a sine wave, so the chart
// has irregular candle bodies, varied wicks, and occasional short reversals.
// This is synthetic data only; it is not live or historical market data.

const IST_OFFSET_SECONDS = 5.5 * 60 * 60;
const now = new Date();
const istDate = new Date(now.getTime() + IST_OFFSET_SECONDS * 1000);
const year = istDate.getUTCFullYear();
const month = istDate.getUTCMonth();
const day = istDate.getUTCDate();

// 09:15 IST represented as Unix seconds.
const sessionStart = Math.floor(Date.UTC(year, month, day, 3, 45, 0) / 1000);

// Seed by date so the chart stays identical on repeated reloads that day,
// while rolling forward to a new deterministic pattern on the next date.
let seed = Number(`${year}${String(month + 1).padStart(2, "0")}${String(day).padStart(2, "0")}`);
function random() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}

const round2 = (value) => Number(value.toFixed(2));
const candleCount = 75;
const candles = [];
let previousClose = 17.5;
let shortTrend = 0;

// Small, irregular movements with occasional trend changes. Values are tuned
// for a ₹16–₹19 option-premium demo without perfectly smooth waves.
for (let i = 0; i < candleCount; i++) {
  if (i > 0 && i % 8 === 0) {
    shortTrend = (random() - 0.5) * 0.12;
  }

  const open = previousClose;
  const noise = (random() + random() + random() - 1.5) * 0.22;
  const close = Math.max(15.8, Math.min(19.2, open + noise + shortTrend));

  // Wicks vary independently; most are modest, with occasional longer spikes.
  const upperWick = 0.04 + random() * 0.22 + (random() > 0.92 ? random() * 0.18 : 0);
  const lowerWick = 0.04 + random() * 0.22 + (random() > 0.92 ? random() * 0.18 : 0);
  const high = Math.min(19.45, Math.max(open, close) + upperWick);
  const low = Math.max(15.55, Math.min(open, close) - lowerWick);

  candles.push({
    time: sessionStart + i * 300,
    open: round2(open),
    high: round2(Math.max(high, open, close)),
    low: round2(Math.min(low, open, close)),
    close: round2(close),
  });

  previousClose = close;
}

export default candles;
