import type { MarketRegime, MarketRegimeSnapshot, RegimeDriver, RegimeDriverKey } from "@shared/schema";
import { sentimentAnalyzer } from "../sentiment";
import { policyService } from "../policy";
import { getCachedOrFetch } from "../cache";

const REGIME_CACHE_TTL_SEC = 900; // 15 minutes

let previousSnapshot: MarketRegimeSnapshot | null = null;

export interface RegimeInputs {
  sentiment?: {
    score?: number;
    state?: string;
    asOf?: string;
    isMock?: boolean;
  };
  policy?: {
    trumpZ?: number;
    trumpRisk?: string;
    isMock?: boolean;
  };
  fed?: {
    tone?: "hawkish" | "dovish" | "neutral";
    score?: number;
    isMock?: boolean;
  };
  volatility?: {
    score?: number;
    state?: string;
    isMock?: boolean;
  };
  riskAppetite?: {
    score?: number;
    state?: string;
    isMock?: boolean;
  };
}

export function classifyTrumpRisk(zScore: number): string {
  if (zScore >= 1.5) return "High";
  if (zScore >= 0.75) return "Elevated";
  if (zScore >= 0.25) return "Moderate";
  return "Low";
}

export function classifyVolatilityState(score: number): string {
  if (score >= 70) return "Low";
  if (score >= 40) return "Moderate";
  return "High";
}

export function classifyRiskAppetiteState(score: number): string {
  if (score >= 65) return "Strong";
  if (score >= 35) return "Neutral";
  return "Weak";
}

