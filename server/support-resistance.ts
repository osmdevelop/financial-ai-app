import { SupportResistance, OHLCDataPoint } from "@shared/schema.js";

export interface SupportResistanceLevel {
  level: number;
  strength: number;
  type: 'support' | 'resistance';
  touchCount: number;
  lastTouch: string;
}

export interface LocalExtrema {
  timestamp: string;
  price: number;
  type: 'peak' | 'trough';
  volume?: number;
}

export class SupportResistanceCalculator {
  /**
   * Find local extrema (peaks and troughs) in price data
   * @param ohlcData Array of OHLC data points
   * @param lookback Number of periods to look back for extrema detection
   * @returns Array of local extrema
   */
  static findLocalExtrema(ohlcData: OHLCDataPoint[], lookback: number = 3): LocalExtrema[] {
    if (ohlcData.length < lookback * 2 + 1) return [];

    // Sort data by timestamp to ensure chronological order
    const sortedData = [...ohlcData].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const extrema: LocalExtrema[] = [];

    // Find peaks and troughs
    for (let i = lookback; i < sortedData.length - lookback; i++) {
      const current = sortedData[i];
      let isPeak = true;
      let isTrough = true;

      // Check if current point is a peak (higher than surrounding points)
      for (let j = i - lookback; j <= i + lookback; j++) {
        if (j !== i) {
          if (current.high <= sortedData[j].high) {
            isPeak = false;
          }
          if (current.low >= sortedData[j].low) {
            isTrough = false;
          }
        }
      }

      if (isPeak) {
        extrema.push({
          timestamp: current.timestamp,
          price: current.high,
          type: 'peak',
          volume: current.volume
        });
      }

      if (isTrough) {
        extrema.push({
          timestamp: current.timestamp,
          price: current.low,
          type: 'trough',
          volume: current.volume
        });
      }
    }

    return extrema;
  }

