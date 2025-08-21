import { z } from "zod";

interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class AlphaVantageAPI {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";
  private cache = new Map<string, CacheItem<any>>();
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_MS = 12000; // 5 requests per minute = 12 seconds between requests
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_KEY || "";
    if (!this.apiKey) {
      console.warn("ALPHAVANTAGE_KEY not set - Alpha Vantage features will use fallback data");
    }
  }

  private getCacheKey(params: Record<string, any>): string {
    return JSON.stringify(params, Object.keys(params).sort());
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.data;
    }
    if (item) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });
  }

  private async rateLimitedRequest<T>(params: Record<string, any>): Promise<T> {
    const cacheKey = this.getCacheKey(params);
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }

    if (!this.apiKey) {
      throw new Error("Alpha Vantage API key not configured");
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();

    const url = new URL(this.baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });
    url.searchParams.set("apikey", this.apiKey);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const data = await response.json() as any;
    
    if (data["Error Message"] || data["Information"]) {
      throw new Error(data["Error Message"] || data["Information"]);
    }

    this.setCache(cacheKey, data);
    return data;
  }

  async getIntraday(symbol: string, interval = "5min", outputsize = "compact") {
    try {
      const data = await this.rateLimitedRequest<any>({
        function: "TIME_SERIES_INTRADAY",
        symbol,
        interval,
        outputsize
      });

      const timeSeries = data[`Time Series (${interval})`] || {};
      return Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
        timestamp,
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
        volume: parseInt(values["5. volume"])
      }));
    } catch (error) {
      console.error(`Alpha Vantage intraday error for ${symbol}:`, error);
      return [];
    }
  }

  async getDailyAdjusted(symbol: string, outputsize = "compact") {
    try {
      const data = await this.rateLimitedRequest<any>({
        function: "TIME_SERIES_DAILY_ADJUSTED",
        symbol,
        outputsize
      });

      const timeSeries = data["Time Series (Daily)"] || {};
      return Object.entries(timeSeries).map(([date, values]: [string, any]) => ({
        date,
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"]),
        adjustedClose: parseFloat(values["5. adjusted close"]),
        volume: parseInt(values["6. volume"]),
        dividendAmount: parseFloat(values["7. dividend amount"]),
        splitCoefficient: parseFloat(values["8. split coefficient"])
      }));
    } catch (error) {
      console.error(`Alpha Vantage daily error for ${symbol}:`, error);
      return [];
    }
  }

  async getFxIntraday(fromSymbol: string, toSymbol: string, interval = "5min", outputsize = "compact") {
    try {
      const data = await this.rateLimitedRequest<any>({
        function: "FX_INTRADAY",
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        interval,
        outputsize
      });

      const timeSeries = data[`Time Series FX (${interval})`] || {};
      return Object.entries(timeSeries).map(([timestamp, values]: [string, any]) => ({
        timestamp,
        open: parseFloat(values["1. open"]),
        high: parseFloat(values["2. high"]),
        low: parseFloat(values["3. low"]),
        close: parseFloat(values["4. close"])
      }));
    } catch (error) {
      console.error(`Alpha Vantage FX error for ${fromSymbol}/${toSymbol}:`, error);
      return [];
    }
  }

  async getNewsAndSentiment(options: {
    tickers?: string[];
    topics?: string[];
    sort?: "LATEST" | "EARLIEST" | "RELEVANCE";
    limit?: number;
  } = {}) {
    try {
      const params: Record<string, any> = {
        function: "NEWS_SENTIMENT"
      };

      if (options.tickers?.length) {
        params.tickers = options.tickers.join(",");
      }
      if (options.topics?.length) {
        params.topics = options.topics.join(",");
      }
      if (options.sort) {
        params.sort = options.sort;
      }
      if (options.limit) {
        params.limit = options.limit;
      }

      const data = await this.rateLimitedRequest<any>(params);
      
      return (data.feed || []).map((article: any) => ({
        title: article.title,
        url: article.url,
        timePublished: article.time_published,
        authors: article.authors || [],
        summary: article.summary,
        source: article.source,
        categoryWithinSource: article.category_within_source,
        sourceDomain: article.source_domain,
        topics: article.topics || [],
        overallSentimentScore: parseFloat(article.overall_sentiment_score || "0"),
        overallSentimentLabel: article.overall_sentiment_label,
        tickerSentiment: article.ticker_sentiment || []
      }));
    } catch (error) {
      console.error("Alpha Vantage news error:", error);
      return [];
    }
  }

  async getEarnings(symbol: string) {
    try {
      const data = await this.rateLimitedRequest<any>({
        function: "EARNINGS",
        symbol
      });

      return {
        annualEarnings: data.annualEarnings || [],
        quarterlyEarnings: data.quarterlyEarnings || []
      };
    } catch (error) {
      console.error(`Alpha Vantage earnings error for ${symbol}:`, error);
      return { annualEarnings: [], quarterlyEarnings: [] };
    }
  }

  async getSectorPerformance() {
    try {
      const data = await this.rateLimitedRequest<any>({
        function: "SECTOR"
      });

      const realTimePerformance = data["Rank A: Real-Time Performance"] || {};
      return Object.entries(realTimePerformance).map(([sector, performance]) => ({
        sector,
        performance: performance as string
      }));
    } catch (error) {
      console.error("Alpha Vantage sector performance error:", error);
      return [];
    }
  }
}

export const alphaVantage = new AlphaVantageAPI();