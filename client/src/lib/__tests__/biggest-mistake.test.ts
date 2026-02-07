import { describe, it, expect } from "vitest";
import { computeBiggestMistake, getHeroCopy } from "../biggest-mistake";

describe("computeBiggestMistake", () => {
  it("policy high or Policy Shock → ignoring_event_risk", () => {
    const r = computeBiggestMistake({ regime: "Policy Shock", policyRisk: "low" });
    expect(r.mistake).toBe("ignoring_event_risk");
    const r2 = computeBiggestMistake({ regime: "Neutral", policyRisk: "high" });
    expect(r2.mistake).toBe("ignoring_event_risk");
  });

  it("high vol + not Risk-On → overtrading_chop", () => {
    const r = computeBiggestMistake({
      regime: "Neutral",
      volatility: "high",
    });
    expect(r.mistake).toBe("overtrading_chop");
  });

  it("Risk-On + vol not high → fighting_trend", () => {
    const r = computeBiggestMistake({
      regime: "Risk-On",
      volatility: "low",
    });
    expect(r.mistake).toBe("fighting_trend");
  });

  it("Risk-Off → oversizing_positions", () => {
    const r = computeBiggestMistake({ regime: "Risk-Off", volatility: "medium" });
    expect(r.mistake).toBe("oversizing_positions");
  });

  it("Neutral + vol not low → forcing_conviction", () => {
    const r = computeBiggestMistake({
      regime: "Neutral",
      volatility: "medium",
    });
    expect(r.mistake).toBe("forcing_conviction");
  });

  it("returns headline and explanation", () => {
    const r = computeBiggestMistake({ regime: "Policy Shock" });
    expect(r.headline).toBeTruthy();
    expect(r.explanation).toBeTruthy();
    expect(r.severity).toMatch(/^(low|medium|high)$/);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(100);
  });

  it("caps confidence at 85", () => {
    const r = computeBiggestMistake({
      regime: "Risk-On",
      volatility: "low",
      baseConfidence: 95,
    });
    expect(r.confidence).toBeLessThanOrEqual(85);
  });
});

describe("getHeroCopy", () => {
  it("maps Red → Stand Down, Yellow → Trade Light, Green → Selective Risk", () => {
    expect(getHeroCopy({ level: "Red" }).badgeBehavioral).toBe("Stand Down");
    expect(getHeroCopy({ level: "Yellow" }).badgeBehavioral).toBe("Trade Light");
    expect(getHeroCopy({ level: "Green" }).badgeBehavioral).toBe("Selective Risk");
  });

  it("returns primary and secondary lines", () => {
    const r = getHeroCopy({ regime: "Risk-Off", level: "Red" });
    expect(r.primaryLine.length).toBeGreaterThan(0);
    expect(r.secondaryLine.length).toBeGreaterThan(0);
  });
});
