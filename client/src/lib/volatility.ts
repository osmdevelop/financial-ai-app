/**
 * Real volatility proxy: VIX or realized vol from SPY.
 * Never use sentiment score as volatility. Null-safe; never returns NaN.
 */

export type VolatilityLevel = "low" | "medium" | "high" | "unknown";

export interface VolatilityResult {
  level: VolatilityLevel;
  value?: number;
  basis: "vix" | "realized" | "none";
  asOf?: string;
}

const VIX_LOW = 16;
const VIX_MEDIUM_MAX = 22;
const REALIZED_LOW = 0.15;
const REALIZED_MEDIUM_MAX = 0.25;
const TRADING_DAYS = 252;

function safeNumber(n: unknown): number | null {
  if (n == null) return null;
  const x = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(x) || !Number.isFinite(x)) return null;
  return x;
}

/**
 * Compute annualized realized volatility from daily closes (oldest first).
 * Uses 20d returns; annualizes with sqrt(252). Returns null if insufficient data or invalid.
 */
function realizedVolFromCloses(closes: number[]): number | null {
  if (!Array.isArray(closes) || closes.length < 2) return null;
  const n = Math.min(20, closes.length);
  const slice = closes.slice(0, n);
  const returns: number[] = [];
  for (let i = 1; i < slice.length; i++) {
    const r = Math.log(slice[i] / slice[i - 1]);
    if (!Number.isFinite(r)) return null;
    returns.push(r);
  }
  if (returns.length === 0) return null;
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
  const ann = Math.sqrt(variance * TRADING_DAYS);
  return Number.isFinite(ann) ? ann : null;
}

/**
 * Compute volatility level from VIX and/or SPY daily closes.
 * Priority: VIX if available → else realized vol from SPY (20d) → else unknown.
 */
export function computeVolatilityLevel(input: {
  vix?: number | null;
  spyDailyCloses?: number[] | null;
  asOf?: string | null;
}): VolatilityResult {
  const asOf = input.asOf ?? undefined;

  const vix = safeNumber(input.vix);
  if (vix !== null && vix >= 0) {
    const level: VolatilityLevel =
      vix < VIX_LOW ? "low" : vix <= VIX_MEDIUM_MAX ? "medium" : "high";
    return { level, value: vix, basis: "vix", asOf };
  }

  const closes = input.spyDailyCloses;
  if (Array.isArray(closes) && closes.length >= 2) {
    const rev = [...closes].reverse();
    const ann = realizedVolFromCloses(rev);
    if (ann !== null) {
      const level: VolatilityLevel =
        ann < REALIZED_LOW ? "low" : ann <= REALIZED_MEDIUM_MAX ? "medium" : "high";
      return { level, value: ann, basis: "realized", asOf };
    }
  }

  return { level: "unknown", basis: "none", asOf };
}
