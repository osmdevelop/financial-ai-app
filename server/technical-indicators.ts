import { OHLCDataPoint, TechnicalIndicators } from "@shared/schema.js";

export interface PriceData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export class TechnicalIndicatorCalculator {
  /**
   * Calculate Simple Moving Average (SMA)
   * @param prices Array of closing prices
   * @param period Period for the moving average
   * @returns Moving average value for the most recent period
   */
  static calculateSMA(prices: number[], period: number): number | undefined {
    if (prices.length < period) return undefined;
    
    const recentPrices = prices.slice(-period);
    const sum = recentPrices.reduce((acc, price) => acc + price, 0);
    return sum / period;
  }

  /**
   * Calculate multiple Simple Moving Averages
   * @param prices Array of closing prices
   * @param periods Array of periods to calculate
   * @returns Object with MA values
   */
  static calculateMultipleSMAs(prices: number[], periods: number[]): Partial<TechnicalIndicators> {
    const indicators: Partial<TechnicalIndicators> = {};
    
    if (periods.includes(10)) {
      indicators.ma10 = this.calculateSMA(prices, 10);
    }
    if (periods.includes(30)) {
      indicators.ma30 = this.calculateSMA(prices, 30);
    }
    if (periods.includes(50)) {
      indicators.ma50 = this.calculateSMA(prices, 50);
    }
    
    return indicators;
  }

  /**
   * Calculate Relative Strength Index (RSI)
   * @param prices Array of closing prices
   * @param period Period for RSI calculation (default 14)
   * @returns RSI value (0-100)
   */
  static calculateRSI(prices: number[], period: number = 14): number | undefined {
    if (prices.length < period + 1) return undefined;

    // Calculate price changes
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }

    if (changes.length < period) return undefined;

