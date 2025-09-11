import { alphaVantage } from "./alpha";
import { coinGecko } from "./coingecko";

interface SentimentDriver {
  label: string;
  value: number;
  contribution: number;
  note: string;
}

interface SentimentSubscore {
  name: string;
  score: number;
  weight: number;
  change?: number; // day-over-day delta
  trend: "up" | "down" | "neutral";
}

interface SentimentIndex {
  score: number;
  regime: "Risk-On" | "Neutral" | "Risk-Off";
  drivers: SentimentDriver[];
  subscores: SentimentSubscore[];
  change: number; // overall day-over-day delta (0 on first calculation)
  as_of: string;
}

export class SentimentAnalyzer {
  private lastSentimentData: SentimentIndex | null = null;

  // Normalize values to 0-100 scale
  private normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  // Calculate day-over-day change
  private calculateDelta(current: number, previous: number): number {
    return Math.round(current - previous);
  }

  // Determine trend based on change
  private getTrend(change: number): "up" | "down" | "neutral" {
    if (change > 2) return "up";
    if (change < -2) return "down";
    return "neutral";
  }

  // Calculate realized volatility from price series
  private calculateRealizedVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }
    
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility
  }

  async calculateSentimentIndex(): Promise<SentimentIndex> {
    try {
      // Fetch market data
      const [spyData, qqqData, iwmData, hygData, lqdData] = await Promise.allSettled([
        alphaVantage.getDailyAdjusted("SPY"),
        alphaVantage.getDailyAdjusted("QQQ"), 
        alphaVantage.getDailyAdjusted("IWM"),
        alphaVantage.getDailyAdjusted("HYG"), // High yield bonds
        alphaVantage.getDailyAdjusted("LQD")  // Investment grade bonds
      ]);

      const drivers: SentimentDriver[] = [];
      let riskAppetite = 50; // default neutral
      let creditSpread = 50;
      let volatilityInverse = 50;

      // Risk Appetite: Average performance of major indices
      if (spyData.status === "fulfilled" && spyData.value.length >= 2) {
        const today = spyData.value[0];
        const yesterday = spyData.value[1];
        const spyChange = ((today.close - yesterday.close) / yesterday.close) * 100;
        
        let qqqChange = 0, iwmChange = 0;
        
        if (qqqData.status === "fulfilled" && qqqData.value.length >= 2) {
          const qqqToday = qqqData.value[0];
          const qqqYesterday = qqqData.value[1];
          qqqChange = ((qqqToday.close - qqqYesterday.close) / qqqYesterday.close) * 100;
        }
        
        if (iwmData.status === "fulfilled" && iwmData.value.length >= 2) {
          const iwmToday = iwmData.value[0];
          const iwmYesterday = iwmData.value[1];
          iwmChange = ((iwmToday.close - iwmYesterday.close) / iwmYesterday.close) * 100;
        }

        const avgChange = (spyChange + qqqChange + iwmChange) / 3;
        riskAppetite = this.normalize(avgChange, -3, 3); // -3% to +3% range

        drivers.push({
          label: "Equity Performance",
          value: avgChange,
          contribution: Math.round(riskAppetite * 0.4),
          note: `SPY: ${spyChange.toFixed(1)}%, QQQ: ${qqqChange.toFixed(1)}%, IWM: ${iwmChange.toFixed(1)}%`
        });
      }

      // Credit Spread Proxy: HYG - LQD performance differential
      if (hygData.status === "fulfilled" && lqdData.status === "fulfilled" && 
          hygData.value.length >= 2 && lqdData.value.length >= 2) {
        
        const hygToday = hygData.value[0];
        const hygYesterday = hygData.value[1];
        const hygChange = ((hygToday.close - hygYesterday.close) / hygYesterday.close) * 100;
        
        const lqdToday = lqdData.value[0];
        const lqdYesterday = lqdData.value[1];
        const lqdChange = ((lqdToday.close - lqdYesterday.close) / lqdYesterday.close) * 100;
        
        const creditSpreadProxy = hygChange - lqdChange;
        creditSpread = this.normalize(creditSpreadProxy, -2, 2); // -2% to +2% range

        drivers.push({
          label: "Credit Conditions",
          value: creditSpreadProxy,
          contribution: Math.round(creditSpread * 0.25),
          note: `HYG outperformance vs LQD: ${creditSpreadProxy.toFixed(1)}%`
        });
      }

      // Volatility: Realized volatility of SPY (last 10 days)
      if (spyData.status === "fulfilled" && spyData.value.length >= 10) {
        const prices = spyData.value.slice(0, 10).map(d => d.close);
        const realizedVol = this.calculateRealizedVolatility(prices) * 100; // Convert to percentage
        volatilityInverse = this.normalize(30 - realizedVol, 0, 30); // Lower vol = higher score

        drivers.push({
          label: "Market Volatility",
          value: realizedVol,
          contribution: Math.round(volatilityInverse * 0.35),
          note: `10-day realized volatility: ${realizedVol.toFixed(1)}% (lower is better)`
        });
      }

      // Calculate composite score
      const indexScore = Math.round(
        riskAppetite * 0.4 + 
        creditSpread * 0.25 + 
        volatilityInverse * 0.35
      );

      // Determine regime
      let regime: "Risk-On" | "Neutral" | "Risk-Off";
      if (indexScore >= 65) {
        regime = "Risk-On";
      } else if (indexScore <= 35) {
        regime = "Risk-Off";
      } else {
        regime = "Neutral";
      }

      // Create subscores with day-over-day deltas
      const subscores: SentimentSubscore[] = [];
      
      // Risk Appetite
      const riskAppetiteScore = Math.round(riskAppetite);
      let riskAppetiteChange: number | undefined;
      if (this.lastSentimentData) {
        const previousRiskAppetite = this.lastSentimentData.subscores.find(s => s.name === "Risk Appetite")?.score ?? 50;
        riskAppetiteChange = this.calculateDelta(riskAppetiteScore, previousRiskAppetite);
      } else {
        riskAppetiteChange = 0; // First calculation
      }
      
      subscores.push({
        name: "Risk Appetite",
        score: riskAppetiteScore,
        weight: 0.4,
        change: riskAppetiteChange,
        trend: this.getTrend(riskAppetiteChange || 0)
      });

      // Credit Conditions  
      const creditConditionsScore = Math.round(creditSpread);
      let creditConditionsChange: number | undefined;
      if (this.lastSentimentData) {
        const previousCreditConditions = this.lastSentimentData.subscores.find(s => s.name === "Credit Conditions")?.score ?? 50;
        creditConditionsChange = this.calculateDelta(creditConditionsScore, previousCreditConditions);
      } else {
        creditConditionsChange = 0; // First calculation
      }
      
      subscores.push({
        name: "Credit Conditions",
        score: creditConditionsScore,
        weight: 0.25,
        change: creditConditionsChange,
        trend: this.getTrend(creditConditionsChange || 0)
      });

      // Market Volatility
      const volatilityScore = Math.round(volatilityInverse);
      let volatilityChange: number | undefined;
      if (this.lastSentimentData) {
        const previousVolatility = this.lastSentimentData.subscores.find(s => s.name === "Market Volatility")?.score ?? 50;
        volatilityChange = this.calculateDelta(volatilityScore, previousVolatility);
      } else {
        volatilityChange = 0; // First calculation
      }
      
      subscores.push({
        name: "Market Volatility", 
        score: volatilityScore,
        weight: 0.35,
        change: volatilityChange,
        trend: this.getTrend(volatilityChange || 0)
      });

      // Calculate overall day-over-day change
      let overallChange: number;
      if (this.lastSentimentData) {
        overallChange = this.calculateDelta(indexScore, this.lastSentimentData.score);
      } else {
        overallChange = 0; // First calculation
      }

      const currentSentiment: SentimentIndex = {
        score: indexScore,
        regime,
        drivers,
        subscores,
        change: overallChange,
        as_of: new Date().toISOString()
      };

      // Store current data for next calculation
      this.lastSentimentData = currentSentiment;

      return currentSentiment;

    } catch (error) {
      console.error("Sentiment analysis error:", error);
      
      // Fallback data
      return {
        score: 50,
        regime: "Neutral",
        drivers: [
          {
            label: "Data Unavailable",
            value: 0,
            contribution: 50,
            note: "Using fallback neutral sentiment due to data unavailability"
          }
        ],
        subscores: [
          {
            name: "Risk Appetite",
            score: 50,
            weight: 0.4,
            change: 0,
            trend: "neutral"
          },
          {
            name: "Credit Conditions", 
            score: 50,
            weight: 0.25,
            change: 0,
            trend: "neutral"
          },
          {
            name: "Market Volatility",
            score: 50,
            weight: 0.35,
            change: 0,
            trend: "neutral"
          }
        ],
        change: 0,
        as_of: new Date().toISOString()
      };
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();