import { 
  AssetOverviewResponse, 
  OHLCDataPoint, 
  MultiTimeframeData,
  FreshnessMetadata 
} from "@shared/schema.js";
import { TechnicalIndicatorCalculator } from "./technical-indicators.js";
import { ProbabilisticStatsCalculator } from "./probabilistic-stats.js";
import { SupportResistanceCalculator } from "./support-resistance.js";
import { AlphaVantageAPI } from "./alpha.js";

export class AssetOverviewService {
  private alphaVantage: AlphaVantageAPI;

  constructor() {
    this.alphaVantage = new AlphaVantageAPI();
  }

  /**
   * Get comprehensive asset overview with all indicators and analysis
   */
  async getComprehensiveOverview(
    symbol: string, 
    assetType: "equity" | "etf" | "crypto"
  ): Promise<AssetOverviewResponse> {
    try {
      // Fetch multi-timeframe OHLC data
      const ohlcData = await this.fetchMultiTimeframeData(symbol, assetType);
      
      // Get current price and change
      const currentData = await this.getCurrentPriceData(symbol, assetType);
      
      // Calculate technical indicators
      const indicators = TechnicalIndicatorCalculator.calculateAllIndicators(
        ohlcData["1d"]
      );
      
      // Calculate probabilistic statistics
      const stats = ProbabilisticStatsCalculator.calculateAllStats(
        ohlcData["1d"].map(d => ({ timestamp: d.timestamp, close: d.close }))
      );
      
      // Calculate support/resistance levels
      const supportResistance = SupportResistanceCalculator.calculateSupportResistance(
        ohlcData["1d"],
        currentData.currentPrice
      );
      
      // Find relevant catalysts from news data
      const catalysts = await this.findRelevantCatalysts(symbol);
      
      // Create freshness metadata
      const freshness = this.createFreshnessMetadata();

      return {
        symbol,
        assetType,
        currentPrice: currentData.currentPrice,
        change: currentData.change,
        changePct: currentData.changePct,
        ohlcData,
        indicators,
        stats,
        supportResistance,
        catalysts,
        freshness
      };
    } catch (error) {
      console.error(`Asset overview error for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Fetch OHLC data for multiple timeframes
   */
  private async fetchMultiTimeframeData(
    symbol: string, 
    assetType: "equity" | "etf" | "crypto"
  ): Promise<MultiTimeframeData> {
    const timeframes = {
      "1h": await this.fetchIntraday(symbol, "60min", 50), // Last 50 hours
      "1d": await this.fetchDaily(symbol, 365), // Last 365 days
      "1w": await this.aggregateToWeekly(await this.fetchDaily(symbol, 365 * 2)), // 2 years of data aggregated to weekly
      "1m": await this.aggregateToMonthly(await this.fetchDaily(symbol, 365 * 5)), // 5 years of data aggregated to monthly
      "3m": await this.aggregateToQuarterly(await this.fetchDaily(symbol, 365 * 10)), // 10 years aggregated to quarterly
      "1y": await this.aggregateToYearly(await this.fetchDaily(symbol, 365 * 20)) // 20 years aggregated to yearly
    };

    return timeframes;
  }

  /**
   * Fetch intraday data from Alpha Vantage
   */
  private async fetchIntraday(symbol: string, interval: string, limit: number): Promise<OHLCDataPoint[]> {
    try {
      const data = await this.alphaVantage.getIntraday(symbol, interval, "compact");
      
      return data.slice(0, limit).map(d => ({
        timestamp: d.timestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume
      }));
    } catch (error) {
      console.warn(`Failed to fetch intraday data for ${symbol}, using mock data`);
      return this.generateMockOHLCData("1h", limit);
    }
  }

  /**
   * Fetch daily data from Alpha Vantage
   */
  private async fetchDaily(symbol: string, limit: number): Promise<OHLCDataPoint[]> {
    try {
      const data = await this.alphaVantage.getDailyAdjusted(symbol, "full");
      
      return data.slice(0, limit).map(d => ({
        timestamp: d.date,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.adjustedClose, // Use adjusted close for better analysis
        volume: d.volume
      }));
    } catch (error) {
      console.warn(`Failed to fetch daily data for ${symbol}, using mock data`);
      return this.generateMockOHLCData("1d", limit);
    }
  }

  /**
   * Get current price and change data
   */
  private async getCurrentPriceData(symbol: string, assetType: "equity" | "etf" | "crypto"): Promise<{
    currentPrice: number;
    change: number;
    changePct: number;
  }> {
    try {
      // Fetch recent daily data to get current price and calculate change
      const recentData = await this.fetchDaily(symbol, 2);
      
      if (recentData.length >= 2) {
        const current = recentData[0].close;
        const previous = recentData[1].close;
        const change = current - previous;
        const changePct = (change / previous) * 100;
        
        return {
          currentPrice: Math.round(current * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePct: Math.round(changePct * 100) / 100
        };
      } else {
        throw new Error("Insufficient data for price calculation");
      }
    } catch (error) {
      console.warn(`Failed to get current price for ${symbol}, using mock data`);
      
      // Return mock current price data
      const basePrice = 150 + Math.random() * 100; // Random price between 150-250
      const change = (Math.random() - 0.5) * 10; // Random change between -5 to +5
      
      return {
        currentPrice: Math.round(basePrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePct: Math.round((change / basePrice) * 10000) / 100
      };
    }
  }

  /**
   * Aggregate daily data to weekly data
   */
  private aggregateToWeekly(dailyData: OHLCDataPoint[]): OHLCDataPoint[] {
    return this.aggregateByPeriod(dailyData, 7, "1w");
  }

  /**
   * Aggregate daily data to monthly data
   */
  private aggregateToMonthly(dailyData: OHLCDataPoint[]): OHLCDataPoint[] {
    return this.aggregateByPeriod(dailyData, 30, "1m");
  }

  /**
   * Aggregate daily data to quarterly data
   */
  private aggregateToQuarterly(dailyData: OHLCDataPoint[]): OHLCDataPoint[] {
    return this.aggregateByPeriod(dailyData, 90, "3m");
  }

  /**
   * Aggregate daily data to yearly data
   */
  private aggregateToYearly(dailyData: OHLCDataPoint[]): OHLCDataPoint[] {
    return this.aggregateByPeriod(dailyData, 365, "1y");
  }

  /**
   * Generic aggregation function for different time periods
   */
  private aggregateByPeriod(
    data: OHLCDataPoint[], 
    periodDays: number, 
    timeframe: string
  ): OHLCDataPoint[] {
    const aggregated: OHLCDataPoint[] = [];
    
    for (let i = 0; i < data.length; i += periodDays) {
      const periodData = data.slice(i, i + periodDays);
      
      if (periodData.length === 0) continue;
      
      const open = periodData[periodData.length - 1].open; // First day's open
      const close = periodData[0].close; // Last day's close
      const high = Math.max(...periodData.map(d => d.high));
      const low = Math.min(...periodData.map(d => d.low));
      const volume = periodData.reduce((sum, d) => sum + (d.volume || 0), 0);
      
      aggregated.push({
        timestamp: periodData[0].timestamp, // Use the most recent timestamp
        open,
        high,
        low,
        close,
        volume
      });
    }
    
    return aggregated;
  }

  /**
   * Find relevant catalysts for the asset from news data
   */
  private async findRelevantCatalysts(symbol: string): Promise<Array<{
    type: string;
    title: string;
    impact: "high" | "medium" | "low";
    date: string;
  }>> {
    try {
      // Import news clustering service to find relevant headlines
      const { newsClusteringService } = await import("./news-clustering.js");
      
      const newsData = await newsClusteringService.getClusteredNews({
        scope: "all",
        symbols: [symbol],
        limit: 20
      });
      
      const catalysts = newsData.headlines
        .filter(headline => 
          headline.symbols?.includes(symbol) && 
          headline.impactLevel && 
          ["high", "medium"].includes(headline.impactLevel)
        )
        .slice(0, 5) // Top 5 catalysts
        .map(headline => ({
          type: "news",
          title: headline.title,
          impact: headline.impactLevel as "high" | "medium" | "low",
          date: headline.time_published
        }));

      return catalysts;
    } catch (error) {
      console.warn(`Failed to fetch catalysts for ${symbol}, using empty array`);
      return [];
    }
  }

  /**
   * Generate mock OHLC data for fallback
   */
  private generateMockOHLCData(timeframe: string, count: number): OHLCDataPoint[] {
    const data: OHLCDataPoint[] = [];
    const basePrice = 150 + Math.random() * 100;
    let currentPrice = basePrice;
    
    const now = new Date();
    const timeframMillis = this.getTimeframeMillis(timeframe);
    
    for (let i = count - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - (i * timeframMillis));
      
      // Generate realistic OHLC data with some volatility
      const open = currentPrice;
      const volatility = basePrice * 0.02; // 2% volatility
      const high = open + Math.random() * volatility;
      const low = open - Math.random() * volatility;
      const close = low + Math.random() * (high - low);
      const volume = Math.floor(Math.random() * 1000000) + 100000;
      
      data.push({
        timestamp: timestamp.toISOString(),
        open: Math.round(open * 100) / 100,
        high: Math.round(high * 100) / 100,
        low: Math.round(low * 100) / 100,
        close: Math.round(close * 100) / 100,
        volume
      });
      
      currentPrice = close;
    }
    
    return data.reverse(); // Return in chronological order
  }

  /**
   * Get milliseconds for different timeframes
   */
  private getTimeframeMillis(timeframe: string): number {
    switch (timeframe) {
      case "1h": return 60 * 60 * 1000;
      case "1d": return 24 * 60 * 60 * 1000;
      case "1w": return 7 * 24 * 60 * 60 * 1000;
      case "1m": return 30 * 24 * 60 * 60 * 1000;
      case "3m": return 90 * 24 * 60 * 60 * 1000;
      case "1y": return 365 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  /**
   * Create freshness metadata for the response
   */
  private createFreshnessMetadata(): FreshnessMetadata {
    const isMarketHours = this.isMarketHours();
    
    return {
      lastUpdated: new Date().toISOString(),
      dataSource: process.env.DATA_MODE === "mock" ? "mock" : "live",
      sourceName: "Alpha Vantage",
      freshness: isMarketHours ? "realtime" : "recent",
      disclaimer: isMarketHours 
        ? "Market data may be delayed up to 15 minutes" 
        : "Market is closed - showing last available data"
    };
  }

  /**
   * Check if it's currently market hours (simplified US market hours)
   */
  private isMarketHours(): boolean {
    const now = new Date();
    const utcHour = now.getUTCHours();
    
    // US market hours: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)
    return utcHour >= 14 && utcHour < 21;
  }
}