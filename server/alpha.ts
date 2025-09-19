import { z } from "zod";
import { getCachedOrFetch } from "./cache.js";

class AlphaVantageAPI {
  private apiKey: string;
  private baseUrl = "https://www.alphavantage.co/query";
  private requestQueue: Promise<any>[] = [];
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_MS = 12000; // 5 requests per minute = 12 seconds between requests

  constructor() {
    this.apiKey = process.env.ALPHAVANTAGE_KEY || "";
    if (!this.apiKey) {
      console.warn("ALPHAVANTAGE_KEY not set - Alpha Vantage features will use fallback data");
    }
  }

  private getCacheKey(params: Record<string, any>): string {
    return `alpha:${JSON.stringify(params, Object.keys(params).sort())}`;
  }

  private async rateLimitedRequest<T>(params: Record<string, any>): Promise<T> {
    const cacheKey = this.getCacheKey(params);
    const ttlSec = parseInt(process.env.CACHE_TTL_PRICE_SEC || "900", 10);

    // Check DATA_MODE first
    if (process.env.DATA_MODE === "mock") {
      return this.getMockData(params.function, params.symbol || params.from_symbol) as T;
    }

    return getCachedOrFetch(cacheKey, ttlSec, async () => {
      if (!this.apiKey) {
        throw new Error("Alpha Vantage API key not configured - fallback to mock data");
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

      return data;
    }).then(result => result.data).catch(error => {
      console.warn(`Alpha Vantage API failed, using mock data:`, error.message);
      return this.getMockData(params.function, params.symbol || params.from_symbol) as T;
    });
  }

  private getMockData(functionName: string, symbol?: string): any {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (functionName) {
      case "TIME_SERIES_INTRADAY":
        return {
          [`Time Series (5min)`]: {
            [now.toISOString()]: {
              "1. open": "150.00",
              "2. high": "152.00",
              "3. low": "149.00",
              "4. close": "151.00",
              "5. volume": "1000000"
            }
          }
        };
      
      case "TIME_SERIES_DAILY_ADJUSTED":
        return {
          "Time Series (Daily)": {
            [today]: {
              "1. open": "150.00",
              "2. high": "152.00", 
              "3. low": "149.00",
              "4. close": "151.00",
              "5. adjusted close": "151.00",
              "6. volume": "5000000",
              "7. dividend amount": "0.0000",
              "8. split coefficient": "1.0000"
            }
          }
        };
      
      case "NEWS_SENTIMENT":
        return {
          feed: [
            {
              title: "Sample Market News",
              url: "https://example.com/news",
              time_published: now.toISOString(),
              authors: ["Market Analyst"],
              summary: "Sample news for demonstration purposes.",
              source: "Sample Source",
              overall_sentiment_score: "0.2",
              overall_sentiment_label: "Somewhat-Bullish",
              ticker_sentiment: []
            }
          ]
        };
      
      case "SECTOR":
        return {
          "Rank A: Real-Time Performance": {
            "Technology": "1.5%",
            "Healthcare": "0.8%",
            "Financial Services": "-0.2%",
            "Energy": "-1.1%",
            "Consumer Discretionary": "0.5%",
            "Consumer Staples": "0.3%",
            "Industrials": "0.7%",
            "Materials": "-0.5%",
            "Real Estate": "0.2%",
            "Utilities": "-0.3%",
            "Communication Services": "0.9%"
          }
        };
      
      case "EARNINGS":
        return {
          annualEarnings: [],
          quarterlyEarnings: []
        };
      
      default:
        return {};
    }
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