export function classifyRegime(inputs: RegimeInputs): {
  regime: MarketRegime;
  confidence: number;
  drivers: RegimeDriver[];
} {
  const drivers: RegimeDriver[] = [];
  const presentInputs: string[] = [];
  const missingInputs: string[] = [];

  let baseRegime: MarketRegime = "Neutral";
  let confidence = 55;

  // Track input presence
  if (inputs.sentiment?.score !== undefined) presentInputs.push("sentiment");
  else missingInputs.push("sentiment");

  if (inputs.policy?.trumpZ !== undefined) presentInputs.push("policy");
  else missingInputs.push("policy");

  if (inputs.fed?.tone !== undefined) presentInputs.push("fed");
  else missingInputs.push("fed");

  if (inputs.volatility?.score !== undefined) presentInputs.push("volatility");
  else missingInputs.push("volatility");

  if (inputs.riskAppetite?.score !== undefined) presentInputs.push("risk_appetite");
  else missingInputs.push("risk_appetite");

  // Base regime from sentiment
  const sentimentScore = inputs.sentiment?.score ?? 50;
  if (sentimentScore >= 65) {
    baseRegime = "Risk-On";
    drivers.push({
      key: "sentiment" as RegimeDriverKey,
      label: "Market Sentiment",
      direction: "up",
      strength: sentimentScore >= 75 ? "high" : "medium",
      detail: `Sentiment score at ${sentimentScore}, indicating bullish market conditions.`,
    });
  } else if (sentimentScore <= 35) {
    baseRegime = "Risk-Off";
    drivers.push({
      key: "sentiment" as RegimeDriverKey,
      label: "Market Sentiment",
      direction: "down",
      strength: sentimentScore <= 25 ? "high" : "medium",
      detail: `Sentiment score at ${sentimentScore}, indicating bearish market conditions.`,
    });
  } else {
    drivers.push({
      key: "sentiment" as RegimeDriverKey,
      label: "Market Sentiment",
      direction: "flat",
      strength: "low",
      detail: `Sentiment score at ${sentimentScore}, indicating neutral market conditions.`,
    });
  }

  // Policy Shock override
  const trumpZ = inputs.policy?.trumpZ ?? 0;
  const trumpRisk = inputs.policy?.trumpRisk ?? classifyTrumpRisk(trumpZ);
  const isPolicyShock = trumpRisk === "High" || trumpZ >= 1.5;

  if (isPolicyShock) {
    baseRegime = "Policy Shock";
    drivers.push({
      key: "policy" as RegimeDriverKey,
      label: "Policy Risk",
      direction: "up",
      strength: "high",
      detail: `Trump Policy Index z-score at ${trumpZ.toFixed(2)}, indicating elevated policy uncertainty.`,
    });
  } else if (inputs.policy?.trumpZ !== undefined) {
    drivers.push({
      key: "policy" as RegimeDriverKey,
      label: "Policy Risk",
      direction: trumpZ > 0.5 ? "up" : trumpZ < -0.5 ? "down" : "flat",
      strength: trumpZ >= 1.0 ? "medium" : "low",
      detail: `Trump Policy Index z-score at ${trumpZ.toFixed(2)}, policy risk is ${trumpRisk.toLowerCase()}.`,
    });
  }

  // Volatility influence (shift toward Risk-Off if volatility is high)
  if (inputs.volatility?.score !== undefined) {
    const volScore = inputs.volatility.score;
    const volState = inputs.volatility.state ?? classifyVolatilityState(volScore);
    
    if (volState === "High" && baseRegime !== "Policy Shock") {
      if (baseRegime === "Risk-On") {
        baseRegime = "Neutral";
      } else if (baseRegime === "Neutral") {
        baseRegime = "Risk-Off";
      }
      drivers.push({
        key: "volatility" as RegimeDriverKey,
        label: "Market Volatility",
        direction: "up",
        strength: "high",
        detail: `Volatility state is high, shifting regime toward Risk-Off.`,
      });
    } else {
      drivers.push({
        key: "volatility" as RegimeDriverKey,
        label: "Market Volatility",
        direction: volState === "High" ? "up" : volState === "Low" ? "down" : "flat",
        strength: volState === "High" ? "high" : volState === "Low" ? "low" : "medium",
        detail: `Volatility state is ${volState.toLowerCase()}.`,
      });
    }
  }

  // Fed influence
  if (inputs.fed?.tone !== undefined) {
    const fedTone = inputs.fed.tone;
    const fedScore = inputs.fed.score ?? 0;
    
    if (fedTone === "hawkish" && sentimentScore < 50 && baseRegime !== "Policy Shock") {
      if (baseRegime === "Neutral") {
        baseRegime = "Risk-Off";
      }
      drivers.push({
        key: "fed" as RegimeDriverKey,
        label: "Fed Stance",
        direction: "up",
        strength: Math.abs(fedScore) > 0.5 ? "high" : "medium",
        detail: `Fed tone is hawkish with weak sentiment, biasing toward Risk-Off.`,
      });
    } else if (fedTone === "dovish" && sentimentScore > 55 && baseRegime !== "Policy Shock") {
      if (baseRegime === "Neutral") {
        baseRegime = "Risk-On";
      }
      drivers.push({
        key: "fed" as RegimeDriverKey,
        label: "Fed Stance",
        direction: "down",
        strength: Math.abs(fedScore) > 0.5 ? "high" : "medium",
        detail: `Fed tone is dovish with strong sentiment, biasing toward Risk-On.`,
      });
    } else {
      drivers.push({
        key: "fed" as RegimeDriverKey,
        label: "Fed Stance",
        direction: fedTone === "hawkish" ? "up" : fedTone === "dovish" ? "down" : "flat",
        strength: Math.abs(fedScore) > 0.5 ? "medium" : "low",
        detail: `Fed tone is ${fedTone}.`,
      });
    }
  }

  // Risk appetite driver
  if (inputs.riskAppetite?.score !== undefined) {
    const raScore = inputs.riskAppetite.score;
    const raState = inputs.riskAppetite.state ?? classifyRiskAppetiteState(raScore);
    
    drivers.push({
      key: "risk_appetite" as RegimeDriverKey,
      label: "Risk Appetite",
      direction: raScore >= 55 ? "up" : raScore <= 45 ? "down" : "flat",
      strength: raScore >= 65 || raScore <= 35 ? "high" : "medium",
      detail: `Risk appetite is ${raState.toLowerCase()} at ${raScore}.`,
    });
  }

  // Calculate confidence based on inputs present
  const inputCount = presentInputs.length;
  if (inputCount >= 4) {
    confidence += 10;
  } else if (inputCount >= 3) {
    confidence += 5;
  } else if (inputCount <= 1) {
    confidence -= 10;
  }

  // Check directional agreement among drivers
  const directions = drivers.map(d => d.direction);
  const upCount = directions.filter(d => d === "up").length;
  const downCount = directions.filter(d => d === "down").length;
  const mixedCount = directions.filter(d => d === "mixed").length;
  
  if (mixedCount > 0 || (upCount > 0 && downCount > 0)) {
    confidence -= 5;
  } else if (upCount >= 3 || downCount >= 3) {
    confidence += 5;
  }

  // Clamp confidence
  confidence = Math.max(0, Math.min(100, confidence));

  return {
    regime: baseRegime,
    confidence,
    drivers,
  };
}

