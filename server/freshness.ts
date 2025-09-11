import { FreshnessMetadata } from "@shared/schema";

/**
 * Utility functions for consistent freshness metadata across all API responses
 */

/**
 * Creates freshness metadata for API responses
 */
export function createFreshnessMetadata(options: {
  dataSource: "live" | "mock" | "cached" | "fallback";
  sourceName?: string;
  customDisclaimer?: string;
  dataAge?: number; // minutes since data was fetched
}): FreshnessMetadata {
  const { dataSource, sourceName, customDisclaimer, dataAge = 0 } = options;

  // Determine freshness based on data age and source
  let freshness: "realtime" | "recent" | "stale" | "unknown";
  if (dataSource === "mock" || dataSource === "fallback") {
    freshness = "unknown";
  } else if (dataAge <= 5) {
    freshness = "realtime";
  } else if (dataAge <= 60) {
    freshness = "recent";
  } else {
    freshness = "stale";
  }

  // Generate appropriate disclaimer
  let disclaimer = customDisclaimer;
  if (!disclaimer) {
    switch (dataSource) {
      case "live":
        disclaimer = sourceName ? `Live data from ${sourceName}` : "Live market data";
        break;
      case "cached":
        disclaimer = dataAge > 60 
          ? `Cached data (${Math.round(dataAge)} minutes old) - market may have moved`
          : `Recent data (${Math.round(dataAge)} minutes old)`;
        break;
      case "fallback":
        disclaimer = "Using sample data due to API rate limits - not for trading decisions";
        break;
      case "mock":
        disclaimer = "Sample data for demonstration purposes only";
        break;
    }
  }

  return {
    lastUpdated: new Date().toISOString(),
    dataSource,
    sourceName,
    freshness,
    disclaimer,
  };
}

/**
 * Creates fallback freshness metadata when APIs fail
 */
export function createFallbackFreshness(reason: string): FreshnessMetadata {
  return createFreshnessMetadata({
    dataSource: "fallback",
    customDisclaimer: `Using sample data: ${reason}`,
  });
}

/**
 * Creates live data freshness metadata
 */
export function createLiveFreshness(sourceName: string, dataAge?: number): FreshnessMetadata {
  return createFreshnessMetadata({
    dataSource: "live",
    sourceName,
    dataAge,
  });
}

/**
 * Creates mock data freshness metadata
 */
export function createMockFreshness(reason: string = "Demo data"): FreshnessMetadata {
  return createFreshnessMetadata({
    dataSource: "mock",
    customDisclaimer: reason,
  });
}

/**
 * Enhanced API response wrapper with freshness metadata
 */
export function withFreshness<T>(data: T, freshness: FreshnessMetadata) {
  return {
    data,
    meta: freshness,
  };
}