import { 
  Portfolio, 
  Position, 
  Price, 
  Transaction,
  WatchlistItem,
  HiddenAsset,
  FocusAsset,
  InsertPortfolio, 
  InsertPosition, 
  InsertPrice,
  InsertTransaction,
  InsertWatchlistItem,
  InsertHiddenAsset,
  InsertFocusAsset,
  PositionWithPrice,
  PortfolioSummary,
  ComputedPosition,
  AssetSearchResult,
  AssetSheetData,
  Headline,
  UpcomingEarning,
  EconomicEvent,
  FocusAssetWithDetails,
  EnhancedMarketSentiment,
  SentimentNarrative,
  AssetOverview,
  AssetOverviewSummary,
  MarketRecap,
  MarketRecapSummary,
  HeadlineImpactAnalysis,
  portfolios,
  positions,
  prices,
  transactions,
  watchlist,
  hiddenAssets,
  focusAssets
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Portfolio methods
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getPortfolios(): Promise<Portfolio[]>;
  archivePortfolio(id: string): Promise<void>;
  deletePortfolio(id: string): Promise<void>;
  
  // Position methods
  createPosition(position: InsertPosition): Promise<Position>;
  getPositionsByPortfolio(portfolioId: string): Promise<Position[]>;
  upsertPosition(position: InsertPosition): Promise<Position>;
  deletePosition(id: string): Promise<void>;
  
  // Price methods
  upsertPrice(price: InsertPrice): Promise<Price>;
  getLatestPrice(symbol: string, assetType: string): Promise<Price | undefined>;
  getPriceHistory(symbol: string, assetType: string, days: number): Promise<Price[]>;
  
  // Portfolio analytics
  getPortfolioPositionsWithPrices(portfolioId: string): Promise<PositionWithPrice[]>;
  getPortfolioSummary(portfolioId: string): Promise<PortfolioSummary>;
  
  // Headlines
  getHeadlines(limit?: number): Promise<Headline[]>;
  createHeadline(headline: Omit<Headline, 'id' | 'createdAt'>): Promise<Headline>;
  updateHeadline(id: string, updates: Partial<Headline>): Promise<Headline | null>;
  
  // Earnings
  getUpcomingEarnings(limit?: number): Promise<UpcomingEarning[]>;
  
  // Economic Events
  getEconomicEvents(days?: number): Promise<EconomicEvent[]>;
  
  // Transaction methods
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByPortfolio(portfolioId: string, symbol?: string): Promise<Transaction[]>;
  updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | null>;
  deleteTransaction(id: string): Promise<void>;
  
  // Computed positions (derived from transactions)
  getComputedPositions(portfolioId: string): Promise<ComputedPosition[]>;
  getComputedPosition(portfolioId: string, symbol: string): Promise<ComputedPosition | null>;
  
  // Watchlist methods
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  getWatchlist(): Promise<WatchlistItem[]>;
  removeFromWatchlist(id: string): Promise<void>;
  
  // Search methods
  searchAssets(query: string, types?: string[], limit?: number): Promise<AssetSearchResult[]>;
  getAssetSheetData(symbol: string, assetType: string): Promise<AssetSheetData | null>;
  
  // Focus Assets methods
  getFocusAssets(portfolioId: string): Promise<FocusAssetWithDetails[]>;
  createFocusAsset(focusAsset: InsertFocusAsset): Promise<FocusAsset>;
  deleteFocusAsset(id: string): Promise<void>;
  reorderFocusAssets(items: { id: string; order: number }[]): Promise<void>;
  
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
  
  // Initialize sample data
  initializeSampleData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  async createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio> {
    const [result] = await db
      .insert(portfolios)
      .values(portfolio)
      .returning();
    return result;
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    const [result] = await db
      .select()
      .from(portfolios)
      .where(eq(portfolios.id, id));
    return result;
  }

  async getPortfolios(): Promise<Portfolio[]> {
    return db
      .select()
      .from(portfolios)
      .where(eq(portfolios.archived, "false"))
      .orderBy(desc(portfolios.createdAt));
  }

  async createPosition(position: InsertPosition): Promise<Position> {
    const [result] = await db
      .insert(positions)
      .values(position)
      .returning();
    return result;
  }

  async getPositionsByPortfolio(portfolioId: string): Promise<Position[]> {
    return db
      .select()
      .from(positions)
      .where(eq(positions.portfolioId, portfolioId));
  }

  async upsertPosition(position: InsertPosition): Promise<Position> {
    const existing = await db
      .select()
      .from(positions)
      .where(
        and(
          eq(positions.portfolioId, position.portfolioId),
          eq(positions.symbol, position.symbol)
        )
      );

    if (existing.length > 0) {
      const [result] = await db
        .update(positions)
        .set({
          quantity: position.quantity,
          avgCost: position.avgCost,
        })
        .where(eq(positions.id, existing[0].id))
        .returning();
      return result;
    } else {
      return this.createPosition(position);
    }
  }

  async deletePosition(id: string): Promise<void> {
    await db.delete(positions).where(eq(positions.id, id));
  }

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

  async getPortfolioPositionsWithPrices(portfolioId: string): Promise<PositionWithPrice[]> {
    const computedPositions = await this.getComputedPositions(portfolioId);
    
    return computedPositions.map(pos => ({
      id: `${portfolioId}-${pos.symbol}`,
      portfolioId,
      symbol: pos.symbol,
      assetType: pos.assetType,
      quantity: pos.quantity.toString(),
      avgCost: pos.avgCost.toString(),
      lastPrice: pos.lastPrice,
      pnlAmount: pos.unrealizedPnl,
      pnlPercent: pos.unrealizedPnlPercent,
    }));
  }

  async getPortfolioSummary(portfolioId: string): Promise<PortfolioSummary> {
    const computedPositions = await this.getComputedPositions(portfolioId);
    
    let totalValue = 0;
    let topMover: PortfolioSummary['topMover'] = null;
    let maxChangePercent = 0;

    for (const position of computedPositions) {
      if (position.value) {
        totalValue += position.value;
      }
      
      if (position.unrealizedPnlPercent && Math.abs(position.unrealizedPnlPercent) > maxChangePercent) {
        maxChangePercent = Math.abs(position.unrealizedPnlPercent);
        topMover = {
          symbol: position.symbol,
          change: position.unrealizedPnl || 0,
          changePercent: position.unrealizedPnlPercent,
        };
      }
    }

    return {
      totalValue,
      dailyPnL: 0, // Would need daily price data
      dailyPnLPercent: 0,
      topMover,
    };
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [result] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return result;
  }

  async getTransactionsByPortfolio(portfolioId: string, symbol?: string): Promise<Transaction[]> {
    const conditions = [eq(transactions.portfolioId, portfolioId)];
    if (symbol) {
      conditions.push(eq(transactions.symbol, symbol));
    }

    return db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt));
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | null> {
    const [result] = await db
      .update(transactions)
      .set(updates)
      .where(eq(transactions.id, id))
      .returning();
    return result || null;
  }

  async deleteTransaction(id: string): Promise<void> {
    await db.delete(transactions).where(eq(transactions.id, id));
  }

  async getComputedPositions(portfolioId: string): Promise<ComputedPosition[]> {
    const txns = await this.getTransactionsByPortfolio(portfolioId);
    
    // Group transactions by symbol
    const positionMap = new Map<string, {
      symbol: string;
      assetType: string;
      buyTxns: Transaction[];
      sellTxns: Transaction[];
      allTxns: Transaction[];
    }>();

    for (const txn of txns) {
      if (!positionMap.has(txn.symbol)) {
        positionMap.set(txn.symbol, {
          symbol: txn.symbol,
          assetType: txn.assetType,
          buyTxns: [],
          sellTxns: [],
          allTxns: []
        });
      }
      
      const position = positionMap.get(txn.symbol)!;
      position.allTxns.push(txn);
      
      if (txn.side === 'buy' || txn.side === 'transfer_in' || txn.side === 'airdrop') {
        position.buyTxns.push(txn);
      } else if (txn.side === 'sell' || txn.side === 'transfer_out') {
        position.sellTxns.push(txn);
      }
    }

    const computedPositions: ComputedPosition[] = [];

    for (const [symbol, data] of Array.from(positionMap.entries())) {
      const { buyTxns, sellTxns, allTxns } = data;
      
      // Calculate WAC (Weighted Average Cost) and current quantity
      let totalQuantity = 0;
      let totalCost = 0;
      let realizedPnl = 0;

      // Sort transactions by date
      const sortedTxns = [...allTxns].sort((a, b) => 
        new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
      );

      let fifoQueue: Array<{ quantity: number; price: number }> = [];

      for (const txn of sortedTxns) {
        const quantity = parseFloat(txn.quantity);
        const price = txn.price ? parseFloat(txn.price) : 0;

        if (txn.side === 'buy' || txn.side === 'transfer_in' || txn.side === 'airdrop') {
          // Add to inventory
          totalQuantity += quantity;
          totalCost += quantity * price;
          fifoQueue.push({ quantity, price });
        } else if (txn.side === 'sell' || txn.side === 'transfer_out') {
          // Remove from inventory using FIFO for realized P&L calculation
          totalQuantity -= quantity;
          let remainingToSell = quantity;
          
          while (remainingToSell > 0 && fifoQueue.length > 0) {
            const batch = fifoQueue[0];
            const sellFromBatch = Math.min(remainingToSell, batch.quantity);
            
            // Calculate realized P&L for this portion
            realizedPnl += sellFromBatch * (price - batch.price);
            
            batch.quantity -= sellFromBatch;
            remainingToSell -= sellFromBatch;
            
            if (batch.quantity === 0) {
              fifoQueue.shift();
            }
          }
          
          // Update total cost
          totalCost = fifoQueue.reduce((sum, batch) => sum + batch.quantity * batch.price, 0);
        }
      }

      // Skip if no current position
      if (totalQuantity <= 0) continue;

      const avgCost = totalCost / totalQuantity;
      
      // Get latest price
      const latestPrice = await this.getLatestPrice(symbol, data.assetType);
      const lastPrice = latestPrice ? parseFloat(latestPrice.close.toString()) : undefined;
      
      const value = lastPrice ? totalQuantity * lastPrice : undefined;
      const unrealizedPnl = lastPrice ? totalQuantity * (lastPrice - avgCost) : undefined;
      const unrealizedPnlPercent = unrealizedPnl && avgCost > 0 ? (unrealizedPnl / (totalQuantity * avgCost)) * 100 : undefined;

      computedPositions.push({
        symbol,
        assetType: data.assetType,
        quantity: totalQuantity,
        avgCost,
        lastPrice,
        value,
        unrealizedPnl,
        unrealizedPnlPercent,
        realizedPnl,
        totalTransactions: allTxns.length,
        firstPurchaseDate: buyTxns.length > 0 ? buyTxns[buyTxns.length - 1].occurredAt.toISOString() : undefined,
        lastTransactionDate: allTxns.length > 0 ? allTxns[0].occurredAt.toISOString() : undefined,
      });
    }

    return computedPositions;
  }

  async getComputedPosition(portfolioId: string, symbol: string): Promise<ComputedPosition | null> {
    const positions = await this.getComputedPositions(portfolioId);
    return positions.find(p => p.symbol === symbol) || null;
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
    // Mock implementation
    return [
      {
        id: "h1",
        published: "2025-01-19T12:00:00Z",
        title: "Market Outlook: Tech Stocks Rally Continues",
        source: "Financial News",
        url: "https://example.com/news/1",
        symbols: ["AAPL", "GOOGL", "MSFT"],
        summary: "Technology stocks continue their upward momentum...",
        analyzed: true,
        impactJson: JSON.stringify({
          whyThisMatters: ["Tech sector strength", "Market confidence"],
          impacts: [
            { symbol: "AAPL", direction: "up", confidence: 0.8 },
            { symbol: "GOOGL", direction: "up", confidence: 0.7 }
          ]
        }),
        createdAt: "2025-01-19T12:00:00Z"
      }
    ];
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

  async archivePortfolio(id: string): Promise<void> {
    await db.update(portfolios).set({ archived: "true" }).where(eq(portfolios.id, id));
  }

  async deletePortfolio(id: string): Promise<void> {
    // This will cascade delete all related data (transactions, positions, etc.)
    await db.delete(portfolios).where(eq(portfolios.id, id));
  }

  // Focus Assets methods
  async getFocusAssets(portfolioId: string): Promise<FocusAssetWithDetails[]> {
    const assets = await db
      .select()
      .from(focusAssets)
      .where(eq(focusAssets.portfolioId, portfolioId))
      .orderBy(focusAssets.order);

    // Enhance with additional details
    return assets.map((asset: FocusAsset) => ({
      ...asset,
      name: `${asset.symbol} Name`, // Would fetch from external API
      lastPrice: Math.random() * 200 + 50,
      change24h: (Math.random() - 0.5) * 20,
      changePercent24h: (Math.random() - 0.5) * 10,
    }));
  }

  async createFocusAsset(focusAsset: InsertFocusAsset): Promise<FocusAsset> {
    // Check if we already have 5 focus assets for this portfolio
    const existing = await db
      .select()
      .from(focusAssets)
      .where(eq(focusAssets.portfolioId, focusAsset.portfolioId));

    if (existing.length >= 5) {
      throw new Error("Maximum 5 focus assets allowed per portfolio");
    }

    const [result] = await db
      .insert(focusAssets)
      .values(focusAsset)
      .returning();
    return result;
  }

  async deleteFocusAsset(id: string): Promise<void> {
    await db.delete(focusAssets).where(eq(focusAssets.id, id));
  }

  async reorderFocusAssets(items: { id: string; order: number }[]): Promise<void> {
    for (const item of items) {
      await db
        .update(focusAssets)
        .set({ order: item.order })
        .where(eq(focusAssets.id, item.id));
    }
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
        confidence: 0.7,
        notes: ["MA20 > MA50", "RSI neutral"]
      };
    }

    return {
      symbol,
      name: `${symbol} Corporation`,
      assetType,
      price: 150 + Math.random() * 100,
      change24h: (Math.random() - 0.5) * 10,
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
    // This would enhance the existing headlines logic
    return this.getHeadlines(limit);
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

  async initializeSampleData(): Promise<void> {
    // Check if demo portfolio already exists
    const existing = await this.getPortfolios();
    if (existing.length > 0) {
      return; // Sample data already exists
    }

    // Create demo portfolio
    const portfolio = await this.createPortfolio({
      name: "Demo Portfolio",
      baseCurrency: "USD"
    });

    // Create sample transactions
    const sampleTransactions = [
      {
        portfolioId: portfolio.id,
        symbol: "AAPL",
        assetType: "equity" as const,
        side: "buy" as const,
        quantity: "10",
        price: "150.00",
        occurredAt: new Date("2024-01-15")
      },
      {
        portfolioId: portfolio.id,
        symbol: "GOOGL",
        assetType: "equity" as const,
        side: "buy" as const,
        quantity: "5",
        price: "140.00",
        occurredAt: new Date("2024-02-01")
      },
      {
        portfolioId: portfolio.id,
        symbol: "SPY",
        assetType: "etf" as const,
        side: "buy" as const,
        quantity: "20",
        price: "420.00",
        occurredAt: new Date("2024-02-15")
      }
    ];

    for (const txn of sampleTransactions) {
      await this.createTransaction(txn);
    }

    // Create sample prices
    const samplePrices = [
      { symbol: "AAPL", assetType: "equity", date: new Date(), close: "175.50", source: "yahoo" },
      { symbol: "GOOGL", assetType: "equity", date: new Date(), close: "155.25", source: "yahoo" },
      { symbol: "SPY", assetType: "etf", date: new Date(), close: "445.75", source: "yahoo" },
    ];

    for (const price of samplePrices) {
      await this.upsertPrice(price);
    }
  }
}

export const storage = new DatabaseStorage();