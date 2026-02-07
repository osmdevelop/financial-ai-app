import OpenAI from "openai";
import { alphaVantage } from "./alpha.js";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  published: string;
  symbols: string[];
  sentimentScore?: number;
  sentimentLabel?: string;
}

interface NewsCluster {
  id: string;
  topic: string;
  description: string;
  headlines: NewsArticle[];
  embedding?: number[];
}

interface ImpactAnalysis {
  direction: "up" | "down" | "neutral";
  magnitude: 1 | 2 | 3;
  confidence: number; // 0-1
  why: string;
}

// In-memory cache for embeddings and analysis (since database is having issues)
const embeddingCache = new Map<string, number[]>();
const analysisCache = new Map<string, ImpactAnalysis>();
const clusterCache = new Map<string, NewsCluster[]>();

export class NewsClusteringService {
  
  /**
   * Get news articles with clustering and impact analysis
   */
  async getClusteredNews(options: {
    scope?: "all" | "portfolio" | "focus";
    symbols?: string[];
    limit?: number;
  } = {}): Promise<{
    headlines: NewsArticle[];
    clusters: NewsCluster[];
    freshness: {
      lastUpdated: string;
      source: string;
      isLive: boolean;
    };
  }> {
    const { scope = "all", symbols, limit = 50 } = options;
    
    try {
      // Get news from Alpha Vantage
      const rawNews = await alphaVantage.getNewsAndSentiment({
        tickers: symbols,
        topics: ["financial_markets"],
        sort: "LATEST",
        limit,
      });

      // Normalize and deduplicate
      const articles = this.normalizeAndDedupe(rawNews);
      
      // Filter by scope
      const filteredArticles = this.filterByScope(articles, scope, symbols);

      // Cluster by similarity
      const clusters = await this.clusterByEmbeddings(filteredArticles);

      return {
        headlines: filteredArticles,
        clusters,
        freshness: {
          lastUpdated: new Date().toISOString(),
          source: "Alpha Vantage + OpenAI",
          isLive: true,
        },
      };
    } catch (error) {
      console.error("News clustering error:", error);
      // Return fallback mock data
      return this.getFallbackNews();
    }
  }

  /**
   * Analyze news impact using OpenAI
   */
  async analyzeImpact(
    title: string,
    summary?: string,
    symbols: string[] = []
  ): Promise<ImpactAnalysis> {
    const cacheKey = `${title}:${summary}:${symbols.join(",")}`;
    
    // Check cache first
    if (analysisCache.has(cacheKey)) {
      return analysisCache.get(cacheKey)!;
    }

    try {
      const prompt = `Analyze the market impact of this news:

Title: ${title}
Summary: ${summary || "No summary available"}
Related Symbols: ${symbols.join(", ") || "General market"}

Provide analysis in JSON format:
{
  "direction": "up|down|neutral",
  "magnitude": 1-3 (1=low, 2=medium, 3=high impact),
  "confidence": 0.0-1.0,
  "why": "Brief explanation of why this news matters"
}

Consider factors like:
- Market sentiment implications
- Sector/company-specific impacts
- Economic indicators significance
- Policy/regulatory changes`;

      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are a financial markets expert. Analyze news impact accurately and concisely.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      
      const analysis: ImpactAnalysis = {
        direction: result.direction || "neutral",
        magnitude: Math.max(1, Math.min(3, result.magnitude || 1)) as 1 | 2 | 3,
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        why: result.why || "Analysis unavailable",
      };

      // Cache the result
      analysisCache.set(cacheKey, analysis);
      
      return analysis;
    } catch (error) {
      console.error("Impact analysis error:", error);
      return {
        direction: "neutral",
        magnitude: 1,
        confidence: 0.3,
        why: "Unable to analyze impact - analysis service unavailable",
      };
    }
  }

