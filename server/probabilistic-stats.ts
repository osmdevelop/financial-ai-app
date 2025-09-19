import { ProbabilisticStats } from "@shared/schema.js";

export interface ReturnData {
  date: string;
  return: number;
  price: number;
}

export class ProbabilisticStatsCalculator {
  /**
   * Calculate daily returns from price series
   * @param prices Array of price objects with timestamp and close price
   * @returns Array of return data
   */
  static calculateReturns(prices: { timestamp: string; close: number }[]): ReturnData[] {
    const returns: ReturnData[] = [];
    
    // Sort prices by timestamp (oldest first)
    const sortedPrices = [...prices].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sortedPrices.length; i++) {
      const currentPrice = sortedPrices[i].close;
      const previousPrice = sortedPrices[i - 1].close;
      const dailyReturn = (currentPrice - previousPrice) / previousPrice;
      
      returns.push({
        date: sortedPrices[i].timestamp,
        return: dailyReturn,
        price: currentPrice
      });
    }

    return returns;
  }

  /**
   * Calculate Value at Risk (VaR) at given confidence level
   * @param returns Array of daily returns
   * @param confidenceLevel Confidence level (e.g., 0.95 for 95%)
   * @returns VaR value (positive number representing potential loss)
   */
  static calculateVaR(returns: number[], confidenceLevel: number = 0.95): number {
    if (returns.length === 0) return 0;

    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Find the index for the confidence level
    const index = Math.ceil((1 - confidenceLevel) * sortedReturns.length) - 1;
    const var95 = -sortedReturns[Math.max(0, index)]; // Convert to positive loss value
    
    return Math.round(var95 * 10000) / 100; // Return as percentage rounded to 2 decimals
  }

  /**
   * Calculate Expected Shortfall (ES) / Conditional VaR
   * @param returns Array of daily returns
   * @param confidenceLevel Confidence level (e.g., 0.95 for 95%)
   * @returns ES value (average loss beyond VaR)
   */
  static calculateES(returns: number[], confidenceLevel: number = 0.95): number {
    if (returns.length === 0) return 0;

    // Sort returns in ascending order
    const sortedReturns = [...returns].sort((a, b) => a - b);
    
    // Find the VaR threshold
    const varIndex = Math.ceil((1 - confidenceLevel) * sortedReturns.length) - 1;
    
    // Calculate average of all returns below VaR threshold
    const tailReturns = sortedReturns.slice(0, Math.max(1, varIndex + 1));
    const avgTailReturn = tailReturns.reduce((sum, ret) => sum + ret, 0) / tailReturns.length;
    
    const es95 = -avgTailReturn; // Convert to positive loss value
    return Math.round(es95 * 10000) / 100; // Return as percentage rounded to 2 decimals
  }

  /**
   * Calculate directional odds for different time horizons
   * @param returns Array of daily returns
   * @returns Object with up/down odds for different periods
   */
  static calculateDirectionalOdds(returns: number[]): {
    odds1d: { up: number; down: number };
    odds5d: { up: number; down: number };
    odds30d: { up: number; down: number };
  } {
    if (returns.length === 0) {
      return {
        odds1d: { up: 50, down: 50 },
        odds5d: { up: 50, down: 50 },
        odds30d: { up: 50, down: 50 }
      };
    }

    // Calculate 1-day odds from historical returns
    const upDays = returns.filter(ret => ret > 0).length;
    const downDays = returns.filter(ret => ret < 0).length;
    const totalDays = upDays + downDays; // Exclude flat days
    
    const odds1d = {
      up: totalDays > 0 ? Math.round((upDays / totalDays) * 100) : 50,
      down: totalDays > 0 ? Math.round((downDays / totalDays) * 100) : 50
    };

    // For multi-day periods, calculate rolling returns
    const odds5d = this.calculateMultiDayOdds(returns, 5);
    const odds30d = this.calculateMultiDayOdds(returns, 30);

    return { odds1d, odds5d, odds30d };
  }

  /**
   * Calculate multi-day directional odds
   * @param returns Array of daily returns
   * @param days Number of days for rolling calculation
   * @returns Up/down odds for the period
   */
  private static calculateMultiDayOdds(returns: number[], days: number): { up: number; down: number } {
    if (returns.length < days) {
      return { up: 50, down: 50 };
    }

    const multiDayReturns = [];
    
    // Calculate rolling N-day returns
    for (let i = 0; i <= returns.length - days; i++) {
      const periodReturns = returns.slice(i, i + days);
      // Compound the returns: (1+r1)*(1+r2)*...*(1+rN) - 1
      const compoundReturn = periodReturns.reduce((acc, ret) => acc * (1 + ret), 1) - 1;
      multiDayReturns.push(compoundReturn);
    }

    const upPeriods = multiDayReturns.filter(ret => ret > 0).length;
    const downPeriods = multiDayReturns.filter(ret => ret < 0).length;
    const totalPeriods = upPeriods + downPeriods;

    return {
      up: totalPeriods > 0 ? Math.round((upPeriods / totalPeriods) * 100) : 50,
      down: totalPeriods > 0 ? Math.round((downPeriods / totalPeriods) * 100) : 50
    };
  }

  /**
   * Calculate probability of achieving +3% gains in N days
   * @param returns Array of daily returns
   * @returns Probabilities for different time horizons
   */
  static calculateUpside3PctOdds(returns: number[]): {
    in7days: number;
    in14days: number;
    in30days: number;
  } {
    if (returns.length === 0) {
      return { in7days: 25, in14days: 35, in30days: 50 };
    }

    const in7days = this.calculateUpsideOdds(returns, 7, 0.03);
    const in14days = this.calculateUpsideOdds(returns, 14, 0.03);
    const in30days = this.calculateUpsideOdds(returns, 30, 0.03);

    return { in7days, in14days, in30days };
  }

  /**
   * Calculate upside odds for specific threshold and timeframe
   * @param returns Array of daily returns
   * @param days Number of days for the period
   * @param threshold Target return threshold (e.g., 0.03 for 3%)
   * @returns Probability as percentage
   */
  private static calculateUpsideOdds(returns: number[], days: number, threshold: number): number {
    if (returns.length < days) {
      // Use daily probability as approximation
      const dailyUpCount = returns.filter(ret => ret > threshold / days).length;
      return Math.round((dailyUpCount / returns.length) * 100);
    }

    const multiDayReturns = [];
    
    // Calculate rolling N-day returns
    for (let i = 0; i <= returns.length - days; i++) {
      const periodReturns = returns.slice(i, i + days);
      const compoundReturn = periodReturns.reduce((acc, ret) => acc * (1 + ret), 1) - 1;
      multiDayReturns.push(compoundReturn);
    }

    const successfulPeriods = multiDayReturns.filter(ret => ret >= threshold).length;
    return Math.round((successfulPeriods / multiDayReturns.length) * 100);
  }

  /**
   * Calculate comprehensive probabilistic statistics
   * @param priceData Array of price data with timestamp and close price
   * @returns Complete probabilistic statistics object
   */
  static calculateAllStats(priceData: { timestamp: string; close: number }[]): ProbabilisticStats {
    const returnData = this.calculateReturns(priceData);
    const returns = returnData.map(r => r.return);

    // Calculate VaR and ES at 95% confidence level
    const var95 = this.calculateVaR(returns, 0.95);
    const es95 = this.calculateES(returns, 0.95);

    // Calculate directional odds
    const directionalOdds = this.calculateDirectionalOdds(returns);

    // Calculate upside odds for 3% target
    const upside3pct = this.calculateUpside3PctOdds(returns);

    return {
      odds1d: directionalOdds.odds1d,
      odds5d: directionalOdds.odds5d,
      odds30d: directionalOdds.odds30d,
      var95,
      es95,
      upside3pct
    };
  }

  /**
   * Get risk interpretation based on VaR and ES values
   * @param var95 Value at Risk (95%)
   * @param es95 Expected Shortfall (95%)
   * @returns Risk assessment and interpretation
   */
  static getRiskInterpretation(var95: number, es95: number): {
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    interpretation: string;
    recommendations: string[];
  } {
    let riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    let interpretation: string;
    const recommendations: string[] = [];

    // Classify risk level based on VaR
    if (var95 < 2) {
      riskLevel = 'low';
      interpretation = 'Low volatility asset with minimal downside risk';
      recommendations.push('Suitable for conservative portfolios');
    } else if (var95 < 5) {
      riskLevel = 'medium';
      interpretation = 'Moderate risk asset with typical market volatility';
      recommendations.push('Appropriate for balanced portfolios');
    } else if (var95 < 10) {
      riskLevel = 'high';
      interpretation = 'High volatility asset with significant downside potential';
      recommendations.push('Consider position sizing carefully');
      recommendations.push('Monitor closely for risk management');
    } else {
      riskLevel = 'extreme';
      interpretation = 'Extremely volatile asset with severe downside risk';
      recommendations.push('Only suitable for high-risk tolerance investors');
      recommendations.push('Use small position sizes');
      recommendations.push('Consider hedging strategies');
    }

    // Add ES-specific recommendations
    const tailRisk = es95 - var95;
    if (tailRisk > 2) {
      recommendations.push('High tail risk - losses could exceed typical expectations');
    }

    return {
      riskLevel,
      interpretation,
      recommendations
    };
  }

  /**
   * Calculate statistical summary metrics
   * @param returns Array of daily returns
   * @returns Summary statistics object
   */
  static calculateSummaryStats(returns: number[]): {
    mean: number;
    volatility: number;
    skewness: number;
    kurtosis: number;
    sharpeRatio: number;
  } {
    if (returns.length === 0) {
      return { mean: 0, volatility: 0, skewness: 0, kurtosis: 0, sharpeRatio: 0 };
    }

    // Calculate mean
    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;

    // Calculate volatility (standard deviation)
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // Calculate skewness
    const skewness = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / volatility, 3), 0) / returns.length;

    // Calculate kurtosis
    const kurtosis = returns.reduce((sum, ret) => sum + Math.pow((ret - mean) / volatility, 4), 0) / returns.length - 3;

    // Calculate Sharpe ratio (assuming risk-free rate of 0 for simplicity)
    const sharpeRatio = volatility > 0 ? mean / volatility : 0;

    return {
      mean: Math.round(mean * 10000) / 100, // Convert to percentage
      volatility: Math.round(volatility * 10000) / 100,
      skewness: Math.round(skewness * 100) / 100,
      kurtosis: Math.round(kurtosis * 100) / 100,
      sharpeRatio: Math.round(sharpeRatio * 100) / 100
    };
  }
}