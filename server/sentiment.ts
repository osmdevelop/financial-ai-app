import { alphaVantage } from "./alpha";
import { coinGecko } from "./coingecko";

interface SentimentDriver {
  label: string;
  value: number;
  contribution: number;
  note: string;
}

interface SentimentIndex {
  score: number;
  regime: "Risk-On" | "Neutral" | "Risk-Off";
  drivers: SentimentDriver[];
  as_of: string;
}

export class SentimentAnalyzer {
  // Normalize values to 0-100 scale
  private normalize(value: number, min: number, max: number): number {
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
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
        const realizedVol = this.calculateRealizedVolatility(prices);
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

      return {
        score: indexScore,
        regime,
        drivers,
        as_of: new Date().toISOString()
      };

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
        as_of: new Date().toISOString()
      };
    }
  }
}

export const sentimentAnalyzer = new SentimentAnalyzer();