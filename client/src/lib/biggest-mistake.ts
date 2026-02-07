/**
 * Today's Biggest Mistake — behavioral regret engine.
 * One primary mistake per day, deterministic from regime / volatility / policy.
 * Informational context only; not investment advice.
 */

export type BiggestMistakeType =
  | "overtrading_chop"
  | "chasing_breakouts"
  | "fighting_trend"
  | "ignoring_event_risk"
  | "oversizing_positions"
  | "forcing_conviction"
  | "panic_reacting";

export type BiggestMistakeResult = {
  mistake: BiggestMistakeType;
  headline: string;
  explanation: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  drivers: {
    regime?: string;
    volatility?: "low" | "medium" | "high";
    policyRisk?: "low" | "medium" | "high";
    fedTone?: string;
  };
};

const COPY: Record<
  BiggestMistakeType,
  { headline: string; explanation: string; defaultSeverity: "low" | "medium" | "high" }
> = {
  ignoring_event_risk: {
    headline: "Trading as if price action is purely technical",
    explanation:
      "Policy-driven moves are dominating today. The biggest mistake is trading as if price action is purely technical.",
    defaultSeverity: "high",
  },
  overtrading_chop: {
    headline: "Overtrading in chop",
    explanation:
      "High volatility without directional follow-through tends to punish frequent trading.",
    defaultSeverity: "high",
  },
  chasing_breakouts: {
    headline: "Chasing low-quality breakouts",
    explanation:
      "Volatility is elevated and regime signals are mixed. Late entries and forced momentum trades tend to underperform.",
    defaultSeverity: "medium",
  },
  fighting_trend: {
    headline: "Fighting momentum",
    explanation:
      "Markets reward alignment today. Fighting momentum is a common source of losses.",
    defaultSeverity: "medium",
  },
  forcing_conviction: {
    headline: "Forcing strong conviction trades",
    explanation:
      "Signals lack agreement today. Forcing strong conviction trades often leads to regret.",
    defaultSeverity: "medium",
  },
  oversizing_positions: {
    headline: "Oversizing positions",
    explanation:
      "Defensive environments punish oversized positions more than poor entries.",
    defaultSeverity: "high",
  },
  panic_reacting: {
    headline: "Reacting to short-term noise",
    explanation:
      "Conditions favor patience. Panic reacting to headlines or intraday moves tends to cost more than it helps.",
    defaultSeverity: "medium",
  },
};

