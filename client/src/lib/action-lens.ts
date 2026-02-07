/**
 * Action Lens: converts market regime, volatility, policy risk, and Fed tone
 * into non-prescriptive decision posture guidance. Informational only; not trade signals.
 */

export type ActionLensResult = {
  posture: "defensive" | "balanced" | "aggressive";
  playbook: "trend" | "range" | "chop" | "event-risk";
  leverage: "avoid" | "normal" | "cautious";
  summary: string;
  bullets: string[];
  reasons: { key: string; label: string; value?: string }[];
  confidence: number;
  /** True when live mode but required inputs missing; copy should reflect risk control default */
  insufficientData?: boolean;
  /** True when in demo mode (confidence capped, show Demo context in Evidence) */
  isDemoContext?: boolean;
};

export type PolicyRiskInput = "low" | "medium" | "high" | "unknown";
export type FedToneInput = "dovish" | "neutral" | "hawkish" | "unknown";
export type VolLevelInput = "low" | "medium" | "high" | "unknown";

export type ActionLensInput = {
  regime?: string;
  regimeConfidence?: number;
  policyRisk?: PolicyRiskInput;
  fedTone?: FedToneInput;
  volatility?: {
    level?: VolLevelInput;
    basis?: "vix" | "realized" | "none";
    vix?: number | null;
  };
  dataStatus?: {
    isMock?: boolean;
    isPartial?: boolean;
    missing?: string[];
  };
  /** Required for trust gating: "live" | "demo" */
  dataMode?: "live" | "demo";
  /** List of missing required input keys (e.g. "volatility", "policy", "regime") */
  missing?: string[];
};

const POSTURE_ORDER: Array<ActionLensResult["posture"]> = ["defensive", "balanced", "aggressive"];

