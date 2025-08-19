import { 
  Portfolio, 
  Position, 
  Price, 
  InsertPortfolio, 
  InsertPosition, 
  InsertPrice,
  PositionWithPrice,
  PortfolioSummary 
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
}

export class MemStorage implements IStorage {
  private portfolios: Map<string, Portfolio>;
  private positions: Map<string, Position>;
  private prices: Map<string, Price>;

  constructor() {
    this.portfolios = new Map();
    this.positions = new Map();
    this.prices = new Map();
    
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
}

export const storage = new MemStorage();
