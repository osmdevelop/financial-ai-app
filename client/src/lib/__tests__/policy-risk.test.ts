import { describe, it, expect } from "vitest";
import { computePolicyRisk } from "../policy-risk";

describe("computePolicyRisk", () => {
  it("Trump only: |z| < 1 => low", () => {
    const r = computePolicyRisk({ trumpZ: 0.5 });
    expect(r.level).toBe("low");
    expect(r.basis.trump).toBe(true);
    expect(r.basis.news).toBeFalsy();
  });

  it("Trump only: 1 <= |z| < 1.5 => medium", () => {
    expect(computePolicyRisk({ trumpZ: 1.0 }).level).toBe("medium");
    expect(computePolicyRisk({ trumpZ: 1.2 }).level).toBe("medium");
    expect(computePolicyRisk({ trumpZ: -1.2 }).level).toBe("medium");
  });

  it("Trump only: |z| >= 1.5 => high", () => {
    expect(computePolicyRisk({ trumpZ: 1.5 }).level).toBe("high");
    expect(computePolicyRisk({ trumpZ: 2 }).level).toBe("high");
  });

  it("News only: intensity < 35 => low", () => {
    const r = computePolicyRisk({ policyNewsIntensity: 30 });
    expect(r.level).toBe("low");
    expect(r.basis.news).toBe(true);
  });

  it("News only: 35 <= intensity <= 65 => medium", () => {
    expect(computePolicyRisk({ policyNewsIntensity: 50 }).level).toBe("medium");
  });

  it("News only: intensity > 65 => high", () => {
    expect(computePolicyRisk({ policyNewsIntensity: 70 }).level).toBe("high");
  });

  it("Both: max(levelTrump, levelNews)", () => {
    expect(computePolicyRisk({ trumpZ: 0.5, policyNewsIntensity: 70 }).level).toBe("high");
    expect(computePolicyRisk({ trumpZ: 1.6, policyNewsIntensity: 30 }).level).toBe("high");
    expect(computePolicyRisk({ trumpZ: 1.2, policyNewsIntensity: 40 }).level).toBe("medium");
  });

  it("Unknown when neither present", () => {
    const r = computePolicyRisk({});
    expect(r.level).toBe("unknown");
    expect(r.basis).toEqual({});
  });

  it("null-safe: null trumpZ and null news", () => {
    const r = computePolicyRisk({ trumpZ: null, policyNewsIntensity: null });
    expect(r.level).toBe("unknown");
  });
});
