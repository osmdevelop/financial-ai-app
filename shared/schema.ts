import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // "equity" | "etf" | "crypto"
  quantity: decimal("quantity").notNull(),
  avgCost: decimal("avg_cost").notNull(),
});

export const prices = pgTable("prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  date: timestamp("date").notNull(),
  close: decimal("close").notNull(),
  source: text("source").notNull(),
});

// Insert schemas
export const insertPortfolioSchema = createInsertSchema(portfolios).pick({
  name: true,
  baseCurrency: true,
});

export const insertPositionSchema = createInsertSchema(positions).pick({
  portfolioId: true,
  symbol: true,
  assetType: true,
  quantity: true,
  avgCost: true,
});

export const insertPriceSchema = createInsertSchema(prices).pick({
  symbol: true,
  assetType: true,
  date: true,
  close: true,
  source: true,
});

// Types
export type Portfolio = typeof portfolios.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type InsertPrice = z.infer<typeof insertPriceSchema>;

// Extended types for API responses
export type PositionWithPrice = Position & {
  lastPrice?: number;
  pnlAmount?: number;
  pnlPercent?: number;
};

export type PortfolioSummary = {
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  topMover: {
    symbol: string;
    change: number;
    changePercent: number;
  } | null;
};

export type PriceData = {
  symbol: string;
  assetType: string;
  close: number;
  date: string;
  source: string;
};

export type AIInsightResponse = {
  summary: string;
  whyThisMatters: string[];
};

export type SentimentDriver = {
  label: string;
  weight: number;
  explanation: string;
};

export type MarketSentiment = {
  score: number;
  drivers: SentimentDriver[];
  timestamp: string;
  lastUpdated: string;
};

export type IntradayCandle = {
  ts: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type IntradayData = {
  symbol: string;
  interval: string;
  candles: IntradayCandle[];
  source: string;
};

// Headlines
export type Headline = {
  id: string;
  published: string;
  title: string;
  source: string;
  url: string;
  symbols: string[];
  summary?: string;
  analyzed: boolean;
  impactJson?: string;
  createdAt: string;
};

export type HeadlineImpact = {
  whyThisMatters: string[];
  impacts: {
    symbol: string;
    direction: 'up' | 'down' | 'neutral';
    confidence: number;
  }[];
  as_of: string;
};

// Earnings
export type UpcomingEarning = {
  symbol: string;
  date: string;
  eps_est: number;
  sector: string;
};

export type EarningsHistory = {
  quarter: string;
  actual: number;
  estimate: number;
  surprise: number;
  surprisePercent: number;
};

export type EarningsPrediction = {
  surpriseUpProb: number;
  surpriseDownProb: number;
  commentary: string;
  as_of: string;
};

// Economic Calendar
export type EconomicEvent = {
  id: string;
  timestamp: string;
  country: string;
  event: string;
  importance: 'low' | 'medium' | 'high';
  previous?: string;
  forecast?: string;
  actual?: string;
};

export type EconomicImpact = {
  affectedAssets: string[];
  directionByAsset: {
    rates?: 'up' | 'down' | 'mixed';
    equities?: 'up' | 'down' | 'mixed';
    usd?: 'up' | 'down' | 'mixed';
    gold?: 'up' | 'down' | 'mixed';
    oil?: 'up' | 'down' | 'mixed';
    crypto?: 'up' | 'down' | 'mixed';
  };
  reasoning: string;
  explanation?: string;
  as_of: string;
};
