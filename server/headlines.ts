import { alphaVantage } from "./alpha";

interface NormalizedHeadline {
  id: string;
  published: string; // ISO
  title: string;
  source: string;
  url: string;
  symbols: string[];
  summary: string;
  sentimentScore?: number;
  sentimentLabel?: string;
}

// Alpha Vantage gives '20250911T143000' (UTC). Normalize to ISO.
function normalizeAVTime(s: string | undefined): string {
  if (!s) return new Date().toISOString();
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return `${y}-${mo}-${d}T${h}:${mi}:${se}Z`;
  }
  // Fallback – try Date constructor
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export class HeadlinesService {
  async getTimeline(
    options: {
      tickers?: string[];
      limit?: number;
      allowMock?: boolean; // <— new
    } = {},
  ): Promise<NormalizedHeadline[]> {
    const { tickers, limit = 50, allowMock = true } = options;
    try {
      const newsData = await alphaVantage.getNewsAndSentiment({
        tickers,
        topics: ["financial_markets"],
        sort: "LATEST",
        limit,
      });

      if (Array.isArray(newsData) && newsData.length > 0) {
        return newsData.map((article: any, index: number) => ({
          id: `av_${Date.now()}_${index}`,
          published: normalizeAVTime(article.timePublished),
          title: article.title,
          source: article.source,
          url: article.url || "",
          symbols:
            (article.tickerSentiment as any[])?.map((ts: any) => ts.ticker) ||
            [],
          summary: article.summary,
          sentimentScore: article.overallSentimentScore,
          sentimentLabel: article.overallSentimentLabel,
        }));
      }

      // Empty array (often rate limited)
      throw new Error("Alpha Vantage returned no data");
    } catch (error) {
      console.error("Headlines service error:", error);
      if (!allowMock) {
        // Let the route decide what to do (502 or explicit mock)
        throw error;
      }
      // Fallback enhanced mocks (urls empty so UI hides "Read more")
      return [
        {
          id: "fallback_1",
          published: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          title: "Market Update: Tech Earnings Drive Market Sentiment",
          source: "Financial News",
          url: "",
          symbols: ["SPY", "QQQ", "AAPL"],
          summary:
            "Technology sector earnings continue to influence broader market trends as investors assess quarterly results.",
          sentimentScore: 0.2,
          sentimentLabel: "Slightly Positive",
        },
        {
          id: "fallback_2",
          published: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
          title: "Federal Reserve Policy Update Affects Market Direction",
          source: "Reuters",
          url: "",
          symbols: ["SPY", "IWM"],
          summary:
            "Recent Federal Reserve communications signal potential policy adjustments amid evolving economic conditions.",
          sentimentScore: -0.1,
          sentimentLabel: "Slightly Negative",
        },
        {
          id: "fallback_3",
          published: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
          title: "Energy Sector Shows Resilience in Current Market Environment",
          source: "Bloomberg",
          url: "",
          symbols: ["XLE", "CVX"],
          summary:
            "Energy companies demonstrate stability as commodity prices find support from improving demand outlook.",
          sentimentScore: 0.15,
          sentimentLabel: "Positive",
        },
      ];
    }
  }
}

export const headlinesService = new HeadlinesService();
