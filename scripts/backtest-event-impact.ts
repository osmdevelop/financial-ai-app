/**
 * Event Impact Engine — Backtest pipeline
 *
 * Given historical event dates + price history, computes EventImpactStats
 * (mean % move over 24h/48h, std dev, 10th/90th percentiles) per (eventType, asset, horizon).
 *
 * Usage: npx tsx scripts/backtest-event-impact.ts
 * Reads: infra/dev/event-dates.history.json
 * Writes: infra/dev/event-impact-stats.json
 *
 * Price data: uses deterministic synthetic daily (weekday) series so the script
 * runs without Alpha Vantage. Replace with real price fetch to get live stats.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { EventImpactStats } from "../shared/schema.js";

// Run from project root: npx tsx scripts/backtest-event-impact.ts
const ROOT = process.cwd();
const EVENT_DATES_PATH = join(ROOT, "infra/dev/event-dates.history.json");
const OUTPUT_PATH = join(ROOT, "infra/dev/event-impact-stats.json");

const ASSETS = ["SPY", "TLT", "UUP", "BTC"] as const;
const HORIZONS = [24, 48] as const;

// --- Weekday-only date helpers (US market: no weekends) ---
function isWeekday(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** All weekdays in [start, end] */
function weekdaysBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    if (isWeekday(cur)) out.push(dateStr(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/** Previous trading day (weekday before d) */
function prevTradingDay(d: Date): Date {
  let cur = new Date(d);
  cur.setDate(cur.getDate() - 1);
  while (!isWeekday(cur)) cur.setDate(cur.getDate() - 1);
  return cur;
}

/** Next N trading days after d (d can be any day) */
function nextTradingDays(d: Date, n: number): Date[] {
  const out: Date[] = [];
  let cur = new Date(d);
  for (let i = 0; i < n; i++) {
    cur.setDate(cur.getDate() + 1);
    while (!isWeekday(cur)) cur.setDate(cur.getDate() + 1);
    out.push(new Date(cur));
  }
  return out;
}

// --- Deterministic seeded random (simple LCG) ---
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Generate synthetic daily close series for one symbol (weekdays only). */
function generatePriceSeries(
  symbol: string,
  tradingDays: string[],
  seed: number
): Map<string, number> {
  const rng = seededRandom(seed);
  const base: Record<string, number> = { SPY: 380, TLT: 95, UUP: 28, BTC: 22000 };
  const startPrice = base[symbol] ?? 100;
  const map = new Map<string, number>();
  let price = startPrice;
  for (const d of tradingDays) {
    const ret = (rng() - 0.5) * 0.02; // ±1% daily
    price = price * (1 + ret);
    map.set(d, Math.round(price * 100) / 100);
  }
  return map;
}

function loadEventDates(): { eventType: string; date: string }[] {
  const raw = readFileSync(EVENT_DATES_PATH, "utf8");
  const data = JSON.parse(raw) as { events: { eventType: string; date: string }[] };
  return data.events;
}

function main() {
  const start = new Date("2022-01-01");
  const end = new Date("2024-12-31");
  const tradingDays = weekdaysBetween(start, end);

  const pricesBySymbol = new Map<string, Map<string, number>>();
  ASSETS.forEach((sym, i) => {
    pricesBySymbol.set(sym, generatePriceSeries(sym, tradingDays, 42 + i * 1000));
  });

  const events = loadEventDates();
  const set = new Set(tradingDays);

  // Returns in %: (closeAfter - closeBefore) / closeBefore * 100
  type ReturnRecord = { eventType: string; assetId: string; horizonHours: 24 | 48; returnPct: number };
  const returns: ReturnRecord[] = [];

  for (const { eventType, date } of events) {
    const eventDate = new Date(date);
    const prev = prevTradingDay(eventDate);
    const prevStr = dateStr(prev);
    const [next1, next2] = nextTradingDays(eventDate, 2);
    const next1Str = dateStr(next1);
    const next2Str = dateStr(next2);

    if (!set.has(prevStr) || !set.has(next1Str) || !set.has(next2Str)) continue;

    for (const assetId of ASSETS) {
      const prices = pricesBySymbol.get(assetId)!;
      const closeBefore = prices.get(prevStr)!;
      const close24 = prices.get(next1Str)!;
      const close48 = prices.get(next2Str)!;
      if (closeBefore == null || close24 == null || close48 == null) continue;

      const ret24 = ((close24 - closeBefore) / closeBefore) * 100;
      const ret48 = ((close48 - closeBefore) / closeBefore) * 100;
      returns.push({ eventType, assetId, horizonHours: 24, returnPct: ret24 });
      returns.push({ eventType, assetId, horizonHours: 48, returnPct: ret48 });
    }
  }

  // Aggregate by (eventType, assetId, horizonHours)
  const key = (e: string, a: string, h: number) => `${e}|${a}|${h}`;
  const byKey = new Map<string, number[]>();
  for (const r of returns) {
    const k = key(r.eventType, r.assetId, r.horizonHours);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(r.returnPct);
  }

  const stats: EventImpactStats[] = [];
  const now = new Date().toISOString();

  for (const [k, arr] of byKey) {
    if (arr.length < 2) continue;
    const [eventType, assetId, horizonStr] = k.split("|");
    const horizonHours = parseInt(horizonStr, 10) as 24 | 48;

    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((s, x) => s + x, 0) / arr.length;
    const variance = arr.reduce((s, x) => s + (x - mean) ** 2, 0) / arr.length;
    const stdDevPct = Math.sqrt(variance);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const p90 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.9))];

    stats.push({
      eventType,
      assetId,
      horizonHours,
      meanMovePct: Math.round(mean * 100) / 100,
      stdDevPct: Math.round(stdDevPct * 100) / 100,
      percentile10Pct: Math.round(p10 * 100) / 100,
      percentile90Pct: Math.round(p90 * 100) / 100,
      sampleCount: arr.length,
      lastUpdated: now,
    });
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(stats, null, 2), "utf8");
  console.log(`Wrote ${stats.length} EventImpactStats to ${OUTPUT_PATH}`);
}

main();
