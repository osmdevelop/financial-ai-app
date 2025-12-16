import { describe, it, expect, beforeEach } from "vitest";
import { 
  classifyRegime, 
  classifyTrumpRisk, 
  classifyVolatilityState, 
  classifyRiskAppetiteState,
  clearPreviousSnapshot,
  type RegimeInputs 
} from "../regimeService";

describe("regimeService", () => {
  beforeEach(() => {
    clearPreviousSnapshot();
  });

  describe("classifyTrumpRisk", () => {
    it("returns High for z-score >= 1.5", () => {
      expect(classifyTrumpRisk(1.5)).toBe("High");
      expect(classifyTrumpRisk(2.0)).toBe("High");
    });

    it("returns Elevated for z-score >= 0.75 and < 1.5", () => {
      expect(classifyTrumpRisk(0.75)).toBe("Elevated");
      expect(classifyTrumpRisk(1.0)).toBe("Elevated");
    });

    it("returns Moderate for z-score >= 0.25 and < 0.75", () => {
      expect(classifyTrumpRisk(0.25)).toBe("Moderate");
      expect(classifyTrumpRisk(0.5)).toBe("Moderate");
    });

    it("returns Low for z-score < 0.25", () => {
      expect(classifyTrumpRisk(0.24)).toBe("Low");
      expect(classifyTrumpRisk(0)).toBe("Low");
      expect(classifyTrumpRisk(-0.5)).toBe("Low");
    });
  });

  describe("classifyVolatilityState", () => {
    it("returns Low for score >= 70", () => {
      expect(classifyVolatilityState(70)).toBe("Low");
      expect(classifyVolatilityState(85)).toBe("Low");
    });

    it("returns Moderate for score >= 40 and < 70", () => {
      expect(classifyVolatilityState(40)).toBe("Moderate");
      expect(classifyVolatilityState(55)).toBe("Moderate");
    });

    it("returns High for score < 40", () => {
      expect(classifyVolatilityState(39)).toBe("High");
      expect(classifyVolatilityState(20)).toBe("High");
    });
  });

  describe("classifyRiskAppetiteState", () => {
    it("returns Strong for score >= 65", () => {
      expect(classifyRiskAppetiteState(65)).toBe("Strong");
      expect(classifyRiskAppetiteState(80)).toBe("Strong");
    });

    it("returns Neutral for score >= 35 and < 65", () => {
      expect(classifyRiskAppetiteState(35)).toBe("Neutral");
      expect(classifyRiskAppetiteState(50)).toBe("Neutral");
    });

    it("returns Weak for score < 35", () => {
      expect(classifyRiskAppetiteState(34)).toBe("Weak");
      expect(classifyRiskAppetiteState(20)).toBe("Weak");
    });
  });

  describe("classifyRegime", () => {
    describe("Risk-On path", () => {
      it("returns Risk-On when sentiment score >= 65", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 70, state: "Risk-On" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Risk-On");
        expect(result.drivers.some(d => d.key === "sentiment" && d.direction === "up")).toBe(true);
      });

      it("returns Risk-On with higher confidence when Fed is dovish and sentiment is strong", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 60, state: "Neutral" },
          fed: { tone: "dovish", score: -0.6 },
          volatility: { score: 70, state: "Low" },
          riskAppetite: { score: 65, state: "Strong" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Risk-On");
        expect(result.confidence).toBeGreaterThan(55);
      });
    });

    describe("Risk-Off path", () => {
      it("returns Risk-Off when sentiment score <= 35", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 30, state: "Risk-Off" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Risk-Off");
        expect(result.drivers.some(d => d.key === "sentiment" && d.direction === "down")).toBe(true);
      });

      it("returns Risk-Off when Fed is hawkish and sentiment is weak", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 45, state: "Neutral" },
          fed: { tone: "hawkish", score: 0.6 },
          volatility: { score: 50, state: "Moderate" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Risk-Off");
      });
    });

    describe("Policy Shock override path", () => {
      it("returns Policy Shock when Trump risk is High", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 70, state: "Risk-On" },
          policy: { trumpZ: 1.5, trumpRisk: "High" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Policy Shock");
        expect(result.drivers.some(d => d.key === "policy" && d.strength === "high")).toBe(true);
      });

      it("returns Policy Shock when Trump z-score >= 1.5", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 50, state: "Neutral" },
          policy: { trumpZ: 2.0 },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Policy Shock");
      });

      it("Policy Shock overrides Risk-On", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 80, state: "Risk-On" },
          policy: { trumpZ: 1.8 },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Policy Shock");
      });
    });

    describe("Volatility pushes toward Risk-Off", () => {
      it("shifts from Risk-On to Neutral when volatility is high", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 70, state: "Risk-On" },
          volatility: { score: 30, state: "High" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Neutral");
      });

      it("shifts from Neutral to Risk-Off when volatility is high", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 50, state: "Neutral" },
          volatility: { score: 20, state: "High" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Risk-Off");
      });

      it("does not shift when volatility is low or moderate", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 70, state: "Risk-On" },
          volatility: { score: 70, state: "Low" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Risk-On");
      });

      it("volatility does not override Policy Shock", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 70, state: "Risk-On" },
          policy: { trumpZ: 1.8, trumpRisk: "High" },
          volatility: { score: 20, state: "High" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Policy Shock");
      });
    });

    describe("Missing inputs handling", () => {
      it("returns valid snapshot with missing inputs populated in meta", () => {
        const inputs: RegimeInputs = {};
        const result = classifyRegime(inputs);
        
        expect(result.regime).toBe("Neutral");
        expect(result.confidence).toBeLessThanOrEqual(55);
        expect(result.drivers.length).toBeGreaterThan(0);
      });

      it("reduces confidence when only 1 input present", () => {
        const inputs1: RegimeInputs = {
          sentiment: { score: 50 },
        };
        const inputs4: RegimeInputs = {
          sentiment: { score: 50 },
          policy: { trumpZ: 0.5 },
          fed: { tone: "neutral" },
          volatility: { score: 60 },
        };
        
        const result1 = classifyRegime(inputs1);
        const result4 = classifyRegime(inputs4);
        
        expect(result4.confidence).toBeGreaterThan(result1.confidence);
      });

      it("increases confidence with 4+ inputs", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 65 },
          policy: { trumpZ: 0.3 },
          fed: { tone: "neutral" },
          volatility: { score: 60 },
          riskAppetite: { score: 55 },
        };
        
        const result = classifyRegime(inputs);
        expect(result.confidence).toBeGreaterThanOrEqual(65);
      });
    });

    describe("Neutral regime", () => {
      it("returns Neutral when sentiment is between 35 and 65", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 50, state: "Neutral" },
        };
        const result = classifyRegime(inputs);
        expect(result.regime).toBe("Neutral");
      });
    });

    describe("Driver generation", () => {
      it("generates drivers for all provided inputs", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 50 },
          policy: { trumpZ: 0.5 },
          fed: { tone: "neutral" },
          volatility: { score: 60 },
          riskAppetite: { score: 55 },
        };
        
        const result = classifyRegime(inputs);
        
        expect(result.drivers.some(d => d.key === "sentiment")).toBe(true);
        expect(result.drivers.some(d => d.key === "policy")).toBe(true);
        expect(result.drivers.some(d => d.key === "fed")).toBe(true);
        expect(result.drivers.some(d => d.key === "volatility")).toBe(true);
        expect(result.drivers.some(d => d.key === "risk_appetite")).toBe(true);
      });

      it("each driver has required properties", () => {
        const inputs: RegimeInputs = {
          sentiment: { score: 50 },
        };
        
        const result = classifyRegime(inputs);
        
        result.drivers.forEach(driver => {
          expect(driver).toHaveProperty("key");
          expect(driver).toHaveProperty("label");
          expect(driver).toHaveProperty("direction");
          expect(driver).toHaveProperty("strength");
          expect(driver).toHaveProperty("detail");
          expect(typeof driver.detail).toBe("string");
          expect(driver.detail.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
