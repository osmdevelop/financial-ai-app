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

export const userPrefs = pgTable("user_prefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  riskStyle: text("risk_style").notNull(), // "Conservative" | "Balanced" | "Aggressive"
  mockLivePref: text("mock_live_pref").notNull().default("mock"), // "mock" | "live"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  portfolioIdx: index("user_prefs_portfolio_idx").on(table.portfolioId),
}));

export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "price" | "pct" | "earnings" | "sentiment"
  symbol: text("symbol"), // null for sentiment alerts
  threshold: decimal("threshold"), // price or pct or sentiment score
  direction: text("direction"), // "above" | "below"
  windowMin: integer("window_min").default(60), // debounce window for repeated fires
  enabled: text("enabled").notNull().default("true"), // "true" | "false"
  lastTriggered: timestamp("last_triggered"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  portfolioTypeSymbolIdx: index("alerts_portfolio_type_symbol_idx").on(table.portfolioId, table.type, table.symbol),
}));

// Events Intelligence tables
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull(),
  event: text("event").notNull(),
  forecast: decimal("forecast"),
  previous: decimal("previous"),
  actual: decimal("actual"),
  importance: text("importance").notNull(), // "high" | "medium" | "low"
  unit: text("unit"),
  country: text("country").notNull().default("US"),
  category: text("category").notNull(), // "inflation" | "employment" | "monetary_policy" | etc
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  timestampIdx: index("events_timestamp_idx").on(table.timestamp),
  categoryIdx: index("events_category_idx").on(table.category),
  importanceIdx: index("events_importance_idx").on(table.importance),
}));

