import { 
  Portfolio, 
  Position, 
  Price, 
  Transaction,
  WatchlistItem,
  InsertPortfolio, 
  InsertPosition, 
  InsertPrice,
  InsertTransaction,
  InsertWatchlistItem,
  PositionWithPrice,
  PortfolioSummary,
  ComputedPosition,
  AssetSearchResult,
  AssetSheetData,
  Headline,
  UpcomingEarning,
  EconomicEvent 
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Portfolio methods
  createPortfolio(portfolio: InsertPortfolio): Promise<Portfolio>;
  getPortfolio(id: string): Promise<Portfolio | undefined>;
  getPortfolios(): Promise<Portfolio[]>;
  
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
  
  // Initialize sample data
  initializeSampleData(): Promise<void>;
  
  // Migration helper
  migratePositionsToTransactions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private portfolios: Map<string, Portfolio>;
  private positions: Map<string, Position>;
  private prices: Map<string, Price>;
  private transactions: Map<string, Transaction>;
  private watchlist: Map<string, WatchlistItem>;
  private headlines: Headline[] = [];
  private upcomingEarnings: UpcomingEarning[] = [];
  private economicEvents: EconomicEvent[] = [];

  constructor() {
    this.portfolios = new Map();
    this.positions = new Map();
    this.prices = new Map();
    this.transactions = new Map();
    this.watchlist = new Map();
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo portfolio
    const demoPortfolio: Portfolio = {
      id: "demo-portfolio-1",
      name: "Demo Portfolio",
      baseCurrency: "USD",
      createdAt: new Date(),
    };
    this.portfolios.set(demoPortfolio.id, demoPortfolio);

    // Create demo positions
    const positions: Position[] = [
      {
        id: "pos-1",
        portfolioId: demoPortfolio.id,
        symbol: "AAPL",
        assetType: "equity",
        quantity: "10",
        avgCost: "180.00",
      },
      {
        id: "pos-2",
        portfolioId: demoPortfolio.id,
        symbol: "SPY",
        assetType: "etf",
        quantity: "5",
        avgCost: "500.00",
      },
      {
        id: "pos-3",
        portfolioId: demoPortfolio.id,
        symbol: "BTC-USD",
        assetType: "crypto",
        quantity: "0.05",
        avgCost: "60000.00",
      },
    ];

    positions.forEach(pos => this.positions.set(pos.id, pos));

    // Create demo prices
    const demoPrices: Price[] = [
      {
        id: "price-1",
        symbol: "AAPL",
        assetType: "equity",
        date: new Date(),
        close: "195.47",
        source: "yfinance",
      },
      {
        id: "price-2",
        symbol: "SPY",
        assetType: "etf",
        date: new Date(),
        close: "517.23",
        source: "yfinance",
      },
      {
        id: "price-3",
        symbol: "BTC-USD",
        assetType: "crypto",
        date: new Date(),
        close: "67234.56",
        source: "coingecko",
      },
    ];

    demoPrices.forEach(price => this.prices.set(price.id, price));
  }

  async createPortfolio(insertPortfolio: InsertPortfolio): Promise<Portfolio> {
    const id = randomUUID();
    const portfolio: Portfolio = {
      id,
      name: insertPortfolio.name,
      baseCurrency: insertPortfolio.baseCurrency || "USD",
      createdAt: new Date(),
    };
    this.portfolios.set(id, portfolio);
    return portfolio;
  }

  async getPortfolio(id: string): Promise<Portfolio | undefined> {
    return this.portfolios.get(id);
  }

  async getPortfolios(): Promise<Portfolio[]> {
    return Array.from(this.portfolios.values());
  }

  async createPosition(insertPosition: InsertPosition): Promise<Position> {
    const id = randomUUID();
    const position: Position = {
      ...insertPosition,
      id,
    };
    this.positions.set(id, position);
    return position;
  }

  async getPositionsByPortfolio(portfolioId: string): Promise<Position[]> {
    return Array.from(this.positions.values()).filter(
      pos => pos.portfolioId === portfolioId
    );
  }

  async upsertPosition(insertPosition: InsertPosition): Promise<Position> {
    // Find existing position by symbol and portfolio
    const existingPosition = Array.from(this.positions.values()).find(
      pos => pos.portfolioId === insertPosition.portfolioId && 
             pos.symbol === insertPosition.symbol &&
             pos.assetType === insertPosition.assetType
    );

    if (existingPosition) {
      const updatedPosition: Position = {
        ...existingPosition,
        ...insertPosition,
      };
      this.positions.set(existingPosition.id, updatedPosition);
      return updatedPosition;
    } else {
      return this.createPosition(insertPosition);
    }
  }

  async deletePosition(id: string): Promise<void> {
    this.positions.delete(id);
  }

  async upsertPrice(insertPrice: InsertPrice): Promise<Price> {
    // Find existing price by symbol, assetType, and date
    const priceKey = `${insertPrice.symbol}-${insertPrice.assetType}-${insertPrice.date.toISOString().split('T')[0]}`;
    const existingPrice = Array.from(this.prices.values()).find(
      price => `${price.symbol}-${price.assetType}-${price.date.toISOString().split('T')[0]}` === priceKey
    );

    if (existingPrice) {
      const updatedPrice: Price = {
        ...existingPrice,
        ...insertPrice,
      };
      this.prices.set(existingPrice.id, updatedPrice);
      return updatedPrice;
    } else {
      const id = randomUUID();
      const price: Price = {
        ...insertPrice,
        id,
      };
      this.prices.set(id, price);
      return price;
    }
  }

  async getLatestPrice(symbol: string, assetType: string): Promise<Price | undefined> {
    const matchingPrices = Array.from(this.prices.values())
      .filter(price => price.symbol === symbol && price.assetType === assetType)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return matchingPrices[0];
  }

  async getPriceHistory(symbol: string, assetType: string, days: number): Promise<Price[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return Array.from(this.prices.values())
      .filter(price => 
        price.symbol === symbol && 
        price.assetType === assetType &&
        new Date(price.date) >= cutoffDate
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  async getPortfolioPositionsWithPrices(portfolioId: string): Promise<PositionWithPrice[]> {
    const positions = await this.getPositionsByPortfolio(portfolioId);
    const positionsWithPrices: PositionWithPrice[] = [];

    for (const position of positions) {
      const latestPrice = await this.getLatestPrice(position.symbol, position.assetType);
      const currentPrice = latestPrice ? parseFloat(latestPrice.close) : null;
      const avgCost = parseFloat(position.avgCost);
      const quantity = parseFloat(position.quantity);

      let pnlAmount = 0;
      let pnlPercent = 0;

      if (currentPrice) {
        const currentValue = currentPrice * quantity;
        const costBasis = avgCost * quantity;
        pnlAmount = currentValue - costBasis;
        pnlPercent = (pnlAmount / costBasis) * 100;
      }

      positionsWithPrices.push({
        ...position,
        lastPrice: currentPrice || undefined,
        pnlAmount,
        pnlPercent,
      });
    }

    return positionsWithPrices;
  }

  async getPortfolioSummary(portfolioId: string): Promise<PortfolioSummary> {
    const positionsWithPrices = await this.getPortfolioPositionsWithPrices(portfolioId);
    
    let totalValue = 0;
    let totalPnL = 0;
    let topMover: { symbol: string; change: number; changePercent: number } | null = null;
    let maxChange = 0;

    for (const position of positionsWithPrices) {
      if (position.lastPrice) {
        const currentValue = position.lastPrice * parseFloat(position.quantity);
        totalValue += currentValue;
        totalPnL += position.pnlAmount || 0;

        if (Math.abs(position.pnlAmount || 0) > Math.abs(maxChange)) {
          maxChange = position.pnlAmount || 0;
          topMover = {
            symbol: position.symbol,
            change: position.pnlAmount || 0,
            changePercent: position.pnlPercent || 0,
          };
        }
      }
    }

    const totalCostBasis = totalValue - totalPnL;
    const dailyPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

    return {
      totalValue,
      dailyPnL: totalPnL,
      dailyPnLPercent,
      topMover,
    };
  }

  // Headlines
  async getHeadlines(limit = 100): Promise<Headline[]> {
    return this.headlines
      .sort((a, b) => new Date(b.published).getTime() - new Date(a.published).getTime())
      .slice(0, limit);
  }

  async createHeadline(headline: Omit<Headline, 'id' | 'createdAt'>): Promise<Headline> {
    const newHeadline: Headline = {
      ...headline,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.headlines.push(newHeadline);
    // Keep only last 100 headlines
    if (this.headlines.length > 100) {
      this.headlines = this.headlines.slice(-100);
    }
    return newHeadline;
  }

  async updateHeadline(id: string, updates: Partial<Headline>): Promise<Headline | null> {
    const index = this.headlines.findIndex(h => h.id === id);
    if (index === -1) return null;
    this.headlines[index] = { ...this.headlines[index], ...updates };
    return this.headlines[index];
  }

  // Earnings
  async getUpcomingEarnings(limit = 50): Promise<UpcomingEarning[]> {
    return this.upcomingEarnings
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, limit);
  }

  // Economic Events
  async getEconomicEvents(days = 7): Promise<EconomicEvent[]> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return this.economicEvents
      .filter(e => new Date(e.timestamp) <= cutoff && new Date(e.timestamp) >= new Date())
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Transaction methods
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      price: insertTransaction.price || null,
      fee: insertTransaction.fee || null,
      note: insertTransaction.note || null,
      createdAt: new Date(),
    };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransactionsByPortfolio(portfolioId: string, symbol?: string): Promise<Transaction[]> {
    const transactions = Array.from(this.transactions.values())
      .filter(t => t.portfolioId === portfolioId && (!symbol || t.symbol === symbol))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
    return transactions;
  }

  async updateTransaction(id: string, updates: Partial<InsertTransaction>): Promise<Transaction | null> {
    const transaction = this.transactions.get(id);
    if (!transaction) return null;
    
    const updatedTransaction: Transaction = {
      ...transaction,
      ...updates,
    };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  // Computed positions using WAC (Weighted Average Cost)
  async getComputedPositions(portfolioId: string): Promise<ComputedPosition[]> {
    const transactions = await this.getTransactionsByPortfolio(portfolioId);
    const positionMap = new Map<string, ComputedPosition>();

    // Sort transactions by occurrence date
    const sortedTransactions = transactions.sort((a, b) => 
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
    );

    // Process transactions to compute positions
    for (const tx of sortedTransactions) {
      const key = `${tx.symbol}-${tx.assetType}`;
      let position = positionMap.get(key);

      if (!position) {
        position = {
          symbol: tx.symbol,
          assetType: tx.assetType,
          quantity: 0,
          avgCost: 0,
          value: 0,
          pnlAmount: 0,
          pnlPercent: 0,
          realizedPnl: 0,
        };
        positionMap.set(key, position);
      }

      const quantity = parseFloat(tx.quantity);
      const price = tx.price ? parseFloat(tx.price) : 0;
      const fee = tx.fee ? parseFloat(tx.fee) : 0;

      if (tx.side === "buy" || tx.side === "transfer_in" || tx.side === "airdrop") {
        // Increase position using WAC
        const newTotalCost = (position.quantity * position.avgCost) + (quantity * price) + fee;
        const newTotalQuantity = position.quantity + quantity;
        position.avgCost = newTotalQuantity > 0 ? newTotalCost / newTotalQuantity : 0;
        position.quantity = newTotalQuantity;
      } else if (tx.side === "sell" || tx.side === "transfer_out") {
        // Decrease position and calculate realized P&L
        const saleProceeds = quantity * price - fee;
        const saleCostBasis = quantity * position.avgCost;
        position.realizedPnl += saleProceeds - saleCostBasis;
        position.quantity = Math.max(0, position.quantity - quantity);
      } else if (tx.side === "fee") {
        // Adjust cost basis for fees
        if (position.quantity > 0) {
          const totalCost = position.quantity * position.avgCost + fee;
          position.avgCost = totalCost / position.quantity;
        }
      }
    }

    // Get current prices and calculate unrealized P&L
    const result: ComputedPosition[] = [];
    for (const position of Array.from(positionMap.values())) {
      if (position.quantity > 0) {
        const latestPrice = await this.getLatestPrice(position.symbol, position.assetType);
        const currentPrice = latestPrice ? parseFloat(latestPrice.close) : 0;
        
        position.lastPrice = currentPrice;
        position.value = position.quantity * currentPrice;
        const costBasis = position.quantity * position.avgCost;
        position.pnlAmount = position.value - costBasis;
        position.pnlPercent = costBasis > 0 ? (position.pnlAmount / costBasis) * 100 : 0;
        
        result.push(position);
      }
    }

    return result.sort((a, b) => b.value - a.value);
  }

  async getComputedPosition(portfolioId: string, symbol: string): Promise<ComputedPosition | null> {
    const positions = await this.getComputedPositions(portfolioId);
    return positions.find(p => p.symbol === symbol) || null;
  }

  // Watchlist methods
  async addToWatchlist(insertItem: InsertWatchlistItem): Promise<WatchlistItem> {
    // Check if already exists
    const existing = Array.from(this.watchlist.values())
      .find(w => w.symbol === insertItem.symbol && w.assetType === insertItem.assetType);
    
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const item: WatchlistItem = {
      ...insertItem,
      id,
      createdAt: new Date(),
    };
    this.watchlist.set(id, item);
    return item;
  }

  async getWatchlist(): Promise<WatchlistItem[]> {
    return Array.from(this.watchlist.values())
      .sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime());
  }

  async removeFromWatchlist(id: string): Promise<void> {
    this.watchlist.delete(id);
  }

  // Search methods (mock implementation for now)
  async searchAssets(query: string, types: string[] = ["equity", "etf", "crypto"], limit = 10): Promise<AssetSearchResult[]> {
    const mockResults: AssetSearchResult[] = [];
    
    // Mock equity/ETF results
    if (types.includes("equity") || types.includes("etf")) {
      const equityResults = [
        { id: "AAPL", symbol: "AAPL", name: "Apple Inc.", assetType: "equity", exchange: "NASDAQ", lastPrice: 195.47 },
        { id: "MSFT", symbol: "MSFT", name: "Microsoft Corporation", assetType: "equity", exchange: "NASDAQ", lastPrice: 428.73 },
        { id: "SPY", symbol: "SPY", name: "SPDR S&P 500 ETF Trust", assetType: "etf", exchange: "NYSE", lastPrice: 517.23 },
        { id: "QQQ", symbol: "QQQ", name: "Invesco QQQ Trust", assetType: "etf", exchange: "NASDAQ", lastPrice: 489.35 },
      ].filter(r => 
        r.symbol.toLowerCase().includes(query.toLowerCase()) || 
        r.name.toLowerCase().includes(query.toLowerCase())
      );
      mockResults.push(...equityResults);
    }

    // Mock crypto results
    if (types.includes("crypto")) {
      const cryptoResults = [
        { id: "bitcoin", symbol: "BTC", name: "Bitcoin", assetType: "crypto", coingeckoId: "bitcoin", lastPrice: 67234.56 },
        { id: "ethereum", symbol: "ETH", name: "Ethereum", assetType: "crypto", coingeckoId: "ethereum", lastPrice: 3456.78 },
        { id: "cardano", symbol: "ADA", name: "Cardano", assetType: "crypto", coingeckoId: "cardano", lastPrice: 0.45 },
      ].filter(r => 
        r.symbol.toLowerCase().includes(query.toLowerCase()) || 
        r.name.toLowerCase().includes(query.toLowerCase())
      );
      mockResults.push(...cryptoResults);
    }

    return mockResults.slice(0, limit);
  }

  async getAssetSheetData(symbol: string, assetType: string): Promise<AssetSheetData | null> {
    // Mock implementation - in real app, this would fetch from APIs
    const mockData: Record<string, AssetSheetData> = {
      "AAPL-equity": {
        symbol: "AAPL",
        name: "Apple Inc.",
        assetType: "equity",
        price: 195.47,
        change24h: 2.45,
        changePercent24h: 1.27,
        marketCap: 3010000000000,
        miniChart: Array.from({ length: 7 }, (_, i) => ({
          ts: Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
          close: 190 + Math.random() * 10
        })),
        asOf: new Date().toISOString(),
      },
      "BTC-crypto": {
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        price: 67234.56,
        change24h: -1234.56,
        changePercent24h: -1.8,
        marketCap: 1320000000000,
        miniChart: Array.from({ length: 7 }, (_, i) => ({
          ts: Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
          close: 65000 + Math.random() * 5000
        })),
        asOf: new Date().toISOString(),
      },
    };

    return mockData[`${symbol}-${assetType}`] || null;
  }

  // Migration helper
  async migratePositionsToTransactions(): Promise<void> {
    const positions = Array.from(this.positions.values());
    
    for (const position of positions) {
      // Convert each position to a buy transaction
      const transaction: InsertTransaction = {
        portfolioId: position.portfolioId,
        symbol: position.symbol,
        assetType: position.assetType as any,
        side: "buy",
        quantity: position.quantity,
        price: position.avgCost,
        fee: "0",
        occurredAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        note: "Migrated from existing position",
      };
      
      await this.createTransaction(transaction);
    }
    
    console.log(`Migrated ${positions.length} positions to transactions`);
  }

  // Initialize sample data
  async initializeSampleData(): Promise<void> {
    // This will be implemented to load sample data from files
  }
}

export const storage = new MemStorage();
