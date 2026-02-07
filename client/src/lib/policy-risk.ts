/**
 * Aggregate policy risk: Trump index + GDELT policy/news intensity.
 * Null-safe; deterministic level aggregation (max when both present).
 */

export type PolicyRiskLevel = "low" | "medium" | "high" | "unknown";

export interface PolicyRiskResult {
  level: PolicyRiskLevel;
  score?: number;
  basis: { trump?: boolean; news?: boolean };
}

function levelOrder(l: PolicyRiskLevel): number {
  switch (l) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

function maxLevel(a: PolicyRiskLevel, b: PolicyRiskLevel): PolicyRiskLevel {
  return levelOrder(a) >= levelOrder(b) ? a : b;
}

/**
 * Trump Z-score to risk level:
 * |z| < 1.0 => low, 1.0–1.5 => medium, >= 1.5 => high
 */
function trumpZToLevel(z: number): PolicyRiskLevel {
  const abs = Math.abs(z);
  if (abs >= 1.5) return "high";
  if (abs >= 1.0) return "medium";
  return "low";
}

/**
 * Policy news intensity (0–100 normalized): < 35 low, 35–65 medium, > 65 high
 */
function newsIntensityToLevel(intensity: number): PolicyRiskLevel {
  if (intensity < 35) return "low";
  if (intensity <= 65) return "medium";
  return "high";
}

function safeNumber(n: unknown): number | null {
  if (n == null) return null;
  const x = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(x) || !Number.isFinite(x)) return null;
  return x;
}

/**
 * Compute aggregated policy risk from Trump Z and optional policy news intensity.
 */
export function computePolicyRisk(input: {
  trumpZ?: number | null;
  policyNewsIntensity?: number | null; // 0–100
}): PolicyRiskResult {
  const trumpZ = safeNumber(input.trumpZ);
  const newsIntensity = safeNumber(input.policyNewsIntensity);

  const basis: { trump?: boolean; news?: boolean } = {};
  let levelTrump: PolicyRiskLevel | null = null;
  let levelNews: PolicyRiskLevel | null = null;

  if (trumpZ !== null) {
    basis.trump = true;
    levelTrump = trumpZToLevel(trumpZ);
  }
  if (newsIntensity !== null && newsIntensity >= 0 && newsIntensity <= 100) {
    basis.news = true;
    levelNews = newsIntensityToLevel(newsIntensity);
  }

  if (levelTrump != null && levelNews != null) {
    const level = maxLevel(levelTrump, levelNews);
    const score = (trumpZ != null && newsIntensity != null)
      ? Math.round((Math.abs(trumpZ) * 20 + newsIntensity) / 2)
      : undefined;
    return { level, score, basis };
  }
  if (levelTrump != null) {
    return {
      level: levelTrump,
      score: trumpZ != null ? Math.round(Math.abs(trumpZ) * 25) : undefined,
      basis,
    };
  }
  if (levelNews != null) {
    return {
      level: levelNews,
      score: newsIntensity != null ? Math.round(newsIntensity) : undefined,
      basis,
    };
  }

  return { level: "unknown", basis: {} };
}
