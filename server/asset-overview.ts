import { alphaVantage } from "./alpha";
import { coinGecko } from "./coingecko";

interface AssetOverviewData {
  symbol: string;
  name: string;
  assetType: string;
  price: number;
  change24h: number;
  frames: Record<string, {
    changePct: number;
    stance: "Bullish" | "Bearish" | "Neutral";
    confidence: number;
    notes: string[];
  }>;
  as_of: string;
}

export class AssetOverviewService {
  private calculateMovingAverage(prices: number[], period: number): number {
    if (prices.length < period) return prices[prices.length - 1] || 0;
    const sum = prices.slice(0, period).reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  private calculateSlope(prices: number[]): number {
    if (prices.length < 2) return 0;
    const n = Math.min(prices.length, 5); // Use last 5 points for slope
    const slice = prices.slice(0, n);
    
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += slice[i];
      sumXY += i * slice[i];
      sumXX += i * i;
    }
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private determineStance(changePct: number, maFast: number, maSlow: number, slope: number): {
    stance: "Bullish" | "Bearish" | "Neutral";
    confidence: number;
  } {
    const signals: boolean[] = [];
    
    // Signal 1: Price change
    signals.push(changePct > 1);
    
    // Signal 2: Fast MA above slow MA
    signals.push(maFast > maSlow);
    
    // Signal 3: Positive slope
    signals.push(slope > 0);
    
    const bullishSignals = signals.filter(s => s).length;
    const bearishSignals = signals.filter(s => !s).length;
    
    let stance: "Bullish" | "Bearish" | "Neutral";
    if (bullishSignals >= 2) {
      stance = "Bullish";
    } else if (bearishSignals >= 2) {
      stance = "Bearish";
    } else {
      stance = "Neutral";
    }
    
    // Confidence based on signal agreement
    const confidence = 40 + (Math.max(bullishSignals, bearishSignals) * 20);
    
    return { stance, confidence };
  }

  async getEquityOverview(symbol: string, frames: string[]): Promise<AssetOverviewData> {
    try {
      // Get daily data for analysis
      const dailyData = await alphaVantage.getDailyAdjusted(symbol);
      if (dailyData.length < 2) {
        throw new Error("Insufficient data");
      }

      const currentPrice = dailyData[0].close;
      const previousPrice = dailyData[1].close;
      const change24h = ((currentPrice - previousPrice) / previousPrice) * 100;

      const frameData: Record<string, any> = {};
      
      for (const frame of frames) {
        let prices: number[] = [];
        let fastPeriod = 10;
        let slowPeriod = 30;
        
        // Adjust periods based on timeframe
        switch (frame) {
          case "1h":
            // For 1h, we'd need intraday data
            const intradayData = await alphaVantage.getIntraday(symbol, "60min");
            prices = intradayData.slice(0, 50).map(d => d.close);
            fastPeriod = 5;
            slowPeriod = 15;
            break;
          case "1d":
            prices = dailyData.slice(0, 50).map(d => d.close);
            fastPeriod = 10;
            slowPeriod = 30;
            break;
          case "1w":
          case "1m":
          case "3m":
          case "1y":
            prices = dailyData.slice(0, 100).map(d => d.close);
            fastPeriod = 20;
            slowPeriod = 50;
            break;
        }

        if (prices.length >= slowPeriod) {
          const maFast = this.calculateMovingAverage(prices, fastPeriod);
          const maSlow = this.calculateMovingAverage(prices, slowPeriod);
          const slope = this.calculateSlope(prices);
          
          const changePct = frame === "1h" ? 
            (prices.length >= 2 ? ((prices[0] - prices[1]) / prices[1]) * 100 : 0) :
            change24h;
          
          const { stance, confidence } = this.determineStance(changePct, maFast, maSlow, slope);
          
          frameData[frame] = {
            changePct,
            stance,
            confidence,
            notes: [
              `MA${fastPeriod}: ${maFast.toFixed(2)}`,
              `MA${slowPeriod}: ${maSlow.toFixed(2)}`,
              `Slope: ${slope > 0 ? "Rising" : slope < 0 ? "Falling" : "Flat"}`
            ]
          };
        } else {
          // Insufficient data for this timeframe
          frameData[frame] = {
            changePct: change24h,
            stance: "Neutral" as const,
            confidence: 50,
            notes: ["Insufficient historical data"]
          };
        }
      }

      return {
        symbol,
        name: `${symbol} Corporation`, // This will be overridden by the real name in routes
        assetType: "equity",
        price: currentPrice,
        change24h,
        frames: frameData,
        as_of: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Asset overview error for ${symbol}:`, error);
      throw error;
    }
  }

  async getCryptoOverview(symbol: string, frames: string[]): Promise<AssetOverviewData> {
    try {
      const coinId = coinGecko.getIdFromSymbol(symbol);
      const coinData = await coinGecko.getCoinData(symbol);
      
      if (!coinData) {
        throw new Error("Coin data not available");
      }

      // Get market chart data for analysis
      const chartData = await coinGecko.getMarketChart(coinId, 30); // 30 days
      
      const frameData: Record<string, any> = {};
      
      for (const frame of frames) {
        let prices: number[] = [];
        let fastPeriod = 10;
        let slowPeriod = 30;
        
        // Use chart data for all timeframes (simplified)
        prices = chartData.slice(0, 100).map(d => d.price);
        
        if (prices.length >= slowPeriod) {
          const maFast = this.calculateMovingAverage(prices, fastPeriod);
          const maSlow = this.calculateMovingAverage(prices, slowPeriod);
          const slope = this.calculateSlope(prices);
          
          const changePct = coinData.priceChangePercentage24h || 0;
          const { stance, confidence } = this.determineStance(changePct, maFast, maSlow, slope);
          
          frameData[frame] = {
            changePct,
            stance,
            confidence,
            notes: [
              `MA${fastPeriod}: $${maFast.toFixed(2)}`,
              `MA${slowPeriod}: $${maSlow.toFixed(2)}`,
              `24h Volume: $${(coinData.totalVolume || 0).toLocaleString()}`
            ]
          };
        } else {
          frameData[frame] = {
            changePct: coinData.priceChangePercentage24h || 0,
            stance: "Neutral" as const,
            confidence: 50,
            notes: ["Limited historical data available"]
          };
        }
      }

      return {
        symbol: symbol.toUpperCase(),
        name: coinData.name,
        assetType: "crypto",
        price: coinData.currentPrice || 0,
        change24h: coinData.priceChangePercentage24h || 0,
        frames: frameData,
        as_of: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Crypto overview error for ${symbol}:`, error);
      throw error;
    }
  }

  async getAssetOverview(symbol: string, assetType: string, frames: string[]): Promise<AssetOverviewData> {
    if (assetType === "crypto") {
      return this.getCryptoOverview(symbol, frames);
    } else {
      // equity, etf, fx, commodity - all use Alpha Vantage
      return this.getEquityOverview(symbol, frames);
    }
  }
}

export const assetOverviewService = new AssetOverviewService();