    // Separate gains and losses
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);

    // Calculate initial average gain and loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;

    // Calculate smoothed averages using Wilder's method
    for (let i = period; i < changes.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
    }

    // Avoid division by zero
    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return Math.round(rsi * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate True Range for a single period
   * @param current Current OHLC data
   * @param previous Previous OHLC data
   * @returns True Range value
   */
  static calculateTrueRange(current: PriceData, previous: PriceData): number {
    const hl = current.high - current.low;
    const hcp = Math.abs(current.high - previous.close);
    const lcp = Math.abs(current.low - previous.close);
    
    return Math.max(hl, hcp, lcp);
  }

  /**
   * Calculate Average True Range (ATR)
   * @param ohlcData Array of OHLC data points
   * @param period Period for ATR calculation (default 14)
   * @returns ATR value
   */
  static calculateATR(ohlcData: PriceData[], period: number = 14): number | undefined {
    if (ohlcData.length < period + 1) return undefined;

    // Calculate True Range for each period
    const trueRanges = [];
    for (let i = 1; i < ohlcData.length; i++) {
      const tr = this.calculateTrueRange(ohlcData[i], ohlcData[i - 1]);
      trueRanges.push(tr);
    }

    if (trueRanges.length < period) return undefined;

    // Calculate initial ATR (simple average of first period)
    let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period;

    // Calculate smoothed ATR using Wilder's method
    for (let i = period; i < trueRanges.length; i++) {
      atr = ((atr * (period - 1)) + trueRanges[i]) / period;
    }
    
    return Math.round(atr * 10000) / 10000; // Round to 4 decimal places
  }

  /**
   * Calculate all technical indicators for given price data
   * @param ohlcData Array of OHLC data points (newest first)
   * @returns Complete technical indicators object
   */
  static calculateAllIndicators(ohlcData: OHLCDataPoint[]): TechnicalIndicators {
    // Sort data by timestamp to ensure chronological order (oldest first)
    const sortedData = [...ohlcData].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Extract closing prices
    const closingPrices = sortedData.map(data => data.close);

    // Convert to PriceData format for ATR calculation
    const priceData: PriceData[] = sortedData.map(data => ({
      timestamp: data.timestamp,
      open: data.open,
      high: data.high,
      low: data.low,
      close: data.close,
      volume: data.volume
    }));

    // Calculate Moving Averages
    const movingAverages = this.calculateMultipleSMAs(closingPrices, [10, 30, 50]);

    // Calculate RSI
    const rsi14 = this.calculateRSI(closingPrices, 14);

    // Calculate ATR
    const atr14 = this.calculateATR(priceData, 14);

    return {
      ma10: movingAverages.ma10,
      ma30: movingAverages.ma30,
      ma50: movingAverages.ma50,
      rsi14,
      atr14
    };
  }

  /**
   * Validate OHLC data integrity
   * @param ohlcData Array of OHLC data points
   * @returns Array of validation errors (empty if valid)
   */
  static validateOHLCData(ohlcData: OHLCDataPoint[]): string[] {
    const errors: string[] = [];

    for (let i = 0; i < ohlcData.length; i++) {
      const data = ohlcData[i];
      
      // Check for valid OHLC relationships
      if (data.high < data.low) {
        errors.push(`Invalid OHLC at index ${i}: High (${data.high}) < Low (${data.low})`);
      }
      
      if (data.open < data.low || data.open > data.high) {
        errors.push(`Invalid OHLC at index ${i}: Open (${data.open}) outside High-Low range`);
      }
      
      if (data.close < data.low || data.close > data.high) {
        errors.push(`Invalid OHLC at index ${i}: Close (${data.close}) outside High-Low range`);
      }
      
      // Check for non-positive values
      if (data.open <= 0 || data.high <= 0 || data.low <= 0 || data.close <= 0) {
        errors.push(`Invalid OHLC at index ${i}: Contains non-positive values`);
      }
      
      // Check for volume if present
      if (data.volume !== undefined && data.volume < 0) {
        errors.push(`Invalid volume at index ${i}: Volume cannot be negative`);
      }
    }

    return errors;
  }

  /**
   * Get indicator interpretation and signals
   * @param indicators Technical indicators object
   * @param currentPrice Current asset price
   * @returns Object with interpretations and signals
   */
  static getIndicatorSignals(indicators: TechnicalIndicators, currentPrice: number): {
    rsiSignal: 'overbought' | 'oversold' | 'neutral';
    maSignal: 'bullish' | 'bearish' | 'neutral';
    volatilitySignal: 'high' | 'medium' | 'low';
    summary: string;
  } {
    // RSI signals
    let rsiSignal: 'overbought' | 'oversold' | 'neutral' = 'neutral';
    if (indicators.rsi14) {
      if (indicators.rsi14 > 70) rsiSignal = 'overbought';
      else if (indicators.rsi14 < 30) rsiSignal = 'oversold';
    }

    // Moving Average signals
    let maSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (indicators.ma10 && indicators.ma30 && indicators.ma50) {
      const shortAboveMedium = indicators.ma10 > indicators.ma30;
      const mediumAboveLong = indicators.ma30 > indicators.ma50;
      const priceAboveShort = currentPrice > indicators.ma10;
      
      if (shortAboveMedium && mediumAboveLong && priceAboveShort) {
        maSignal = 'bullish';
      } else if (!shortAboveMedium && !mediumAboveLong && !priceAboveShort) {
        maSignal = 'bearish';
      }
    }

    // ATR volatility signal (relative to price)
    let volatilitySignal: 'high' | 'medium' | 'low' = 'medium';
    if (indicators.atr14) {
      const atrPercent = (indicators.atr14 / currentPrice) * 100;
      if (atrPercent > 3) volatilitySignal = 'high';
      else if (atrPercent < 1) volatilitySignal = 'low';
    }

    // Generate summary
    let summary = 'Mixed signals';
    if (maSignal === 'bullish' && rsiSignal !== 'overbought') {
      summary = 'Bullish momentum';
    } else if (maSignal === 'bearish' && rsiSignal !== 'oversold') {
      summary = 'Bearish momentum';
    } else if (rsiSignal === 'overbought') {
      summary = 'Potentially overbought';
    } else if (rsiSignal === 'oversold') {
      summary = 'Potentially oversold';
    }

    return {
      rsiSignal,
      maSignal,
      volatilitySignal,
      summary
    };
  }
}