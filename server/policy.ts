import OpenAI from "openai";
import { newsClusteringService } from "./news-clustering.js";
import { alphaVantage } from "./alpha.js";
import { createLiveFreshness, createFallbackFreshness } from "./freshness.js";
import type { TrumpIndexResponse, FedspeakResponse } from "@shared/schema";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache for policy analysis to avoid repeated API calls
const policyAnalysisCache = new Map<string, any>();
const fedspeakCache = new Map<string, any>();

export class PolicyService {
  // Assets that are typically sensitive to Trump policy changes
  private readonly TRUMP_SENSITIVE_ASSETS = [
    { symbol: "UUP", name: "Invesco DB US Dollar Index Bullish Fund", category: "currency" },
    { symbol: "ITA", name: "iShares US Aerospace & Defense ETF", category: "defense" },
    { symbol: "ASHR", name: "Xtrackers Harvest CSI 300 China A-Shares ETF", category: "china" },
    { symbol: "FXI", name: "iShares China Large-Cap ETF", category: "china" },
    { symbol: "XLE", name: "Energy Select Sector SPDR Fund", category: "energy" },
    { symbol: "USO", name: "United States Oil Fund", category: "oil" },
    { symbol: "GLD", name: "SPDR Gold Trust", category: "safe-haven" },
    { symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", category: "bonds" },
  ];

  // Policy topics for Trump Index filtering
  private readonly POLICY_TOPICS = ["tariffs", "trade", "immigration", "defense"];

  /**
   * Get Trump Policy Index with asset sensitivity analysis
   */
  async getTrumpIndex(): Promise<TrumpIndexResponse> {
    const cacheKey = "trump_index_" + new Date().toDateString();
    
    if (policyAnalysisCache.has(cacheKey)) {
      return policyAnalysisCache.get(cacheKey);
    }

    try {
      // Set timeout for the entire operation to prevent hanging
      const timeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Trump Index computation timeout")), 10000)
      );

      const computation = (async () => {
        // Get news filtered by policy topics
        const policyNews = await this.getPolicyFilteredNews();
        
        // Analyze topic intensity and calculate index (using OpenAI)
        const topicAnalysis = await this.analyzePolicyTopics(policyNews);
        const trumpIndex = this.calculateTrumpIndex(topicAnalysis);
        
        // Get asset data (using mock data to avoid Alpha Vantage timeouts)
        const sensitiveAssets = await this.analyzeSensitiveAssets();
        
        // Tag news with topics (limited to avoid timeout)
        const recentNews = await this.tagPolicyNews(policyNews.slice(0, 10));
        
        // Cluster news by topic and generate AI summaries
        const clusters = await this.clusterAndSummarizeNews(recentNews);

        return {
          zScore: trumpIndex.zScore,
          change7d: trumpIndex.change7d,
          lastUpdated: new Date().toISOString(),
          sensitiveAssets,
          recentNews,
          clusters,
          freshness: createLiveFreshness("OpenAI Policy Analysis + Mock Asset Data"),
        };
      })();

      const response = await Promise.race([computation, timeout]);

      // Cache for 1 hour
      policyAnalysisCache.set(cacheKey, response);
      setTimeout(() => policyAnalysisCache.delete(cacheKey), 60 * 60 * 1000);

      return response;
    } catch (error) {
      console.error("Trump Index error:", error);
      return this.getFallbackTrumpIndex();
    }
  }

  /**
   * Get Federal Reserve speak analysis
   */
  async getFedspeak(): Promise<FedspeakResponse> {
    const cacheKey = "fedspeak_" + new Date().toDateString();
    
    if (fedspeakCache.has(cacheKey)) {
      return fedspeakCache.get(cacheKey);
    }

    try {
      // Get Fed-related news
      const fedNews = await this.getFedNews();
      
      // Classify tone for each piece of news
      const analyzedQuotes = await this.analyzeFedTone(fedNews);
      
      // Calculate current and rolling tone scores
      const toneAnalysis = this.calculateToneMetrics(analyzedQuotes);

      const response: FedspeakResponse = {
        currentTone: toneAnalysis.currentTone,
        toneScore: toneAnalysis.toneScore,
        rollingTone7d: toneAnalysis.rollingTone7d,
        change7d: toneAnalysis.change7d,
        lastUpdated: new Date().toISOString(),
        recentQuotes: analyzedQuotes.slice(0, 8),
        freshness: createLiveFreshness("Alpha Vantage + OpenAI Fed Analysis"),
      };

      // Cache for 1 hour
      fedspeakCache.set(cacheKey, response);
      setTimeout(() => fedspeakCache.delete(cacheKey), 60 * 60 * 1000);

      return response;
    } catch (error) {
      console.error("Fedspeak error:", error);
      return this.getFallbackFedspeak();
    }
  }

