import { describe, it, expect } from "vitest";
import { computeActionLens, getRequiredMissing } from "../action-lens";

describe("computeActionLens", () => {
  it("Policy Shock override: defensive + event-risk + leverage avoid", () => {
    const result = computeActionLens({
      regime: "Policy Shock",
      regimeConfidence: 80,
      policyRisk: "low",
      fedTone: "neutral",
      volatility: { level: "low" },
    });
    expect(result.posture).toBe("defensive");
    expect(result.playbook).toBe("event-risk");
    expect(result.leverage).toBe("avoid");
    expect(result.reasons.some((r) => r.key === "regime" && r.value === "Policy Shock")).toBe(true);
  });

  it("Risk-On + low vol → aggressive + trend", () => {
    const result = computeActionLens({
      regime: "Risk-On",
      regimeConfidence: 75,
      policyRisk: "low",
      fedTone: "neutral",
      volatility: { level: "low" },
    });
    expect(result.posture).toBe("aggressive");
    expect(result.playbook).toBe("trend");
    expect(result.leverage).not.toBe("avoid");
  });

  it("Neutral + high vol → balanced or defensive + chop", () => {
    const result = computeActionLens({
      regime: "Neutral",
      regimeConfidence: 60,
      policyRisk: "low",
      fedTone: "neutral",
      volatility: { level: "high" },
    });
    expect(["defensive", "balanced"]).toContain(result.posture);
    expect(result.playbook).toBe("chop");
  });

  it("High policy risk forces event-risk + leverage avoid", () => {
    const result = computeActionLens({
      regime: "Risk-On",
      regimeConfidence: 80,
      policyRisk: "high",
      fedTone: "dovish",
      volatility: { level: "low" },
    });
    expect(result.playbook).toBe("event-risk");
    expect(result.leverage).toBe("avoid");
  });

  it("Low regime confidence triggers leverage cautious or avoid", () => {
    const result = computeActionLens({
      regime: "Neutral",
      regimeConfidence: 40,
      policyRisk: "low",
      fedTone: "neutral",
      volatility: { level: "medium" },
    });
    expect(["cautious", "avoid"]).toContain(result.leverage);
  });

  it("Risk-Off → defensive", () => {
    const result = computeActionLens({
      regime: "Risk-Off",
      regimeConfidence: 70,
      policyRisk: "medium",
      fedTone: "hawkish",
      volatility: { level: "medium" },
    });
    expect(result.posture).toBe("defensive");
  });

  it("returns summary and max 3 bullets", () => {
    const result = computeActionLens({
      regime: "Neutral",
      regimeConfidence: 55,
      policyRisk: "low",
      fedTone: "neutral",
      volatility: { level: "medium" },
    });
    expect(typeof result.summary).toBe("string");
    expect(result.summary.length).toBeGreaterThan(0);
    expect(result.bullets.length).toBeLessThanOrEqual(3);
  });

  it("returns reasons for all inputs", () => {
    const result = computeActionLens({
      regime: "Risk-On",
      regimeConfidence: 60,
      policyRisk: "low",
      fedTone: "dovish",
      volatility: { level: "low", vix: 14 },
    });
    const keys = result.reasons.map((r) => r.key);
    expect(keys).toContain("regime");
    expect(keys).toContain("confidence");
    expect(keys).toContain("volatility");
    expect(keys).toContain("policyRisk");
    expect(keys).toContain("fedTone");
  });

  it("handles missing/unknown inputs without crashing", () => {
    const result = computeActionLens({});
    expect(result.posture).toBeDefined();
    expect(result.playbook).toBeDefined();
    expect(result.leverage).toBeDefined();
    expect(result.confidence).toBeLessThanOrEqual(100);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("handles NaN confidence safely", () => {
    const result = computeActionLens({
      regime: "Neutral",
      regimeConfidence: Number.NaN,
      policyRisk: "low",
      volatility: { level: "medium" },
    });
    expect(Number.isNaN(result.confidence)).toBe(false);
  });

  describe("confidence penalties and gating", () => {
    it("applies penalty when volatility missing", () => {
      const full = computeActionLens({
        regime: "Neutral",
        regimeConfidence: 70,
        policyRisk: "low",
        fedTone: "neutral",
        volatility: { level: "low" },
        dataMode: "live",
      });
      const missingVol = computeActionLens({
        regime: "Neutral",
        regimeConfidence: 70,
        policyRisk: "low",
        fedTone: "neutral",
        volatility: { level: "unknown" },
        dataMode: "live",
        missing: ["volatility"],
      });
      expect(missingVol.confidence).toBeLessThan(full.confidence);
    });

    it("demo mode caps confidence at 45", () => {
      const result = computeActionLens({
        regime: "Risk-On",
        regimeConfidence: 90,
        policyRisk: "low",
        fedTone: "dovish",
        volatility: { level: "low" },
        dataMode: "demo",
      });
      expect(result.confidence).toBeLessThanOrEqual(45);
      expect(result.isDemoContext).toBe(true);
    });

    it("live mode with missing required inputs sets insufficientData and cautious copy", () => {
      const result = computeActionLens({
        regime: "Neutral",
        regimeConfidence: 60,
        policyRisk: "unknown",
        fedTone: "unknown",
        volatility: { level: "unknown" },
        dataMode: "live",
        missing: ["volatility", "policy"],
      });
      expect(result.insufficientData).toBe(true);
      expect(result.summary).toContain("Insufficient data");
      expect(result.posture).toBe("defensive");
      expect(result.leverage).toBe("cautious");
    });

    it("reasons include regime, confidence, volatility, policyRisk, fedTone", () => {
      const result = computeActionLens({
        regime: "Risk-On",
        regimeConfidence: 60,
        policyRisk: "low",
        fedTone: "dovish",
        volatility: { level: "low", basis: "vix" },
      });
      const keys = result.reasons.map((r) => r.key);
      expect(keys).toContain("regime");
      expect(keys).toContain("confidence");
      expect(keys).toContain("volatility");
      expect(keys).toContain("policyRisk");
      expect(keys).toContain("fedTone");
    });
  });

  describe("getRequiredMissing", () => {
    it("returns volatility when level is unknown", () => {
      const missing = getRequiredMissing({
        regime: "Neutral",
        regimeConfidence: 50,
        policyRisk: "low",
        volatility: { level: "unknown" },
      });
      expect(missing).toContain("volatility");
    });

    it("returns policy when policyRisk is unknown", () => {
      const missing = getRequiredMissing({
        regime: "Neutral",
        regimeConfidence: 50,
        policyRisk: "unknown",
        volatility: { level: "low" },
      });
      expect(missing).toContain("policy");
    });

    it("returns empty when all required present", () => {
      const missing = getRequiredMissing({
        regime: "Neutral",
        regimeConfidence: 50,
        policyRisk: "low",
        volatility: { level: "medium" },
      });
      expect(missing).toHaveLength(0);
    });
  });
});
