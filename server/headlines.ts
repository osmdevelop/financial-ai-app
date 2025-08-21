import { alphaVantage } from "./alpha";

interface NormalizedHeadline {
  id: string;
  published: string;
  title: string;
  source: string;
  url: string;
  symbols: string[];
  summary: string;
  sentimentScore?: number;
  sentimentLabel?: string;
}

export class HeadlinesService {
  async getTimeline(options: {
    tickers?: string[];
    limit?: number;
  } = {}): Promise<NormalizedHeadline[]> {
    try {
      const newsData = await alphaVantage.getNewsAndSentiment({
        tickers: options.tickers,
        topics: ["financial_markets"],
        sort: "LATEST",
        limit: options.limit || 50
      });

      return newsData.map((article: any, index: number) => ({
        id: `av_${Date.now()}_${index}`,
        published: article.timePublished,
        title: article.title,
        source: article.source,
        url: article.url,
        symbols: (article.tickerSentiment as any[])?.map((ts: any) => ts.ticker) || [],
        summary: article.summary,
        sentimentScore: article.overallSentimentScore,
        sentimentLabel: article.overallSentimentLabel
      }));
    } catch (error) {
      console.error("Headlines service error:", error);
      
      // Fallback to mock data
      return [
        {
          id: "fallback_1",
          published: new Date().toISOString(),
          title: "Market Update: Mixed Trading Continues",
          source: "Financial News",
          url: "#",
          symbols: ["SPY", "QQQ"],
          summary: "Markets showing mixed signals as investors digest latest economic data.",
          sentimentScore: 0.1,
          sentimentLabel: "Neutral"
        }
      ];
    }
  }
}

export const headlinesService = new HeadlinesService();