  /**
   * Normalize Alpha Vantage data and remove duplicates
   */
  private normalizeAndDedupe(rawNews: any[]): NewsArticle[] {
    const seen = new Set<string>();
    const articles: NewsArticle[] = [];

    for (const article of rawNews) {
      // Create deduplication key
      const dedupeKey = `${article.title}:${article.url}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      // Extract symbols from ticker sentiment
      const symbols = (article.tickerSentiment || []).map((ts: any) => ts.ticker);

      articles.push({
        id: `av_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: article.title,
        summary: article.summary || "",
        url: article.url || "",
        source: article.source || "Unknown",
        published: this.normalizeDate(article.timePublished),
        symbols,
        sentimentScore: article.overallSentimentScore,
        sentimentLabel: article.overallSentimentLabel,
      });
    }

    return articles;
  }

  /**
   * Filter articles by scope
   */
  private filterByScope(
    articles: NewsArticle[],
    scope: string,
    symbols?: string[]
  ): NewsArticle[] {
    if (scope === "all" || !symbols) {
      return articles;
    }

    return articles.filter(article => 
      article.symbols.some(symbol => symbols.includes(symbol))
    );
  }

  /**
   * Cluster articles by title similarity using OpenAI embeddings
   */
  private async clusterByEmbeddings(articles: NewsArticle[]): Promise<NewsCluster[]> {
    if (articles.length === 0) return [];

    const cacheKey = articles.map(a => a.id).sort().join(",");
    if (clusterCache.has(cacheKey)) {
      return clusterCache.get(cacheKey)!;
    }

    try {
      // Get embeddings for all titles
      const embeddings = await this.getEmbeddings(articles.map(a => a.title));
      
      // Simple clustering: group by cosine similarity threshold
      const clusters: NewsCluster[] = [];
      const clustered = new Set<number>();

      for (let i = 0; i < articles.length; i++) {
        if (clustered.has(i)) continue;

        const cluster: NewsCluster = {
          id: `cluster_${Date.now()}_${i}`,
          topic: await this.generateTopicName([articles[i].title]),
          description: "",
          headlines: [articles[i]],
        };

        clustered.add(i);

        // Find similar articles
        for (let j = i + 1; j < articles.length; j++) {
          if (clustered.has(j)) continue;

          const similarity = this.cosineSimilarity(embeddings[i], embeddings[j]);
          if (similarity > 0.7) { // Threshold for clustering
            cluster.headlines.push(articles[j]);
            clustered.add(j);
          }
        }

        // Update topic name if cluster has multiple articles
        if (cluster.headlines.length > 1) {
          cluster.topic = await this.generateTopicName(
            cluster.headlines.map(h => h.title)
          );
        }

        clusters.push(cluster);
      }

      // Cache clusters
      clusterCache.set(cacheKey, clusters);
      
      return clusters;
    } catch (error) {
      console.error("Clustering error:", error);
      // Return each article as its own cluster
      return articles.map((article, i) => ({
        id: `single_${i}`,
        topic: article.title.substring(0, 50) + "...",
        description: "",
        headlines: [article],
      }));
    }
  }

  /**
   * Get OpenAI embeddings for text array
   */
  private async getEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      // Check cache first
      if (embeddingCache.has(text)) {
        embeddings.push(embeddingCache.get(text)!);
        continue;
      }

      try {
        const response = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: text,
        });

        const embedding = response.data[0].embedding;
        embeddingCache.set(text, embedding);
        embeddings.push(embedding);
      } catch (error) {
        if (process.env.NODE_ENV !== "test") {
          console.warn("Embedding skipped (missing OPENAI_API_KEY or API error), using fallback for:", text.substring(0, 50));
        }
        // Use zero vector as fallback
        embeddings.push(new Array(1536).fill(0));
      }
    }

    return embeddings;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Generate topic name for a cluster using OpenAI
   */
  private async generateTopicName(titles: string[]): Promise<string> {
    if (titles.length === 1) {
      return titles[0].length > 60 ? titles[0].substring(0, 57) + "..." : titles[0];
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Generate a concise 3-5 word topic name that captures the common theme of these news headlines.",
          },
          {
            role: "user",
            content: `Headlines:\n${titles.join("\n")}\n\nTopic name:`,
          },
        ],
      });

      return response.choices[0].message.content?.trim() || "Market News";
    } catch (error) {
      console.error("Topic generation error:", error);
      return "Market News";
    }
  }

  /**
   * Normalize date format
   */
  private normalizeDate(dateString: string): string {
    try {
      // Alpha Vantage format: 20250911T143000
      const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(dateString);
      if (match) {
        const [, year, month, day, hour, minute, second] = match;
        return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      }
      return new Date(dateString).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Fallback mock data when APIs fail
   */
  private getFallbackNews() {
    const mockArticles: NewsArticle[] = [
      {
        id: "mock_1",
        title: "Market Update: Tech Earnings Drive Sentiment",
        summary: "Technology sector earnings results showing mixed performance with AI companies outperforming traditional tech.",
        url: "",
        source: "Financial News",
        published: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        symbols: ["AAPL", "MSFT", "GOOGL"],
        sentimentScore: 0.2,
        sentimentLabel: "Somewhat-Bullish",
      },
      {
        id: "mock_2", 
        title: "Federal Reserve Policy Update Expected This Week",
        summary: "Markets anticipating Fed announcement on interest rate policy amid inflation concerns.",
        url: "",
        source: "Economic Times",
        published: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        symbols: [],
        sentimentScore: -0.1,
        sentimentLabel: "Neutral",
      },
    ];

    const mockClusters: NewsCluster[] = [
      {
        id: "mock_cluster_1",
        topic: "Technology Earnings",
        description: "Earnings reports from major tech companies",
        headlines: [mockArticles[0]],
      },
      {
        id: "mock_cluster_2",
        topic: "Federal Reserve Policy",
        description: "Central bank monetary policy updates",
        headlines: [mockArticles[1]],
      },
    ];

    return {
      headlines: mockArticles,
      clusters: mockClusters,
      freshness: {
        lastUpdated: new Date().toISOString(),
        source: "Mock Data",
        isLive: false,
      },
    };
  }
}

export const newsClusteringService = new NewsClusteringService();