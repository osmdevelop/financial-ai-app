import { readFileSync } from "fs";
import { join } from "path";
import type { EventImpactStats, EventImpactPreviewItem } from "@shared/schema";

/**
 * Event Impact Engine: historical impact stats from backtest or static mock.
 * Loads infra/dev/event-impact-stats.json when present (from backtest pipeline);
 * otherwise uses built-in mock.
 */

const DEFAULT_HORIZON = 48;
const LAST_UPDATED = "2025-01-31T00:00:00Z";

function loadStatsFromFile(): EventImpactStats[] | null {
  try {
    const path =
      process.env.EVENT_IMPACT_STATS_PATH ??
      join(process.cwd(), "infra/dev/event-impact-stats.json");
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;
    const first = data[0] as Record<string, unknown>;
    if (
      typeof first?.eventType !== "string" ||
      typeof first?.assetId !== "string" ||
      typeof first?.meanMovePct !== "number"
    )
      return null;
    return data as EventImpactStats[];
  } catch {
    return null;
  }
}

// Backtest output when present; otherwise static mock
const FILE_STATS = loadStatsFromFile();

const MOCK_STATS: EventImpactStats[] = [
  // CPI YoY
  { eventType: "cpi_yoy_us", assetId: "SPY", horizonHours: 24, meanMovePct: -0.4, stdDevPct: 0.8, percentile10Pct: -1.2, percentile90Pct: 0.5, sampleCount: 24, lastUpdated: LAST_UPDATED },
  { eventType: "cpi_yoy_us", assetId: "SPY", horizonHours: 48, meanMovePct: -0.2, stdDevPct: 1.1, percentile10Pct: -1.5, percentile90Pct: 1.0, sampleCount: 24, lastUpdated: LAST_UPDATED },
  { eventType: "cpi_yoy_us", assetId: "BTC", horizonHours: 24, meanMovePct: 1.2, stdDevPct: 2.0, percentile10Pct: -1.5, percentile90Pct: 3.8, sampleCount: 24, lastUpdated: LAST_UPDATED },
  { eventType: "cpi_yoy_us", assetId: "BTC", horizonHours: 48, meanMovePct: 2.3, stdDevPct: 2.5, percentile10Pct: -1.2, percentile90Pct: 5.1, sampleCount: 24, lastUpdated: LAST_UPDATED },
  { eventType: "cpi_yoy_us", assetId: "TLT", horizonHours: 48, meanMovePct: -0.8, stdDevPct: 1.2, percentile10Pct: -2.2, percentile90Pct: 0.4, sampleCount: 24, lastUpdated: LAST_UPDATED },
  { eventType: "cpi_yoy_us", assetId: "UUP", horizonHours: 48, meanMovePct: 0.5, stdDevPct: 0.6, percentile10Pct: -0.2, percentile90Pct: 1.2, sampleCount: 24, lastUpdated: LAST_UPDATED },
  // FOMC
  { eventType: "fomc_decision_us", assetId: "SPY", horizonHours: 24, meanMovePct: 0.6, stdDevPct: 1.5, percentile10Pct: -1.2, percentile90Pct: 2.5, sampleCount: 18, lastUpdated: LAST_UPDATED },
  { eventType: "fomc_decision_us", assetId: "SPY", horizonHours: 48, meanMovePct: 0.4, stdDevPct: 1.8, percentile10Pct: -2.0, percentile90Pct: 2.2, sampleCount: 18, lastUpdated: LAST_UPDATED },
  { eventType: "fomc_decision_us", assetId: "BTC", horizonHours: 48, meanMovePct: 3.1, stdDevPct: 4.0, percentile10Pct: -2.5, percentile90Pct: 8.0, sampleCount: 18, lastUpdated: LAST_UPDATED },
  { eventType: "fomc_decision_us", assetId: "TLT", horizonHours: 48, meanMovePct: -1.2, stdDevPct: 1.8, percentile10Pct: -3.5, percentile90Pct: 1.0, sampleCount: 18, lastUpdated: LAST_UPDATED },
  { eventType: "fomc_decision_us", assetId: "UUP", horizonHours: 48, meanMovePct: 0.3, stdDevPct: 0.8, percentile10Pct: -0.8, percentile90Pct: 1.2, sampleCount: 18, lastUpdated: LAST_UPDATED },
  // NFP
  { eventType: "nfp_us", assetId: "SPY", horizonHours: 48, meanMovePct: 0.3, stdDevPct: 1.0, percentile10Pct: -1.0, percentile90Pct: 1.5, sampleCount: 36, lastUpdated: LAST_UPDATED },
  { eventType: "nfp_us", assetId: "BTC", horizonHours: 48, meanMovePct: 1.8, stdDevPct: 2.2, percentile10Pct: -1.0, percentile90Pct: 4.5, sampleCount: 36, lastUpdated: LAST_UPDATED },
  { eventType: "nfp_us", assetId: "UUP", horizonHours: 48, meanMovePct: 0.4, stdDevPct: 0.5, percentile10Pct: -0.2, percentile90Pct: 1.0, sampleCount: 36, lastUpdated: LAST_UPDATED },
  // PPI
  { eventType: "ppi_yoy_us", assetId: "SPY", horizonHours: 48, meanMovePct: -0.2, stdDevPct: 0.7, percentile10Pct: -1.0, percentile90Pct: 0.6, sampleCount: 24, lastUpdated: LAST_UPDATED },
  { eventType: "ppi_yoy_us", assetId: "TLT", horizonHours: 48, meanMovePct: -0.5, stdDevPct: 0.9, percentile10Pct: -1.5, percentile90Pct: 0.3, sampleCount: 24, lastUpdated: LAST_UPDATED },
];