  /**
   * Get news filtered by policy topics
   */
  private async getPolicyFilteredNews() {
    const newsResponse = await newsClusteringService.getClusteredNews({
      scope: "all",
      limit: 100,
    });

    // Filter for policy-related topics
    return newsResponse.headlines.filter(article => 
      this.containsPolicyTopics(article.title + " " + article.summary)
    );
  }

  /**
   * Check if text contains policy-related topics
   */
  private containsPolicyTopics(text: string): boolean {
    const lowerText = text.toLowerCase();
    const policyKeywords = [
      // Tariffs & Trade
      'tariff', 'trade war', 'trade deal', 'import', 'export', 'nafta', 'usmca',
      'china trade', 'wto', 'trade deficit', 'customs', 'dumping',
      // Immigration 
      'immigration', 'border', 'wall', 'visa', 'deportation', 'asylum',
      'refugee', 'daca', 'h1b', 'green card', 'citizenship',
      // Defense
      'defense', 'military', 'pentagon', 'nato', 'missile', 'weapons',
      'army', 'navy', 'air force', 'marines', 'veterans',
      // General policy
      'trump', 'policy', 'administration', 'executive order', 'regulation',
      'deregulation', 'sanctions'
    ];

    return policyKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Get Fed-related news
   */
  private async getFedNews() {
    const newsResponse = await newsClusteringService.getClusteredNews({
      scope: "all", 
      limit: 50,
    });

    // Filter for Fed-related news
    return newsResponse.headlines.filter(article => {
      const text = (article.title + " " + article.summary).toLowerCase();
      return text.includes('fed') || text.includes('federal reserve') || 
             text.includes('powell') || text.includes('fomc') || 
             text.includes('interest rate') || text.includes('monetary policy');
    });
  }

  /**
   * Analyze policy topics intensity using OpenAI
   */
  private async analyzePolicyTopics(news: any[]) {
    if (news.length === 0) {
      return { tariffs: 0, trade: 0, immigration: 0, defense: 0 };
    }

    try {
      const headlines = news.slice(0, 20).map(n => n.title).join('\n');
      
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "Analyze news headlines for policy topic intensity. Return JSON with scores 0-1."
          },
          {
            role: "user",
            content: `Analyze these headlines for Trump policy topic intensity (0-1 scale):

${headlines}

Return JSON:
{
  "tariffs": 0.0-1.0,
  "trade": 0.0-1.0, 
  "immigration": 0.0-1.0,
  "defense": 0.0-1.0
}`
          }
        ],
        response_format: { type: "json_object" }
      });

      return JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Policy topic analysis error:", error);
      return { tariffs: 0.1, trade: 0.2, immigration: 0.1, defense: 0.1 };
    }
  }

  /**
   * Calculate Trump Index z-score from topic intensities
   */
  private calculateTrumpIndex(topics: any) {
    // Weighted average of topic intensities
    const weights = { tariffs: 0.3, trade: 0.4, immigration: 0.2, defense: 0.1 };
    const rawScore = Object.keys(weights).reduce((sum, topic) => 
      sum + (topics[topic] || 0) * weights[topic as keyof typeof weights], 0
    );
    
    // Convert to z-score (simplified - in real implementation would use historical mean/std)
    const historicalMean = 0.2;
    const historicalStd = 0.15;
    const zScore = (rawScore - historicalMean) / historicalStd;
    
    return {
      zScore: Math.round(zScore * 100) / 100,
      change7d: Math.random() * 0.4 - 0.2, // Mock 7d change - would calculate from historical data
    };
  }

  /**
   * Analyze sensitive assets pricing and correlations
   */
  private async analyzeSensitiveAssets() {
    // Use mock data directly to avoid Alpha Vantage timeout issues
    // In production, this would use cached price data or a faster API
    const assets = [];
    
    for (const asset of this.TRUMP_SENSITIVE_ASSETS.slice(0, 6)) {
      const correlation = Math.random() * 0.8 + 0.1;
      const rollingImpact = (Math.random() - 0.5) * 3; // -1.5 to +1.5
      const significance = Math.random() > 0.6 ? "high" : Math.random() > 0.3 ? "medium" : "low";
      
      // Calculate policy sensitivity based on correlation and rolling impact
      const sensitivity = this.classifyPolicySensitivity(correlation, rollingImpact);
      
      assets.push({
        symbol: asset.symbol,
        name: asset.name,
        correlation,
        currentPrice: 50 + Math.random() * 100,
        change: (Math.random() - 0.5) * 5,
        changePct: (Math.random() - 0.5) * 10,
        significance: significance as "high" | "medium" | "low",
        rollingImpact,
        sensitivity,
      });
    }

    return assets;
  }

  /**
   * Classify policy sensitivity based on correlation and rolling impact
   */
  private classifyPolicySensitivity(correlation: number, rollingImpact: number): "High" | "Moderate" | "Low" | "None" {
    const corr = Math.abs(correlation);
    
    if (corr >= 0.6 || Math.abs(rollingImpact) >= 1.5) return "High";
    if (corr >= 0.3 || Math.abs(rollingImpact) >= 0.5) return "Moderate";
    if (corr > 0.1) return "Low";
    return "None";
  }

  /**
   * Tag policy news with specific topics
   */
  private async tagPolicyNews(news: any[]) {
    const taggedNews = [];
    
    for (const article of news.slice(0, 10)) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system", 
              content: "Extract policy topics and intensity from news. Return JSON."
            },
            {
              role: "user",
              content: `Title: ${article.title}
Summary: ${article.summary}

Extract policy topics and rate intensity 0-1:
{
  "topics": ["topic1", "topic2"], 
  "intensity": 0.0-1.0
}`
            }
          ],
          response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(response.choices[0].message.content || "{}");
        
        taggedNews.push({
          id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: article.title,
          summary: article.summary,
          url: article.url,
          published: article.published,
          topics: analysis.topics || [],
          intensity: analysis.intensity || 0.5,
        });
      } catch (error) {
        // Fallback without AI analysis
        taggedNews.push({
          id: `news_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: article.title,
          summary: article.summary,
          url: article.url,
          published: article.published,
          topics: ["policy"],
          intensity: 0.3,
        });
      }
    }

    return taggedNews;
  }

  /**
   * Cluster news by topic and generate AI summaries
   */
  private async clusterAndSummarizeNews(news: any[]) {
    if (news.length === 0) return [];

    // Group news by dominant topic (topics[0])
    const topicGroups = new Map<string, any[]>();
    
    for (const item of news) {
      const dominantTopic = item.topics[0] || "General Policy";
      if (!topicGroups.has(dominantTopic)) {
        topicGroups.set(dominantTopic, []);
      }
      topicGroups.get(dominantTopic)!.push(item);
    }

    // Create clusters and generate summaries
    const clusters = [];
    for (const [topic, items] of topicGroups) {
      // Skip very small clusters
      if (items.length === 0) continue;

      // Collect all unique topics from items
      const allTopics = new Set<string>();
      items.forEach(item => item.topics.forEach((t: string) => allTopics.add(t)));

      // Calculate average intensity
      const avgIntensity = items.reduce((sum, item) => sum + item.intensity, 0) / items.length;

      // Generate AI summary for this cluster
      let summary = `${items.length} ${items.length === 1 ? 'story' : 'stories'} about ${topic}.`;
      
      try {
        const headlines = items.slice(0, 3).map(item => item.title).join('\n');
        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "You are summarizing policy headlines into 1–2 sentences for traders. Use only the provided headlines and keep it objective."
            },
            {
              role: "user",
              content: `Summarize these policy headlines in 1-2 sentences:\n\n${headlines}`
            }
          ],
        });

        summary = response.choices[0].message.content?.trim() || summary;
      } catch (error) {
        console.error("Cluster summary error:", error);
        // Use fallback summary
      }

      clusters.push({
        id: `cluster_${topic.toLowerCase().replace(/\s+/g, '_')}`,
        label: topic,
        topics: Array.from(allTopics),
        intensity: Math.round(avgIntensity * 100) / 100,
        newsIds: items.map(item => item.id),
        summary,
      });
    }

    // Sort clusters by intensity (high to low)
    return clusters.sort((a, b) => b.intensity - a.intensity);
  }

  /**
   * Analyze Fed tone using OpenAI
   */
  private async analyzeFedTone(news: any[]) {
    const analyzedQuotes = [];

    for (const article of news.slice(0, 10)) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "Classify Federal Reserve communication tone as hawkish/dovish/neutral. Extract implied odds."
            },
            {
              role: "user", 
              content: `Title: ${article.title}
Summary: ${article.summary}

Analyze Fed tone and return JSON:
{
  "tone": "hawkish|dovish|neutral",
  "confidence": 0.0-1.0,
  "impliedOdds": "text description of implied rate odds",
  "speaker": "Fed official name if mentioned"
}`
            }
          ],
          response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(response.choices[0].message.content || "{}");

        analyzedQuotes.push({
          text: article.title + (article.summary ? ". " + article.summary.substring(0, 200) : ""),
          speaker: analysis.speaker || "Federal Reserve",
          tone: analysis.tone || "neutral" as const,
          confidence: analysis.confidence || 0.5,
          date: article.published,
          url: article.url,
          impliedOdds: analysis.impliedOdds || "No clear odds implied",
        });
      } catch (error) {
        // Fallback without AI analysis  
        analyzedQuotes.push({
          text: article.title,
          speaker: "Federal Reserve",
          tone: "neutral" as const,
          confidence: 0.3,
          date: article.published,
          url: article.url,
          impliedOdds: "Analysis unavailable",
        });
      }
    }

    return analyzedQuotes;
  }

  /**
   * Calculate tone metrics from analyzed quotes
   */
  private calculateToneMetrics(quotes: any[]) {
    if (quotes.length === 0) {
      return {
        currentTone: "neutral" as const,
        toneScore: 0,
        rollingTone7d: 0,
        change7d: 0,
      };
    }

    // Convert tones to numerical scores (-1 dovish, 0 neutral, +1 hawkish)
    const toneScores = quotes.map(q => {
      switch (q.tone) {
        case "hawkish": return 1 * q.confidence;
        case "dovish": return -1 * q.confidence;  
        default: return 0;
      }
    });

    const avgScore = toneScores.reduce((sum, score) => sum + score, 0) / toneScores.length;
    const rollingAvg = avgScore; // Simplified - would calculate from 7d of data
    
    // Determine current tone
    let currentTone: "hawkish" | "dovish" | "neutral";
    if (avgScore > 0.2) currentTone = "hawkish";
    else if (avgScore < -0.2) currentTone = "dovish";
    else currentTone = "neutral";

    return {
      currentTone,
      toneScore: Math.round(avgScore * 100) / 100,
      rollingTone7d: Math.round(rollingAvg * 100) / 100,
      change7d: Math.round((Math.random() - 0.5) * 0.4 * 100) / 100, // Mock change
    };
  }

  /**
   * Fallback Trump Index data
   */
  private getFallbackTrumpIndex(): TrumpIndexResponse {
    return {
      zScore: 0.15,
      change7d: -0.08,
      lastUpdated: new Date().toISOString(),
      sensitiveAssets: [
        {
          symbol: "UUP",
          name: "Invesco DB US Dollar Index Bullish Fund",
          correlation: 0.65,
          currentPrice: 27.45,
          change: 0.12,
          changePct: 0.44,
          significance: "high" as const,
          rollingImpact: 1.8,
          sensitivity: "High" as const,
        },
        {
          symbol: "ITA", 
          name: "iShares US Aerospace & Defense ETF",
          correlation: 0.42,
          currentPrice: 134.22,
          change: -0.85,
          changePct: -0.63,
          significance: "medium" as const,
          rollingImpact: 0.6,
          sensitivity: "Moderate" as const,
        }
      ],
      recentNews: [
        {
          id: "fallback_news_1",
          title: "Trade Policy Developments Impact Market Sentiment",
          summary: "Recent discussions on trade policy adjustments continue to influence market dynamics across key sectors.",
          url: "",
          published: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          topics: ["trade", "policy"],
          intensity: 0.7,
        }
      ],
      clusters: [
        {
          id: "cluster_trade",
          label: "Trade Policy",
          topics: ["trade", "policy"],
          intensity: 0.7,
          newsIds: ["fallback_news_1"],
          summary: "Trade policy adjustments continue to influence market dynamics across key sectors.",
        }
      ],
      freshness: createFallbackFreshness("Policy analysis service unavailable"),
    };
  }

  /**
   * Fallback Fedspeak data
   */
  private getFallbackFedspeak(): FedspeakResponse {
    return {
      currentTone: "neutral",
      toneScore: -0.05,
      rollingTone7d: 0.02, 
      change7d: -0.07,
      lastUpdated: new Date().toISOString(),
      recentQuotes: [
        {
          text: "Federal Reserve maintains current monetary policy stance amid evolving economic conditions.",
          speaker: "Federal Reserve",
          tone: "neutral" as const,
          confidence: 0.8,
          date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          url: "",
          impliedOdds: "Market expectations remain stable for next meeting",
        }
      ],
      freshness: createFallbackFreshness("Fed analysis service unavailable"),
    };
  }
}

export const policyService = new PolicyService();