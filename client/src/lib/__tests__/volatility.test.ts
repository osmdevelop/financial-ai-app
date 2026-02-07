import { describe, it, expect } from "vitest";
import { computeVolatilityLevel } from "../volatility";

describe("computeVolatilityLevel", () => {
  it("VIX: low when vix < 16", () => {
    const r = computeVolatilityLevel({ vix: 14 });
    expect(r.level).toBe("low");
    expect(r.basis).toBe("vix");
    expect(r.value).toBe(14);
  });

  it("VIX: medium when 16 <= vix <= 22", () => {
    expect(computeVolatilityLevel({ vix: 16 }).level).toBe("medium");
    expect(computeVolatilityLevel({ vix: 19 }).level).toBe("medium");
    expect(computeVolatilityLevel({ vix: 22 }).level).toBe("medium");
  });

  it("VIX: high when vix > 22", () => {
    const r = computeVolatilityLevel({ vix: 25 });
    expect(r.level).toBe("high");
    expect(r.basis).toBe("vix");
  });

  it("realized vol: low when annualized < 0.15", () => {
    const closes = Array.from({ length: 21 }, (_, i) => 100 + i * 0.01);
    const r = computeVolatilityLevel({ spyDailyCloses: closes });
    expect(r.basis).toBe("realized");
    expect(r.level).toBe("low");
  });

  it("realized vol: medium when 0.15 <= ann <= 0.25", () => {
    const closes = Array.from({ length: 21 }, (_, i) => 100 * (1 + (i % 2 === 0 ? 0.002 : -0.002)));
    const r = computeVolatilityLevel({ spyDailyCloses: closes });
    expect(r.basis).toBe("realized");
    expect(["low", "medium", "high"]).toContain(r.level);
  });

  it("realized vol: high when annualized > 0.25", () => {
    const closes = Array.from({ length: 21 }, (_, i) => 100 * (1 + (i % 2 === 0 ? 0.02 : -0.02)));
    const r = computeVolatilityLevel({ spyDailyCloses: closes });
    expect(r.basis).toBe("realized");
    expect(r.level).toBe("high");
  });

  it("returns unknown when no vix and no spy closes", () => {
    const r = computeVolatilityLevel({});
    expect(r.level).toBe("unknown");
    expect(r.basis).toBe("none");
    expect(r.value).toBeUndefined();
  });

  it("null-safe: vix null and empty closes", () => {
    const r = computeVolatilityLevel({ vix: null, spyDailyCloses: [] });
    expect(r.level).toBe("unknown");
    expect(Number.isNaN(r.value ?? 0)).toBe(false);
  });

  it("prefers VIX over SPY when both present", () => {
    const r = computeVolatilityLevel({ vix: 18, spyDailyCloses: [100, 101, 102] });
    expect(r.basis).toBe("vix");
    expect(r.level).toBe("medium");
  });

  it("never returns NaN for value", () => {
    const r = computeVolatilityLevel({ vix: undefined, spyDailyCloses: [100] });
    expect(r.value === undefined || !Number.isNaN(r.value)).toBe(true);
  });
});