export const EVENT_IMPACT_STATS: EventImpactStats[] = FILE_STATS ?? MOCK_STATS;

/** Map raw event name + category to canonical eventType */
export function getEventTypeFromEvent(eventName: string, category?: string): string | null {
  const name = (eventName || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  if (name.includes("cpi") || (cat === "inflation" && name.includes("consumer price"))) return "cpi_yoy_us";
  if (name.includes("fomc") || name.includes("fed") && name.includes("rate")) return "fomc_decision_us";
  if (name.includes("non-farm") || name.includes("nonfarm") || name.includes("payroll") || cat === "employment") return "nfp_us";
  if (name.includes("ppi") || (cat === "inflation" && name.includes("producer"))) return "ppi_yoy_us";
  return null;
}

/** Get impact stats for an event type and optional horizon */
export function getImpactStats(eventType: string, horizonHours: number = DEFAULT_HORIZON): EventImpactStats[] {
  return EVENT_IMPACT_STATS.filter(
    (s) => s.eventType === eventType && s.horizonHours === horizonHours
  );
}

/** Get impact preview (top N assets) for an event type, for embedding in calendar */
export function getImpactPreview(
  eventType: string,
  horizonHours: number = DEFAULT_HORIZON,
  limit: number = 3
): EventImpactPreviewItem[] {
  const stats = getImpactStats(eventType, horizonHours);
  return stats
    .slice(0, limit)
    .map((s) => ({
      assetId: s.assetId,
      meanMovePct: s.meanMovePct,
      percentile10Pct: s.percentile10Pct,
      percentile90Pct: s.percentile90Pct,
      horizonHours: s.horizonHours,
    }));
}

/** Get events that have impact stats for a given asset, sorted by |meanMovePct| */
export function getImpactForAsset(
  assetId: string,
  horizonHours: number = DEFAULT_HORIZON
): EventImpactStats[] {
  return EVENT_IMPACT_STATS.filter(
    (s) => s.assetId.toUpperCase() === assetId.toUpperCase() && s.horizonHours === horizonHours
  ).sort((a, b) => Math.abs(b.meanMovePct) - Math.abs(a.meanMovePct));
}