function clamp(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export interface BiggestMistakeInput {
  regime?: string;
  volatility?: "low" | "medium" | "high" | "unknown";
  policyRisk?: "low" | "medium" | "high" | "unknown";
  fedTone?: string;
  /** Base confidence (e.g. from Action Lens); will be penalized and capped */
  baseConfidence?: number;
  missing?: string[];
}

/**
 * Deterministic: one primary mistake per day. Priority order:
 * 1) Policy shock / high policy risk → ignoring_event_risk
 * 2) High vol + not Risk-On → overtrading_chop
 * 3) Regime-specific: Risk-On → fighting_trend, Neutral → forcing_conviction, Risk-Off → oversizing_positions
 * 4) Default → forcing_conviction
 */
export function computeBiggestMistake(input: BiggestMistakeInput): BiggestMistakeResult {
  const regime = (input.regime ?? "Neutral").trim() || "Neutral";
  const vol = input.volatility === "unknown" ? undefined : input.volatility;
  const policy =
    input.policyRisk === "unknown" ? undefined : (input.policyRisk as "low" | "medium" | "high" | undefined);

  let mistake: BiggestMistakeType = "forcing_conviction";
  let severity: BiggestMistakeResult["severity"] = "medium";

  if (policy === "high" || regime === "Policy Shock") {
    mistake = "ignoring_event_risk";
    severity = COPY.ignoring_event_risk.defaultSeverity;
  } else if (vol === "high" && regime !== "Risk-On") {
    mistake = "overtrading_chop";
    severity = COPY.overtrading_chop.defaultSeverity;
  } else if (regime === "Risk-On" && vol !== "high") {
    mistake = "fighting_trend";
    severity = COPY.fighting_trend.defaultSeverity;
  } else if (regime === "Neutral" && vol !== "low") {
    mistake = "forcing_conviction";
    severity = COPY.forcing_conviction.defaultSeverity;
  } else if (regime === "Risk-Off") {
    mistake = "oversizing_positions";
    severity = COPY.oversizing_positions.defaultSeverity;
  } else {
    mistake = "forcing_conviction";
    severity = COPY.forcing_conviction.defaultSeverity;
  }

  const copy = COPY[mistake];
  let confidence = clamp(input.baseConfidence ?? 50);
  if (input.missing?.includes("volatility")) confidence -= 15;
  if (input.missing?.includes("policy")) confidence -= 15;
  confidence = Math.min(85, clamp(confidence));

  return {
    mistake,
    headline: copy.headline,
    explanation: copy.explanation,
    severity,
    confidence,
    drivers: {
      regime: regime || undefined,
      volatility: vol,
      policyRisk: policy,
      fedTone: input.fedTone || undefined,
    },
  };
}

/** Behavioral badge: Stand Down / Trade Light / Selective Risk (maps from Red / Yellow / Green) */
export type HeroBadgeBehavioral = "Stand Down" | "Trade Light" | "Selective Risk";

export interface HeroCopyResult {
  primaryLine: string;
  secondaryLine: string;
  badgeBehavioral: HeroBadgeBehavioral;
}

const PRIMARY_LINES: Record<string, string> = {
  "risk-off-high": "Today punishes impatience more than it rewards conviction.",
  "risk-off": "The most expensive mistake today is forcing trades without edge.",
  "policy-shock": "Today looks active, but edge is thinner than it appears.",
  "risk-on-low-vol": "Markets are reactive today — late entries tend to get punished.",
  "neutral-mixed": "Doing nothing today is safer than being early or late.",
  default: "The most expensive mistake today is forcing trades without edge.",
};

function getPrimaryLine(regime: string, vol: string | undefined, policy: string | undefined): string {
  if (regime === "Policy Shock") return PRIMARY_LINES["policy-shock"];
  if (regime === "Risk-Off") return policy === "high" ? PRIMARY_LINES["risk-off-high"] : PRIMARY_LINES["risk-off"];
  if (regime === "Risk-On" && vol === "low") return PRIMARY_LINES["risk-on-low-vol"];
  if (regime === "Neutral" && (vol === "medium" || vol === "high")) return PRIMARY_LINES["neutral-mixed"];
  return PRIMARY_LINES.default;
}

function getSecondaryLine(vol: string | undefined, policy: string | undefined, regime: string): string {
  const parts: string[] = [];
  if (policy === "high" || regime === "Policy Shock") parts.push("Policy risk is elevated");
  else if (policy === "medium") parts.push("Policy risk is moderate");
  if (vol === "high") parts.push("volatility is elevated");
  else if (vol === "low") parts.push("volatility is compressed");
  else if (vol === "medium") parts.push("volatility is unstable");
  if (regime === "Neutral") parts.push("regime signals are mixed");
  else if (regime === "Risk-On") parts.push("momentum is fragile");
  if (parts.length === 0) return "Regime and volatility context is limited.";
  return parts.join(", ") + ".";
}

/**
 * Regret-focused hero copy. Maps internal level (Red/Yellow/Green) to behavioral badge.
 */
export function getHeroCopy(input: {
  regime?: string;
  volatility?: "low" | "medium" | "high" | "unknown";
  policyRisk?: "low" | "medium" | "high" | "unknown";
  /** Internal level for badge mapping */
  level: "Red" | "Yellow" | "Green";
}): HeroCopyResult {
  const regime = (input.regime ?? "Neutral").trim() || "Neutral";
  const vol =
    input.volatility === "unknown" ? undefined : input.volatility;
  const policy =
    input.policyRisk === "unknown" ? undefined : input.policyRisk;

  const primaryLine = getPrimaryLine(regime, vol, policy);
  const secondaryLine = getSecondaryLine(vol, policy, regime);
  const badgeBehavioral: HeroBadgeBehavioral =
    input.level === "Red" ? "Stand Down" : input.level === "Green" ? "Selective Risk" : "Trade Light";

  return { primaryLine, secondaryLine, badgeBehavioral };
}