export const eventAlerts = pgTable("event_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  alertType: text("alert_type").notNull(), // "surprise"
  threshold: decimal("threshold").notNull(), // Z-score threshold (e.g., 1.0)
  triggered: text("triggered").notNull().default("false"), // "true" | "false"
  deviationScore: decimal("deviation_score"), // actual Z-score when triggered
  notification: text("notification"), // alert message
  createdAt: timestamp("created_at").defaultNow(),
  triggeredAt: timestamp("triggered_at"),
}, (table) => ({
  eventTypeIdx: index("event_alerts_event_type_idx").on(table.eventId, table.alertType),
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

export const insertUserPrefsSchema = createInsertSchema(userPrefs).pick({
  portfolioId: true,
  riskStyle: true,
  mockLivePref: true,
}).extend({
  riskStyle: z.enum(["Conservative", "Balanced", "Aggressive"]),
  mockLivePref: z.enum(["mock", "live"]),
});

export const insertAlertSchema = createInsertSchema(alerts).pick({
  portfolioId: true,
  type: true,
  symbol: true,
  threshold: true,
  direction: true,
  windowMin: true,
  enabled: true,
}).extend({
  type: z.enum(["price", "pct", "earnings", "sentiment"]),
  direction: z.enum(["above", "below"]).optional(),
  enabled: z.enum(["true", "false"]).optional(),
  threshold: z.string().optional(),
  symbol: z.string().optional(),
  windowMin: z.number().optional(),
});

export const insertEventSchema = createInsertSchema(events).pick({
  timestamp: true,
  event: true,
  forecast: true,
  previous: true,
  actual: true,
  importance: true,
  unit: true,
  country: true,
  category: true,
}).extend({
  importance: z.enum(["high", "medium", "low"]),
  timestamp: z.union([z.date(), z.string().transform(val => new Date(val))]),
});

export const insertEventAlertSchema = createInsertSchema(eventAlerts).pick({
  eventId: true,
  alertType: true,
  threshold: true,
  triggered: true,
  deviationScore: true,
  notification: true,
}).extend({
  alertType: z.enum(["surprise"]),
  triggered: z.enum(["true", "false"]).optional(),
  threshold: z.string(),
  deviationScore: z.string().optional(),
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
export type UserPrefs = typeof userPrefs.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type Event = typeof events.$inferSelect;
export type EventAlert = typeof eventAlerts.$inferSelect;
export type InsertUserPrefs = z.infer<typeof insertUserPrefsSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertEventAlert = z.infer<typeof insertEventAlertSchema>;

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

// Phase 4 - Alerts and Notifications
export type Notification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  alertId?: string;
};

// Phase 4 - Enhanced Sentiment with Sub-scores
export type SentimentSubScores = {
  riskAppetite: number;
  credit: number;
  volatilityInv: number;
  breadth: number;
};

export type SentimentDelta = {
  vsYesterday: number;
  vsLastWeek?: number;
};

export type EnhancedSentimentIndex = {
  score: number;
  regime: SentimentRegime;
  as_of: string;
  subscores: SentimentSubScores;
  delta: SentimentDelta;
};

// Phase 4 - AI Insight Templates
export type AIInsightTemplate = {
  id: string;
  name: string;
  prompt: string;
  description: string;
};

// Phase 4 - Enhanced API Response with Freshness
export type FreshnessInfo = {
  as_of: string;
  source: string;
  fresh: boolean;
};

// Enhanced freshness metadata with detailed source info
export const freshnessMetadataSchema = z.object({
  lastUpdated: z.string(), // ISO timestamp when data was fetched/calculated
  dataSource: z.enum(["live", "mock", "cached", "fallback"]), // Source type
  sourceName: z.string().optional(), // Specific source (e.g., "Alpha Vantage", "CoinGecko")
  freshness: z.enum(["realtime", "recent", "stale", "unknown"]), // Data age assessment
  disclaimer: z.string().optional(), // Additional context for users
});

export type FreshnessMetadata = z.infer<typeof freshnessMetadataSchema>;

// Today Market Drivers types
export const todaySubscoreSchema = z.object({
  name: z.string(),
  score: z.number(),
  weight: z.number(),
  change: z.number(),
  trend: z.enum(["up", "down", "neutral"]),
});

export const todayDriverSchema = z.object({
  label: z.string(),
  value: z.number(),
  contribution: z.number(),
  note: z.string(),
});

export const todayOverviewSchema = z.object({
  overallIndex: z.number(),
  regime: z.string(),
  change: z.number(),
  subscores: z.array(todaySubscoreSchema),
  drivers: z.array(todayDriverSchema),
  as_of: z.string(),
});

export const todayWrapRequestSchema = z.object({
  contextNote: z.string().optional(),
});

export const todayWrapResponseSchema = z.object({
  summary: z.string(),
  keyHighlights: z.array(z.string()),
  disclaimer: z.string(),
  as_of: z.string(),
});

export type TodaySubscore = z.infer<typeof todaySubscoreSchema>;
export type TodayDriver = z.infer<typeof todayDriverSchema>;
export type TodayOverview = z.infer<typeof todayOverviewSchema>;
export type TodayWrapRequest = z.infer<typeof todayWrapRequestSchema>;
export type TodayWrapResponse = z.infer<typeof todayWrapResponseSchema>;

// Events Intelligence API types
export const eventUpcomingSchema = z.object({
  timestamp: z.string(),
  event: z.string(),
  forecast: z.number().optional(),
  previous: z.number().optional(),
  importance: z.enum(["high", "medium", "low"]),
  unit: z.string().optional(),
  country: z.string(),
  category: z.string(),
});

export const eventPrebriefRequestSchema = z.object({
  eventPayload: z.object({
    event: z.string(),
    forecast: z.number().optional(),
    previous: z.number().optional(),
    timestamp: z.string(),
    importance: z.string(),
    category: z.string(),
  }),
});

export const eventPrebriefResponseSchema = z.object({
  consensus: z.string(),
  risks: z.array(z.string()),
  watchPoints: z.array(z.string()),
  sensitiveAssets: z.array(z.string()),
  as_of: z.string(),
});

export const eventPostmortemRequestSchema = z.object({
  eventPayload: z.object({
    event: z.string(),
    forecast: z.number().optional(),
    previous: z.number().optional(),
    actual: z.number(),
    timestamp: z.string(),
    importance: z.string(),
    category: z.string(),
  }),
});

export const eventPostmortemResponseSchema = z.object({
  outcome: z.string(), // "beat" | "miss" | "inline"
  analysis: z.string(),
  marketReaction: z.string(),
  followThrough: z.string(),
  implications: z.array(z.string()),
  as_of: z.string(),
});

export const eventStudiesResponseSchema = z.object({
  event: z.string(),
  historicalDates: z.array(z.string()),
  driftAnalysis: z.object({
    preDays: z.number(),
    postDays: z.number(),
    avgReturn: z.number(),
    winRate: z.number(),
    maxDrawdown: z.number(),
    maxUpward: z.number(),
  }),
  as_of: z.string(),
});

export const eventTranslateRequestSchema = z.object({
  text: z.string(),
});

export const eventTranslateResponseSchema = z.object({
  original: z.string(),
  translation: z.string(),
  keyTerms: z.array(z.object({
    term: z.string(),
    explanation: z.string(),
  })),
  tone: z.string(),
  as_of: z.string(),
});

export type EventUpcoming = z.infer<typeof eventUpcomingSchema>;
export type EventPrebriefRequest = z.infer<typeof eventPrebriefRequestSchema>;
export type EventPrebriefResponse = z.infer<typeof eventPrebriefResponseSchema>;
export type EventPostmortemRequest = z.infer<typeof eventPostmortemRequestSchema>;
export type EventPostmortemResponse = z.infer<typeof eventPostmortemResponseSchema>;
export type EventStudiesResponse = z.infer<typeof eventStudiesResponseSchema>;
export type EventTranslateRequest = z.infer<typeof eventTranslateRequestSchema>;
export type EventTranslateResponse = z.infer<typeof eventTranslateResponseSchema>;
