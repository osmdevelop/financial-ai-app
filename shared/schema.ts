import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").notNull().default("USD"),
  archived: text("archived").notNull().default("false"),
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

export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // equity | etf | crypto | fx | commodity
  side: text("side").notNull(), // buy | sell | transfer_in | transfer_out | airdrop | fee | dividend
  quantity: decimal("quantity").notNull(), // positive numbers only
  price: decimal("price"), // unit price in quote currency (USD default)
  fee: decimal("fee"), // optional
  occurredAt: timestamp("occurred_at").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  portfolioSymbolOccurredIdx: index("portfolio_symbol_occurred_idx").on(table.portfolioId, table.symbol, table.occurredAt),
}));

export const hiddenAssets = pgTable("hidden_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
}, (table) => ({
  portfolioSymbolIdx: index("portfolio_symbol_idx").on(table.portfolioId, table.symbol),
}));

export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolAssetTypeIdx: index("symbol_asset_type_idx").on(table.symbol, table.assetType),
}));

export const focusAssets = pgTable("focus_assets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // equity | etf | crypto | fx | commodity
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  portfolioSymbolIdx: index("portfolio_symbol_focus_idx").on(table.portfolioId, table.symbol),
}));

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

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  portfolioId: true,
  symbol: true,
  assetType: true,
  side: true,
  quantity: true,
  price: true,
  fee: true,
  occurredAt: true,
  note: true,
}).extend({
  side: z.enum(["buy", "sell", "transfer_in", "transfer_out", "airdrop", "fee", "dividend"]),
  assetType: z.enum(["equity", "etf", "crypto", "fx", "commodity"]),
  quantity: z.string().transform(val => {
    const num = parseFloat(val);
    if (num <= 0) throw new Error("Quantity must be positive");
    return val;
  }),
  occurredAt: z.union([z.date(), z.string().transform(val => new Date(val))]),
  price: z.union([z.string(), z.null()]).optional(),
  fee: z.union([z.string(), z.null()]).optional(),
  note: z.union([z.string(), z.null()]).optional(),
});

export const insertWatchlistSchema = createInsertSchema(watchlist).pick({
  symbol: true,
  assetType: true,
});

export const insertHiddenAssetSchema = createInsertSchema(hiddenAssets).pick({
  portfolioId: true,
  symbol: true,
});

export const insertFocusAssetSchema = createInsertSchema(focusAssets).pick({
  portfolioId: true,
  symbol: true,
  assetType: true,
  order: true,
}).extend({
  assetType: z.enum(["equity", "etf", "crypto", "fx", "commodity"]),
});

// Types
export type Portfolio = typeof portfolios.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type HiddenAsset = typeof hiddenAssets.$inferSelect;
export type FocusAsset = typeof focusAssets.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type InsertPrice = z.infer<typeof insertPriceSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type InsertHiddenAsset = z.infer<typeof insertHiddenAssetSchema>;
export type InsertFocusAsset = z.infer<typeof insertFocusAssetSchema>;

// Extended types for API responses
export type PositionWithPrice = Position & {
  lastPrice?: number;
  pnlAmount?: number;
  pnlPercent?: number;
};

// Computed position from transactions using WAC method
export type ComputedPosition = {
  symbol: string;
  assetType: string;
  quantity: number;
  avgCost: number;
  lastPrice?: number;
  value?: number;
  unrealizedPnl?: number;
  unrealizedPnlPercent?: number;
  realizedPnl?: number;
  totalTransactions: number;
  firstPurchaseDate?: string;
  lastTransactionDate?: string;
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

export type MarketSentiment = {
  score: number;
  drivers: {
    label: string;
    weight: number;
    explanation: string;
  }[];
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

// New types for transaction-based features

export type AssetSearchResult = {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  exchange?: string;
  coingeckoId?: string;
  lastPrice?: number;
};

export type AssetSheetData = {
  symbol: string;
  name: string;
  assetType: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  marketCap?: number;
  miniChart: { ts: number; close: number }[];
  asOf: string;
};

export type TransactionSide = "buy" | "sell" | "transfer_in" | "transfer_out" | "airdrop" | "fee" | "dividend";
export type AssetType = "equity" | "etf" | "crypto" | "fx" | "commodity";

// Phase 3 - Enhanced Sentiment Types
export type SentimentRegime = "Risk-On" | "Neutral" | "Risk-Off";

export type SentimentDriver = {
  label: string;
  value: number;
  contribution: number;
  note: string;
};

export type EnhancedMarketSentiment = {
  score: number; // 0-100
  regime: SentimentRegime;
  drivers: SentimentDriver[];
  as_of: string;
};

export type SentimentNarrative = {
  summary: string;
  bullets: string[];
  as_of: string;
};

// Phase 3 - Focus Assets
export type FocusAssetWithDetails = FocusAsset & {
  name?: string;
  lastPrice?: number;
  change24h?: number;
  changePercent24h?: number;
};

// Phase 3 - Multi-timeframe Analysis
export type TimeframeStance = "Bullish" | "Bearish" | "Neutral";

export type AssetTimeframeData = {
  changePct: number;
  stance: TimeframeStance;
  confidence: number;
  notes: string[];
};

export type AssetOverview = {
  symbol: string;
  name: string;
  assetType: string;
  price: number;
  change24h: number;
  frames: Record<string, AssetTimeframeData>; // "1h", "1d", "1w", etc.
  as_of: string;
};

export type AssetOverviewSummary = {
  headline: string;
  bullets: string[];
  as_of: string;
};

// Phase 3 - Market Recap
export type IndexPerformance = {
  symbol: string;
  name: string;
  pct: number;
};

export type SectorPerformance = {
  symbol: string;
  name: string;
  pct: number;
};

export type TopMover = {
  symbol: string;
  name: string;
  pct: number;
  volume?: number;
};

export type MarketRecap = {
  indices: IndexPerformance[];
  sectors: SectorPerformance[];
  movers: {
    gainers: TopMover[];
    losers: TopMover[];
  };
  as_of: string;
};

export type MarketRecapSummary = {
  bullets: string[];
  watchTomorrow: string;
  as_of: string;
};

// Phase 3 - Enhanced Headlines
export type HeadlineImpactAnalysis = {
  whyThisMatters: string[];
  impacts: {
    symbol: string;
    direction: 'up' | 'down' | 'neutral';
    confidence: number;
  }[];
  as_of: string;
};