async function fetchRegimeInputs(): Promise<{
  inputs: RegimeInputs;
  isMock: boolean;
  missingInputs: string[];
}> {
  const inputs: RegimeInputs = {};
  let anyMock = false;
  const missingInputs: string[] = [];

  // Fetch sentiment data
  try {
    const sentimentData = await sentimentAnalyzer.calculateSentimentIndex();
    const volatilitySubscore = sentimentData.subscores.find(s => s.name === "Market Volatility");
    const riskAppetiteSubscore = sentimentData.subscores.find(s => s.name === "Risk Appetite");
    
    inputs.sentiment = {
      score: sentimentData.score,
      state: sentimentData.regime,
      asOf: sentimentData.as_of,
      isMock: false,
    };

    if (volatilitySubscore) {
      inputs.volatility = {
        score: volatilitySubscore.score,
        state: classifyVolatilityState(volatilitySubscore.score),
        isMock: false,
      };
    }

    if (riskAppetiteSubscore) {
      inputs.riskAppetite = {
        score: riskAppetiteSubscore.score,
        state: classifyRiskAppetiteState(riskAppetiteSubscore.score),
        isMock: false,
      };
    }
  } catch (error) {
    console.warn("Failed to fetch sentiment data:", error);
    missingInputs.push("sentiment");
    
    // Use mock fallback
    inputs.sentiment = {
      score: 50,
      state: "Neutral",
      asOf: new Date().toISOString(),
      isMock: true,
    };
    anyMock = true;
  }

  // Fetch policy data (Trump Index)
  try {
    const trumpIndex = await policyService.getTrumpIndex();
    const isMock = trumpIndex.freshness?.dataSource === "mock" || trumpIndex.freshness?.dataSource === "fallback";
    
    inputs.policy = {
      trumpZ: trumpIndex.zScore,
      trumpRisk: classifyTrumpRisk(trumpIndex.zScore),
      isMock,
    };
    
    if (isMock) anyMock = true;
  } catch (error) {
    console.warn("Failed to fetch Trump Index:", error);
    missingInputs.push("policy");
    anyMock = true;
  }

  // Fetch Fed data
  try {
    const fedspeak = await policyService.getFedspeak();
    const isMock = fedspeak.freshness?.dataSource === "mock" || fedspeak.freshness?.dataSource === "fallback";
    
    inputs.fed = {
      tone: fedspeak.currentTone,
      score: fedspeak.toneScore,
      isMock,
    };
    
    if (isMock) anyMock = true;
  } catch (error) {
    console.warn("Failed to fetch Fedspeak:", error);
    missingInputs.push("fed");
    anyMock = true;
  }

  // Check for volatility and risk appetite if not already set from sentiment
  if (!inputs.volatility) {
    missingInputs.push("volatility");
  }
  if (!inputs.riskAppetite) {
    missingInputs.push("risk_appetite");
  }

  return {
    inputs,
    isMock: anyMock,
    missingInputs,
  };
}

export async function getRegimeSnapshot(): Promise<MarketRegimeSnapshot> {
  const cacheKey = "regime_snapshot";
  
  try {
    const result = await getCachedOrFetch<MarketRegimeSnapshot>(
      cacheKey,
      REGIME_CACHE_TTL_SEC,
      async () => {
        const { inputs, isMock, missingInputs } = await fetchRegimeInputs();
        const { regime, confidence, drivers } = classifyRegime(inputs);
        
        // Determine if changed since yesterday
        let changedSinceYesterday = false;
        let notes: string | undefined;
        
        if (previousSnapshot) {
          changedSinceYesterday = previousSnapshot.regime !== regime;
        } else {
          notes = "No history available for comparison.";
        }

        const snapshot: MarketRegimeSnapshot = {
          asOf: new Date().toISOString(),
          regime,
          confidence,
          changedSinceYesterday,
          drivers,
          inputs,
          meta: {
            isMock,
            missingInputs,
            notes,
          },
        };

        // Store as previous snapshot
        previousSnapshot = snapshot;

        return snapshot;
      }
    );

    return result.data;
  } catch (error) {
    console.error("Failed to get regime snapshot:", error);
    
    // Return fallback snapshot
    const fallbackSnapshot: MarketRegimeSnapshot = {
      asOf: new Date().toISOString(),
      regime: "Neutral",
      confidence: 30,
      changedSinceYesterday: false,
      drivers: [
        {
          key: "sentiment",
          label: "Market Sentiment",
          direction: "flat",
          strength: "low",
          detail: "Unable to fetch sentiment data, using fallback.",
        },
      ],
      inputs: {
        sentiment: {
          score: 50,
          state: "Neutral",
          asOf: new Date().toISOString(),
          isMock: true,
        },
      },
      meta: {
        isMock: true,
        missingInputs: ["policy", "fed", "volatility", "risk_appetite"],
        notes: "Fallback snapshot due to data fetch error.",
      },
    };

    return fallbackSnapshot;
  }
}

export function getPreviousSnapshot(): MarketRegimeSnapshot | null {
  return previousSnapshot;
}

export function clearPreviousSnapshot(): void {
  previousSnapshot = null;
}