  /**
   * Cluster similar price levels to identify significant support/resistance
   * @param extrema Array of local extrema
   * @param tolerance Price tolerance for clustering (as percentage)
   * @returns Array of clustered levels
   */
  static clusterPriceLevels(extrema: LocalExtrema[], tolerance: number = 0.02): SupportResistanceLevel[] {
    if (extrema.length === 0) return [];

    const clusters: SupportResistanceLevel[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < extrema.length; i++) {
      if (processed.has(i)) continue;

      const baseExtrema = extrema[i];
      const cluster: LocalExtrema[] = [baseExtrema];
      processed.add(i);

      // Find all extrema within tolerance range
      for (let j = i + 1; j < extrema.length; j++) {
        if (processed.has(j)) continue;

        const targetExtrema = extrema[j];
        const priceDiff = Math.abs(baseExtrema.price - targetExtrema.price);
        const priceRange = (baseExtrema.price + targetExtrema.price) / 2;
        const percentageDiff = priceDiff / priceRange;

        if (percentageDiff <= tolerance) {
          cluster.push(targetExtrema);
          processed.add(j);
        }
      }

      // Only consider clusters with multiple touches
      if (cluster.length >= 2) {
        const avgPrice = cluster.reduce((sum, ext) => sum + ext.price, 0) / cluster.length;
        const supportCount = cluster.filter(ext => ext.type === 'trough').length;
        const resistanceCount = cluster.filter(ext => ext.type === 'peak').length;
        
        // Determine if it's primarily support or resistance
        const type = supportCount > resistanceCount ? 'support' : 'resistance';
        
        // Calculate strength based on touch count and volume
        const touchCount = cluster.length;
        const avgVolume = cluster
          .filter(ext => ext.volume !== undefined)
          .reduce((sum, ext) => sum + (ext.volume || 0), 0) / cluster.length;
        
        // Strength calculation: touch count (40%) + volume factor (30%) + recency (30%)
        const touchStrength = Math.min(touchCount / 5, 1) * 0.4;
        const volumeStrength = Math.min(avgVolume / 1000000, 1) * 0.3; // Normalize volume
        
        // Recency factor - more recent touches get higher weight
        const now = new Date().getTime();
        const recentTouches = cluster.filter(ext => {
          const touchTime = new Date(ext.timestamp).getTime();
          const daysDiff = (now - touchTime) / (1000 * 60 * 60 * 24);
          return daysDiff <= 30; // Within last 30 days
        });
        const recencyStrength = (recentTouches.length / touchCount) * 0.3;
        
        const strength = touchStrength + volumeStrength + recencyStrength;
        
        // Find most recent touch
        const sortedCluster = cluster.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        clusters.push({
          level: Math.round(avgPrice * 100) / 100,
          strength: Math.round(strength * 100) / 100,
          type,
          touchCount,
          lastTouch: sortedCluster[0].timestamp
        });
      }
    }

    // Sort by strength descending
    return clusters.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Apply volume-by-price proxy using candle count density
   * @param ohlcData Array of OHLC data points
   * @param levels Array of support/resistance levels
   * @returns Enhanced levels with volume-based adjustments
   */
  static applyVolumeByPriceProxy(
    ohlcData: OHLCDataPoint[], 
    levels: SupportResistanceLevel[]
  ): SupportResistanceLevel[] {
    const enhancedLevels = levels.map(level => {
      // Count candles that traded near this level
      const tolerance = 0.01; // 1% tolerance
      const candlesNearLevel = ohlcData.filter(candle => {
        const midPrice = (candle.high + candle.low) / 2;
        const diff = Math.abs(midPrice - level.level) / level.level;
        return diff <= tolerance;
      });

      // Calculate volume concentration
      const totalVolume = candlesNearLevel.reduce((sum, candle) => sum + (candle.volume || 0), 0);
      const avgVolume = totalVolume / Math.max(candlesNearLevel.length, 1);

      // Adjust strength based on volume concentration
      const volumeMultiplier = Math.min(avgVolume / 500000, 2); // Cap at 2x multiplier
      const adjustedStrength = Math.min(level.strength * (1 + volumeMultiplier * 0.2), 1);

      return {
        ...level,
        strength: Math.round(adjustedStrength * 100) / 100
      };
    });

    return enhancedLevels.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Filter levels by significance and proximity to current price
   * @param levels Array of support/resistance levels
   * @param currentPrice Current asset price
   * @param maxLevels Maximum number of levels to return
   * @param priceRange Maximum distance from current price (as percentage)
   * @returns Filtered and ranked levels
   */
  static filterSignificantLevels(
    levels: SupportResistanceLevel[],
    currentPrice: number,
    maxLevels: number = 5,
    priceRange: number = 0.1
  ): SupportResistanceLevel[] {
    const filtered = levels.filter(level => {
      const distance = Math.abs(level.level - currentPrice) / currentPrice;
      return distance <= priceRange && level.strength >= 0.3; // Minimum strength threshold
    });

    // Separate support and resistance
    const supportLevels = filtered
      .filter(level => level.type === 'support' && level.level < currentPrice)
      .slice(0, Math.ceil(maxLevels / 2));

    const resistanceLevels = filtered
      .filter(level => level.type === 'resistance' && level.level > currentPrice)
      .slice(0, Math.ceil(maxLevels / 2));

    return [...supportLevels, ...resistanceLevels];
  }

  /**
   * Calculate comprehensive support and resistance levels
   * @param ohlcData Array of OHLC data points
   * @param currentPrice Current asset price
   * @returns Support and resistance analysis
   */
  static calculateSupportResistance(
    ohlcData: OHLCDataPoint[],
    currentPrice: number
  ): SupportResistance {
    // Find local extrema
    const extrema = this.findLocalExtrema(ohlcData, 3);

    // Cluster price levels
    const clusteredLevels = this.clusterPriceLevels(extrema, 0.015); // 1.5% tolerance

    // Apply volume-by-price proxy
    const volumeEnhancedLevels = this.applyVolumeByPriceProxy(ohlcData, clusteredLevels);

    // Filter significant levels
    const significantLevels = this.filterSignificantLevels(
      volumeEnhancedLevels, 
      currentPrice, 
      8, // Max 8 levels total
      0.15 // Within 15% of current price
    );

    // Separate into support and resistance
    const support = significantLevels
      .filter(level => level.type === 'support')
      .map(level => ({
        level: level.level,
        strength: level.strength
      }));

    const resistance = significantLevels
      .filter(level => level.type === 'resistance')
      .map(level => ({
        level: level.level,
        strength: level.strength
      }));

    return { support, resistance };
  }

  /**
   * Get trading signals based on support/resistance levels
   * @param levels Support and resistance levels
   * @param currentPrice Current asset price
   * @param recentPrice Price from recent period for trend analysis
   * @returns Trading signals and analysis
   */
  static getTradingSignals(
    levels: SupportResistance,
    currentPrice: number,
    recentPrice: number
  ): {
    nearestSupport: number | null;
    nearestResistance: number | null;
    signal: 'bullish' | 'bearish' | 'neutral';
    analysis: string;
    keyLevels: { level: number; type: 'support' | 'resistance'; distance: number }[];
  } {
    // Find nearest levels
    const nearestSupport = levels.support
      .filter(s => s.level < currentPrice)
      .sort((a, b) => b.level - a.level)[0]?.level || null;

    const nearestResistance = levels.resistance
      .filter(r => r.level > currentPrice)
      .sort((a, b) => a.level - b.level)[0]?.level || null;

    // Calculate distances
    const supportDistance = nearestSupport ? 
      (currentPrice - nearestSupport) / currentPrice : null;
    const resistanceDistance = nearestResistance ? 
      (nearestResistance - currentPrice) / currentPrice : null;

    // Determine signal
    let signal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let analysis = 'Price trading in neutral zone';

    const trend = currentPrice > recentPrice ? 'up' : 'down';

    if (supportDistance && supportDistance < 0.02) {
      signal = trend === 'down' ? 'bearish' : 'bullish';
      analysis = `Price near strong support at ${nearestSupport?.toFixed(2)}`;
    } else if (resistanceDistance && resistanceDistance < 0.02) {
      signal = trend === 'up' ? 'bearish' : 'bullish';
      analysis = `Price near strong resistance at ${nearestResistance?.toFixed(2)}`;
    } else if (trend === 'up' && resistanceDistance && resistanceDistance > 0.05) {
      signal = 'bullish';
      analysis = 'Uptrend with room to next resistance';
    } else if (trend === 'down' && supportDistance && supportDistance > 0.05) {
      signal = 'bearish';
      analysis = 'Downtrend with room to next support';
    }

    // Compile key levels with distances
    const keyLevels = [
      ...levels.support.map(s => ({
        level: s.level,
        type: 'support' as const,
        distance: Math.abs(currentPrice - s.level) / currentPrice
      })),
      ...levels.resistance.map(r => ({
        level: r.level,
        type: 'resistance' as const,
        distance: Math.abs(currentPrice - r.level) / currentPrice
      }))
    ].sort((a, b) => a.distance - b.distance).slice(0, 4);

    return {
      nearestSupport,
      nearestResistance,
      signal,
      analysis,
      keyLevels
    };
  }

  /**
   * Validate price levels for consistency
   * @param levels Support and resistance levels
   * @param currentPrice Current asset price
   * @returns Validation results
   */
  static validateLevels(levels: SupportResistance, currentPrice: number): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check if support levels are below current price
    const invalidSupport = levels.support.filter(s => s.level > currentPrice);
    if (invalidSupport.length > 0) {
      warnings.push(`${invalidSupport.length} support levels above current price`);
    }

    // Check if resistance levels are above current price
    const invalidResistance = levels.resistance.filter(r => r.level < currentPrice);
    if (invalidResistance.length > 0) {
      warnings.push(`${invalidResistance.length} resistance levels below current price`);
    }

    // Check for reasonable strength values
    const weakLevels = [...levels.support, ...levels.resistance].filter(l => l.strength < 0.1);
    if (weakLevels.length > 0) {
      warnings.push(`${weakLevels.length} levels with very low strength`);
    }

    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}