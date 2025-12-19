import { 
  Price, 
  WatchlistItem,
  InsertPrice,
  InsertWatchlistItem,
  AssetSearchResult,
  AssetSheetData,
  Headline,
  UpcomingEarning,
  EconomicEvent,
  EnhancedMarketSentiment,
  SentimentNarrative,
  AssetOverview,
  AssetOverviewSummary,
  MarketRecap,
  MarketRecapSummary,
  HeadlineImpactAnalysis,
  EnhancedSentimentIndex,
  Alert,
  InsertAlert,
  FocusAsset,
  InsertFocusAsset,
  prices,
  watchlist
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Price methods
  upsertPrice(price: InsertPrice): Promise<Price>;
  getLatestPrice(symbol: string, assetType: string): Promise<Price | undefined>;
  getPriceHistory(symbol: string, assetType: string, days: number): Promise<Price[]>;
  
  // Headlines
  getHeadlines(limit?: number): Promise<Headline[]>;
  createHeadline(headline: Omit<Headline, 'id' | 'createdAt'>): Promise<Headline>;
  updateHeadline(id: string, updates: Partial<Headline>): Promise<Headline | null>;
  
  // Earnings
  getUpcomingEarnings(limit?: number): Promise<UpcomingEarning[]>;
  
  // Economic Events
  getEconomicEvents(days?: number): Promise<EconomicEvent[]>;
  
  // Watchlist methods
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  getWatchlist(): Promise<WatchlistItem[]>;
  removeFromWatchlist(id: string): Promise<void>;
  
  // Search methods
  searchAssets(query: string, types?: string[], limit?: number): Promise<AssetSearchResult[]>;
  getAssetSheetData(symbol: string, assetType: string): Promise<AssetSheetData | null>;
  
  // Phase 3 - Enhanced Sentiment
  getEnhancedSentiment(): Promise<EnhancedMarketSentiment>;
  getSentimentNarrative(sentimentData: EnhancedMarketSentiment, contextNote?: string): Promise<SentimentNarrative>;
  
  // Phase 3 - Asset Overview
  getAssetOverview(symbol: string, assetType: string, frames: string[]): Promise<AssetOverview>;
  getAssetOverviewSummary(overview: AssetOverview): Promise<AssetOverviewSummary>;
  
  // Phase 3 - Market Recap  
  getMarketRecap(): Promise<MarketRecap>;
  getMarketRecapSummary(recap: MarketRecap): Promise<MarketRecapSummary>;
  
  // Phase 3 - Enhanced Headlines
  getHeadlinesTimeline(symbols?: string[], limit?: number): Promise<Headline[]>;
  analyzeHeadlineImpact(title: string, summary?: string, symbols?: string[]): Promise<HeadlineImpactAnalysis>;
  
  // Phase 4 - Enhanced Sentiment Index
  getEnhancedSentimentIndex(): Promise<EnhancedSentimentIndex>;
  
  // Alert methods
  createAlert(alert: InsertAlert): Promise<Alert>;
  getAlerts(portfolioId?: string): Promise<Alert[]>;
  getAlert(id: string): Promise<Alert | null>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | null>;
  deleteAlert(id: string): Promise<void>;
  getEnabledAlerts(): Promise<Alert[]>;
  
  // Focus Assets (Trader Lens)
  getFocusAssets(profileId?: string): Promise<FocusAsset[]>;
  addFocusAsset(asset: InsertFocusAsset, profileId?: string): Promise<FocusAsset>;
  removeFocusAsset(symbol: string, profileId?: string): Promise<void>;
  
  // Initialize sample data
  initializeSampleData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  async upsertPrice(price: InsertPrice): Promise<Price> {
    const existing = await db
      .select()
      .from(prices)
      .where(
        and(
          eq(prices.symbol, price.symbol),
          eq(prices.assetType, price.assetType),
          eq(prices.date, price.date)
        )
      );

    if (existing.length > 0) {
      const [result] = await db
        .update(prices)
        .set({
          close: price.close,
          source: price.source,
        })
        .where(eq(prices.id, existing[0].id))
        .returning();
      return result;
    } else {
      const [result] = await db
        .insert(prices)
        .values(price)
        .returning();
      return result;
    }
  }

  async getLatestPrice(symbol: string, assetType: string): Promise<Price | undefined> {
    const [result] = await db
      .select()
      .from(prices)
      .where(
        and(
          eq(prices.symbol, symbol),
          eq(prices.assetType, assetType)
        )
      )
      .orderBy(desc(prices.date))
      .limit(1);
    return result;
  }

  async getPriceHistory(symbol: string, assetType: string, days: number): Promise<Price[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return db
      .select()
      .from(prices)
      .where(
        and(
          eq(prices.symbol, symbol),
          eq(prices.assetType, assetType),
          sql`${prices.date} >= ${cutoffDate.toISOString()}`
        )
      )
      .orderBy(desc(prices.date));
  }

  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const [result] = await db
      .insert(watchlist)
      .values(item)
      .returning();
    return result;
  }

  async getWatchlist(): Promise<WatchlistItem[]> {
    return db
      .select()
      .from(watchlist)
      .orderBy(desc(watchlist.createdAt));
  }

  async removeFromWatchlist(id: string): Promise<void> {
    await db.delete(watchlist).where(eq(watchlist.id, id));
  }

  async searchAssets(query: string, types?: string[], limit = 20): Promise<AssetSearchResult[]> {
    // Mock implementation - in real app would search external APIs
    const mockResults: AssetSearchResult[] = [
      // Tech Stocks
      { id: "1", symbol: "AAPL", name: "Apple Inc.", assetType: "equity", exchange: "NASDAQ" },
      { id: "2", symbol: "GOOGL", name: "Alphabet Inc.", assetType: "equity", exchange: "NASDAQ" },
      { id: "3", symbol: "MSFT", name: "Microsoft Corporation", assetType: "equity", exchange: "NASDAQ" },
      { id: "7", symbol: "TSLA", name: "Tesla Inc.", assetType: "equity", exchange: "NASDAQ" },
      { id: "8", symbol: "AMZN", name: "Amazon.com Inc.", assetType: "equity", exchange: "NASDAQ" },
      { id: "9", symbol: "META", name: "Meta Platforms Inc.", assetType: "equity", exchange: "NASDAQ" },
      { id: "10", symbol: "NFLX", name: "Netflix Inc.", assetType: "equity", exchange: "NASDAQ" },
      { id: "11", symbol: "NVDA", name: "NVIDIA Corporation", assetType: "equity", exchange: "NASDAQ" },
      
      // Blue Chip Stocks
      { id: "12", symbol: "JPM", name: "JPMorgan Chase & Co.", assetType: "equity", exchange: "NYSE" },
      { id: "13", symbol: "V", name: "Visa Inc.", assetType: "equity", exchange: "NYSE" },
      { id: "14", symbol: "JNJ", name: "Johnson & Johnson", assetType: "equity", exchange: "NYSE" },
      { id: "15", symbol: "WMT", name: "Walmart Inc.", assetType: "equity", exchange: "NYSE" },
      { id: "16", symbol: "PG", name: "Procter & Gamble Co.", assetType: "equity", exchange: "NYSE" },
      { id: "17", symbol: "HD", name: "The Home Depot Inc.", assetType: "equity", exchange: "NYSE" },
      { id: "18", symbol: "BAC", name: "Bank of America Corp.", assetType: "equity", exchange: "NYSE" },
      { id: "19", symbol: "DIS", name: "The Walt Disney Company", assetType: "equity", exchange: "NYSE" },
      
      // ETFs
      { id: "4", symbol: "SPY", name: "SPDR S&P 500 ETF Trust", assetType: "etf", exchange: "NYSE" },
      { id: "20", symbol: "QQQ", name: "Invesco QQQ Trust", assetType: "etf", exchange: "NASDAQ" },
      { id: "21", symbol: "IWM", name: "iShares Russell 2000 ETF", assetType: "etf", exchange: "NYSE" },
      { id: "22", symbol: "VTI", name: "Vanguard Total Stock Market ETF", assetType: "etf", exchange: "NYSE" },
      { id: "23", symbol: "VOO", name: "Vanguard S&P 500 ETF", assetType: "etf", exchange: "NYSE" },
      { id: "24", symbol: "VEA", name: "Vanguard FTSE Developed Markets ETF", assetType: "etf", exchange: "NYSE" },
      { id: "25", symbol: "VWO", name: "Vanguard FTSE Emerging Markets ETF", assetType: "etf", exchange: "NYSE" },
      { id: "26", symbol: "TLT", name: "iShares 20+ Year Treasury Bond ETF", assetType: "etf", exchange: "NASDAQ" },
      
      // Cryptocurrencies
      { id: "5", symbol: "BTC", name: "Bitcoin", assetType: "crypto", coingeckoId: "bitcoin" },
      { id: "6", symbol: "ETH", name: "Ethereum", assetType: "crypto", coingeckoId: "ethereum" },
      { id: "27", symbol: "ADA", name: "Cardano", assetType: "crypto", coingeckoId: "cardano" },
      { id: "28", symbol: "SOL", name: "Solana", assetType: "crypto", coingeckoId: "solana" },
      { id: "29", symbol: "DOT", name: "Polkadot", assetType: "crypto", coingeckoId: "polkadot" },
      { id: "30", symbol: "AVAX", name: "Avalanche", assetType: "crypto", coingeckoId: "avalanche-2" },
      { id: "31", symbol: "MATIC", name: "Polygon", assetType: "crypto", coingeckoId: "matic-network" },
      { id: "32", symbol: "LINK", name: "Chainlink", assetType: "crypto", coingeckoId: "chainlink" },
      { id: "33", symbol: "UNI", name: "Uniswap", assetType: "crypto", coingeckoId: "uniswap" },
      { id: "34", symbol: "LTC", name: "Litecoin", assetType: "crypto", coingeckoId: "litecoin" },
    ];

    return mockResults.filter(asset => 
      asset.symbol.toLowerCase().includes(query.toLowerCase()) ||
      asset.name.toLowerCase().includes(query.toLowerCase())
    ).slice(0, limit);
  }

  async getAssetSheetData(symbol: string, assetType: string): Promise<AssetSheetData | null> {
    // Mock implementation - in real app would fetch from external APIs
    return {
      symbol,
      name: `${symbol} Company`,
      assetType,
      price: 150.00,
      change24h: 2.50,
      changePercent24h: 1.69,
      marketCap: 2500000000,
      miniChart: Array.from({ length: 24 }, (_, i) => ({
        ts: Date.now() - (23 - i) * 60 * 60 * 1000,
        close: 150 + (Math.random() - 0.5) * 10
      })),
      asOf: new Date().toISOString()
    };
  }

  async getHeadlines(limit = 50): Promise<Headline[]> {
    // Mock implementation with diverse headlines
    const mockHeadlines = [
      {
        id: "h1",
        published: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
        title: "Tech Giants Report Strong Q4 Earnings, Apple Beats Expectations",
        source: "Market Watch",
        url: "https://example.com/news/1",
        symbols: ["AAPL", "GOOGL", "MSFT"],
        summary: "Major technology companies continue to demonstrate resilience with strong quarterly results, led by Apple's exceptional performance...",
        analyzed: true,
        sentimentScore: 0.4,
        sentimentLabel: "Positive",
        impactJson: JSON.stringify({
          whyThisMatters: ["Tech sector strength", "Market confidence"],
          impacts: [
            { symbol: "AAPL", direction: "up", confidence: 0.8 },
            { symbol: "GOOGL", direction: "up", confidence: 0.7 }
          ]
        }),
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString()
      },
      {
        id: "h2",
        published: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
        title: "Federal Reserve Signals Potential Rate Changes Amid Economic Uncertainty",
        source: "Reuters",
        url: "https://example.com/news/2",
        symbols: ["SPY", "QQQ", "IWM"],
        summary: "The Federal Reserve indicates possible monetary policy adjustments as economic indicators show mixed signals...",
        analyzed: true,
        sentimentScore: -0.2,
        sentimentLabel: "Slightly Negative",
        impactJson: JSON.stringify({
          whyThisMatters: ["Monetary policy impact", "Market volatility"],
          impacts: [
            { symbol: "SPY", direction: "down", confidence: 0.6 },
            { symbol: "QQQ", direction: "down", confidence: 0.5 }
          ]
        }),
        createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString()
      },
      {
        id: "h3",
        published: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
        title: "Breaking: Tesla Announces Major Manufacturing Expansion",
        source: "Bloomberg",
        url: "https://example.com/news/3",
        symbols: ["TSLA"],
        summary: "Tesla reveals plans for significant expansion of manufacturing capabilities, targeting increased production volumes...",
        analyzed: true,
        sentimentScore: 0.6,
        sentimentLabel: "Positive",
        impactJson: JSON.stringify({
          whyThisMatters: ["Production capacity", "Growth prospects"],
          impacts: [
            { symbol: "TSLA", direction: "up", confidence: 0.9 }
          ]
        }),
        createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
      },
      {
        id: "h4",
        published: new Date(Date.now() - 1000 * 60 * 240).toISOString(), // 4 hours ago
        title: "Energy Sector Outlook: Oil Prices Stabilize as Demand Projections Improve",
        source: "Financial Times",
        url: "https://example.com/news/4",
        symbols: ["XLE", "CVX", "XOM"],
        summary: "Energy markets show signs of stability with improved demand forecasts supporting commodity prices...",
        analyzed: true,
        sentimentScore: 0.1,
        sentimentLabel: "Neutral",
        impactJson: JSON.stringify({
          whyThisMatters: ["Energy sector trends", "Commodity outlook"],
          impacts: [
            { symbol: "XLE", direction: "up", confidence: 0.4 },
            { symbol: "CVX", direction: "neutral", confidence: 0.3 }
          ]
        }),
        createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString()
      },
      {
        id: "h5",
        published: new Date(Date.now() - 1000 * 60 * 360).toISOString(), // 6 hours ago
        title: "Cryptocurrency Market Update: Bitcoin Holds Support Levels",
        source: "CoinDesk",
        url: "https://example.com/news/5",
        symbols: ["BTC-USD", "ETH-USD"],
        summary: "Digital assets maintain key support levels as institutional interest continues to drive market dynamics...",
        analyzed: true,
        sentimentScore: 0.05,
        sentimentLabel: "Neutral",
        impactJson: JSON.stringify({
          whyThisMatters: ["Crypto adoption", "Institutional investment"],
          impacts: [
            { symbol: "BTC-USD", direction: "neutral", confidence: 0.5 },
            { symbol: "ETH-USD", direction: "neutral", confidence: 0.4 }
          ]
        }),
        createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString()
      }
    ];
    
    return mockHeadlines.slice(0, limit);
  }

  async createHeadline(headline: Omit<Headline, 'id' | 'createdAt'>): Promise<Headline> {
    return {
      ...headline,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
  }

  async updateHeadline(id: string, updates: Partial<Headline>): Promise<Headline | null> {
    // Mock implementation - would update in database
    return null;
  }

  async getUpcomingEarnings(limit = 20): Promise<UpcomingEarning[]> {
    // Mock implementation
    return [
      { symbol: "AAPL", date: "2025-01-25", eps_est: 2.10, sector: "Technology" },
      { symbol: "GOOGL", date: "2025-01-26", eps_est: 1.85, sector: "Technology" },
      { symbol: "MSFT", date: "2025-01-27", eps_est: 3.20, sector: "Technology" },
    ];
  }

  async getEconomicEvents(days = 7): Promise<EconomicEvent[]> {
    // Mock implementation
    return [];
  }

  // Phase 3 - Enhanced Sentiment (placeholder implementations)
  async getEnhancedSentiment(): Promise<EnhancedMarketSentiment> {
    // This would integrate with the existing sentiment logic but enhanced
    return {
      score: 65,
      regime: "Neutral",
      drivers: [
        {
          label: "SPY Performance",
          value: 0.5,
          contribution: 15,
          note: "SPY up 0.5% today → moderate bullish signal"
        },
        {
          label: "VIX Level",
          value: 18.5,
          contribution: 10,
          note: "VIX at 18.5 indicates low fear → bullish"
        }
      ],
      as_of: new Date().toISOString()
    };
  }

  async getSentimentNarrative(sentimentData: EnhancedMarketSentiment, contextNote?: string): Promise<SentimentNarrative> {
    return {
      summary: "Mixed market signals with moderate risk appetite amid steady volatility conditions.",
      bullets: [
        "Equity markets showing resilience with SPY maintaining upward momentum",
        "Low volatility environment supporting risk-taking behavior",
        "Treasury yields stabilizing after recent pressure"
      ],
      as_of: new Date().toISOString()
    };
  }

  // Phase 3 - Asset Overview (placeholder implementations)
  async getAssetOverview(symbol: string, assetType: string, frames: string[]): Promise<AssetOverview> {
    const frameData: Record<string, any> = {};
    
    for (const frame of frames) {
      const changePct = (Math.random() - 0.5) * 10; // Random change for demo
      frameData[frame] = {
        changePct,
        stance: changePct > 1 ? "Bullish" : changePct < -1 ? "Bearish" : "Neutral",
        confidence: Math.round((0.5 + Math.random() * 0.4) * 100), // 50-90% confidence
        notes: [`${frame} trend analysis`, "Technical indicators mixed", "Volume above average"]
      };
    }

    // Generate realistic company names based on symbol
    const getCompanyName = (sym: string, type: string) => {
      const commonStocks: Record<string, string> = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corporation',
        'GOOGL': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'TSLA': 'Tesla Inc.',
        'NVDA': 'NVIDIA Corporation',
        'META': 'Meta Platforms Inc.',
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'SPY': 'SPDR S&P 500 ETF Trust'
      };
      
      if (commonStocks[sym]) {
        return commonStocks[sym];
      }
      
      if (type === 'crypto') {
        return `${sym} Cryptocurrency`;
      } else if (type === 'etf') {
        return `${sym} Exchange Traded Fund`;
      } else {
        return `${sym} Corporation`;
      }
    };

    return {
      symbol,
      name: getCompanyName(symbol, assetType),
      assetType,
      price: 50 + Math.random() * 200, // Random price between $50-250
      change24h: (Math.random() - 0.5) * 10, // Random change
      frames: frameData,
      as_of: new Date().toISOString()
    };
  }

  async getAssetOverviewSummary(overview: AssetOverview): Promise<AssetOverviewSummary> {
    return {
      headline: `${overview.symbol} showing mixed technicals across timeframes`,
      bullets: [
        "Short-term momentum remains positive with MA support",
        "Mid-term consolidation phase suggests range-bound action",
        "Long-term trend intact despite recent volatility"
      ],
      as_of: new Date().toISOString()
    };
  }

  // Phase 3 - Market Recap (placeholder implementations)
  async getMarketRecap(): Promise<MarketRecap> {
    return {
      indices: [
        { symbol: "SPY", name: "S&P 500", pct: 0.5 },
        { symbol: "QQQ", name: "Nasdaq 100", pct: -0.3 },
        { symbol: "IWM", name: "Russell 2000", pct: 0.8 },
        { symbol: "DIA", name: "Dow Jones", pct: 0.2 }
      ],
      sectors: [
        { symbol: "XLK", name: "Technology", pct: -0.5 },
        { symbol: "XLF", name: "Financials", pct: 1.2 },
        { symbol: "XLE", name: "Energy", pct: 2.1 },
        { symbol: "XLV", name: "Healthcare", pct: -0.1 }
      ],
      movers: {
        gainers: [
          { symbol: "NVDA", name: "NVIDIA Corp", pct: 5.2 },
          { symbol: "TSLA", name: "Tesla Inc", pct: 3.8 }
        ],
        losers: [
          { symbol: "AAPL", name: "Apple Inc", pct: -2.1 },
          { symbol: "MSFT", name: "Microsoft Corp", pct: -1.5 }
        ]
      },
      as_of: new Date().toISOString()
    };
  }

  async getMarketRecapSummary(recap: MarketRecap): Promise<MarketRecapSummary> {
    return {
      bullets: [
        "Mixed performance with small-caps outperforming large-caps",
        "Energy leading sectors on oil price strength",
        "Tech showing weakness amid rate concerns"
      ],
      watchTomorrow: "Fed speakers and key economic data could drive direction",
      as_of: new Date().toISOString()
    };
  }

  // Phase 3 - Enhanced Headlines (placeholder implementations)
  async getHeadlinesTimeline(symbols?: string[], limit = 100): Promise<Headline[]> {
    // Get all mock headlines first
    const allHeadlines = await this.getHeadlines(limit * 2); // Get more to filter from
    
    if (!symbols || symbols.length === 0) {
      // No symbols filter, return all headlines
      return allHeadlines.slice(0, limit);
    }
    
    // Filter headlines that mention any of the specified symbols
    const filteredHeadlines = allHeadlines.filter(headline => 
      headline.symbols.some(symbol => symbols.includes(symbol))
    );
    
    return filteredHeadlines.slice(0, limit);
  }

  async analyzeHeadlineImpact(title: string, summary?: string, symbols: string[] = []): Promise<HeadlineImpactAnalysis> {
    return {
      whyThisMatters: [
        "Market sentiment shift from regulatory uncertainty",
        "Potential sector rotation based on policy changes"
      ],
      impacts: symbols.map(symbol => ({
        symbol,
        direction: Math.random() > 0.5 ? "up" : "down",
        confidence: 0.6 + Math.random() * 0.3
      })),
      as_of: new Date().toISOString()
    };
  }

  // Phase 4 - Enhanced Sentiment Index
  async getEnhancedSentimentIndex(): Promise<EnhancedSentimentIndex> {
    // Mock implementation with subscores and deltas
    const baseScore = 45 + Math.random() * 10; // 45-55 range
    
    return {
      score: Math.round(baseScore),
      regime: baseScore < 40 ? "Risk-Off" : baseScore > 60 ? "Risk-On" : "Neutral",
      as_of: new Date().toISOString(),
      subscores: {
        riskAppetite: Math.round(baseScore + (Math.random() - 0.5) * 20),
        credit: Math.round(baseScore + (Math.random() - 0.5) * 15),
        volatilityInv: Math.round((100 - baseScore) + (Math.random() - 0.5) * 10), // Inverted VIX
        breadth: Math.round(baseScore + (Math.random() - 0.5) * 25),
      },
      delta: {
        vsYesterday: (Math.random() - 0.5) * 10, // -5 to +5 points
        vsLastWeek: (Math.random() - 0.5) * 20, // -10 to +10 points
      },
    };
  }

  // Alert methods (in-memory storage)
  private alerts: Alert[] = [];

  async createAlert(alert: InsertAlert): Promise<Alert> {
    const newAlert: Alert = {
      ...alert,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTriggered: null,
    };
    this.alerts.push(newAlert);
    return newAlert;
  }

  async getAlerts(portfolioId?: string): Promise<Alert[]> {
    if (portfolioId) {
      return this.alerts.filter(a => a.portfolioId === portfolioId);
    }
    return [...this.alerts];
  }

  async getAlert(id: string): Promise<Alert | null> {
    return this.alerts.find(a => a.id === id) || null;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | null> {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index === -1) return null;

    this.alerts[index] = {
      ...this.alerts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return this.alerts[index];
  }

  async deleteAlert(id: string): Promise<void> {
    const index = this.alerts.findIndex(a => a.id === id);
    if (index !== -1) {
      this.alerts.splice(index, 1);
    }
  }

  async getEnabledAlerts(): Promise<Alert[]> {
    return this.alerts.filter(a => a.enabled);
  }

  // Focus Assets (Trader Lens) - in-memory storage
  private focusAssets: FocusAsset[] = [];
  private static readonly MAX_FOCUS_ASSETS = 5;

  async getFocusAssets(profileId: string = "default"): Promise<FocusAsset[]> {
    return this.focusAssets
      .filter(a => a.profileId === profileId)
      .sort((a, b) => a.order - b.order);
  }

  async addFocusAsset(asset: InsertFocusAsset, profileId: string = "default"): Promise<FocusAsset> {
    const existing = this.focusAssets.filter(a => a.profileId === profileId);
    
    if (existing.length >= DatabaseStorage.MAX_FOCUS_ASSETS) {
      throw new Error(`Maximum of ${DatabaseStorage.MAX_FOCUS_ASSETS} focus assets allowed`);
    }
    
    if (existing.some(a => a.symbol.toLowerCase() === asset.symbol.toLowerCase())) {
      throw new Error(`Asset ${asset.symbol} is already in your focus list`);
    }
    
    const newAsset: FocusAsset = {
      id: randomUUID(),
      profileId,
      symbol: asset.symbol.toUpperCase(),
      assetType: asset.assetType,
      displayName: asset.displayName || null,
      order: asset.order ?? existing.length,
      createdAt: new Date(),
    };
    
    this.focusAssets.push(newAsset);
    return newAsset;
  }

  async removeFocusAsset(symbol: string, profileId: string = "default"): Promise<void> {
    const index = this.focusAssets.findIndex(
      a => a.profileId === profileId && a.symbol.toLowerCase() === symbol.toLowerCase()
    );
    if (index !== -1) {
      this.focusAssets.splice(index, 1);
    }
  }

  async initializeSampleData(): Promise<void> {
    // Initialize sample prices for market research platform
    const samplePrices = [
      { symbol: "AAPL", assetType: "equity", date: new Date(), close: "175.50", source: "yahoo" },
      { symbol: "GOOGL", assetType: "equity", date: new Date(), close: "155.25", source: "yahoo" },
      { symbol: "SPY", assetType: "etf", date: new Date(), close: "445.75", source: "yahoo" },
      { symbol: "BTC", assetType: "crypto", date: new Date(), close: "42000.00", source: "coingecko" },
      { symbol: "ETH", assetType: "crypto", date: new Date(), close: "2800.00", source: "coingecko" },
    ];

    for (const price of samplePrices) {
      await this.upsertPrice(price);
    }
  }
}

export const storage = new DatabaseStorage();