function clampConfidence(n: number): number {
  if (typeof n !== "number" || Number.isNaN(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeVolLevel(level: VolLevelInput | undefined): VolLevelInput {
  if (level === "low" || level === "medium" || level === "high" || level === "unknown") return level;
  return "unknown";
}

function normalizePolicyRisk(p: PolicyRiskInput | undefined): PolicyRiskInput {
  if (p === "low" || p === "medium" || p === "high" || p === "unknown") return p;
  return "unknown";
}

function normalizeFedTone(t: FedToneInput | undefined): FedToneInput {
  if (t === "dovish" || t === "neutral" || t === "hawkish" || t === "unknown") return t;
  return "unknown";
}

const PENALTY_MISSING_VOLATILITY = 15;
const PENALTY_MISSING_POLICY = 15;
const PENALTY_MISSING_FED = 10;
const DEMO_CONFIDENCE_CAP = 45;

/** Required to produce normal output: regime + confidence, volatility level, policy risk. Fed optional but improves confidence. */
export function getRequiredMissing(input: ActionLensInput): string[] {
  const missing: string[] = [];
  if (input.regime == null || input.regimeConfidence == null) missing.push("regime");
  const volLevel = normalizeVolLevel(input.volatility?.level);
  if (volLevel === "unknown") missing.push("volatility");
  const policyRisk = normalizePolicyRisk(input.policyRisk);
  if (policyRisk === "unknown") missing.push("policy");
  return missing;
}

/**
 * Pure function: compute Action Lens from regime, volatility, policy risk, and Fed tone.
 * Data-consistency contract: confidence and output gating based on input coverage and data mode.
 * Deterministic; null-safe. Output is informational only, not investment advice.
 */
export function computeActionLens(input: ActionLensInput): ActionLensResult {
  const dataMode = input.dataMode ?? "live";
  const missingList = input.missing ?? getRequiredMissing(input);
  const hasRequired = missingList.length === 0;
  const isDemo = dataMode === "demo";

  const regime = (input.regime ?? "Neutral").trim() || "Neutral";
  let confidence = clampConfidence(input.regimeConfidence ?? 50);
  const policyRisk = normalizePolicyRisk(input.policyRisk);
  const fedTone = normalizeFedTone(input.fedTone);
  const volLevel = normalizeVolLevel(input.volatility?.level);

  confidence -= missingList.includes("volatility") ? PENALTY_MISSING_VOLATILITY : 0;
  confidence -= missingList.includes("policy") ? PENALTY_MISSING_POLICY : 0;
  confidence -= fedTone === "unknown" ? PENALTY_MISSING_FED : 0;
  if (isDemo) confidence = Math.min(confidence, DEMO_CONFIDENCE_CAP);
  confidence = clampConfidence(confidence);

  const insufficientData = !isDemo && !hasRequired;
  const isPolicyShock = regime === "Policy Shock";
  const isHighPolicyRisk = policyRisk === "high";
  const isHighVol = volLevel === "high";
  const isLowVol = volLevel === "low";
  const isNeutralRegime = regime === "Neutral";
  const isRiskOn = regime === "Risk-On";
  const isRiskOff = regime === "Risk-Off";

  const reasons: ActionLensResult["reasons"] = [];
  reasons.push({ key: "regime", label: "Regime", value: regime });
  reasons.push({ key: "confidence", label: "Confidence", value: `${confidence}%` });
  reasons.push({ key: "volatility", label: "Volatility", value: volLevel });
  reasons.push({ key: "policyRisk", label: "Policy risk", value: policyRisk });
  reasons.push({ key: "fedTone", label: "Fed tone", value: fedTone });

  // —— Base posture from regime (overridden below if insufficientData) ——
  let posture: ActionLensResult["posture"] = "balanced";
  if (isPolicyShock) {
    posture = "defensive";
  } else if (isRiskOff) {
    posture = "defensive";
  } else if (isRiskOn) {
    posture = isHighVol || isHighPolicyRisk ? "balanced" : "aggressive";
  } else if (isNeutralRegime || regime === "Stagflation") {
    posture = "balanced";
    if (isHighVol) posture = "defensive";
    else if (isLowVol) posture = "balanced"; // keep balanced; low vol only nudges when we apply fed
    if (fedTone === "hawkish") posture = POSTURE_ORDER[Math.max(0, POSTURE_ORDER.indexOf(posture) - 1)];
    else if (fedTone === "dovish" && posture === "balanced") posture = "balanced"; // slightly less defensive = stay balanced
  }

  // Volatility modifier: high vol pushes 1 step more defensive (Policy Shock already defensive)
  if (isHighVol && !isPolicyShock && posture !== "defensive") {
    const idx = POSTURE_ORDER.indexOf(posture);
    posture = POSTURE_ORDER[Math.max(0, idx - 1)];
  }
  if (isLowVol && !isPolicyShock && !isHighPolicyRisk && posture === "balanced" && isRiskOn) {
    posture = "aggressive";
  }

  // —— Playbook ——
  let playbook: ActionLensResult["playbook"] = "range";
  if (isPolicyShock || isHighPolicyRisk) {
    playbook = "event-risk";
  } else if (isRiskOn && !isHighVol) {
    playbook = "trend";
  } else if (isNeutralRegime) {
    if (isHighVol) playbook = "chop";
    else if (volLevel === "medium" || isLowVol) playbook = "range";
    else playbook = "range";
  } else if (isRiskOff) {
    playbook = isHighVol ? "chop" : "range";
  } else {
    playbook = isHighVol ? "chop" : "range";
  }

  // —— Leverage ——
  let leverage: ActionLensResult["leverage"] = "normal";
  if (isHighPolicyRisk || isHighVol) leverage = "avoid";
  else if (confidence < 50 || policyRisk === "medium") leverage = "cautious";
  else if (isPolicyShock) leverage = "avoid";

  // Build summary and bullets (calm, non-hype, informational only)
  let summary = "";
  const bullets: string[] = [];

  if (insufficientData) {
    posture = "defensive";
    playbook = "range";
    leverage = "cautious";
    summary = "Insufficient data — defaulting to risk control.";
    bullets.push("Key inputs (volatility, policy risk, or regime) are missing.");
    bullets.push("Use caution and smaller sizing until data is available.");
  } else if (posture === "defensive") {
    summary = "Environment favors caution; consider smaller sizing and reduced exposure to volatile names.";
    bullets.push("Favor smaller position sizes.");
    bullets.push("Avoid adding leverage or chasing breakouts.");
    if (playbook === "event-risk") bullets.push("Stay clear of large bets ahead of policy or macro events.");
    else bullets.push("Focus on capital preservation over expansion.");
  } else if (posture === "balanced") {
    summary = "Conditions are mixed; selective positioning and clear risk limits are appropriate.";
    bullets.push("Use normal sizing with defined stop levels.");
    bullets.push("Avoid chasing extended moves.");
    bullets.push("Favor quality and liquidity.");
  } else {
    summary = "Environment supports a constructive stance; risk management and position limits remain important.";
    bullets.push("Trend-following can be considered with strict risk limits.");
    bullets.push("Avoid overconcentration in a single theme.");
    bullets.push("Keep leverage within normal parameters.");
  }

  const finalBullets = bullets.slice(0, 3);

  return {
    posture,
    playbook,
    leverage,
    summary,
    bullets: finalBullets,
    reasons,
    confidence,
    insufficientData: insufficientData || undefined,
    isDemoContext: isDemo || undefined,
  };
}
