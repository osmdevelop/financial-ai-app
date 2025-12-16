import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const prices = pgTable("prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  date: timestamp("date").notNull(),
  close: decimal("close").notNull(),
  source: text("source").notNull(),
});

export const watchlist = pgTable("watchlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  symbolAssetTypeIdx: index("symbol_asset_type_idx").on(table.symbol, table.assetType),
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

// News & Headlines tables
export const headlines = pgTable("headlines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  published: timestamp("published").notNull(),
  title: text("title").notNull(),
  source: text("source").notNull(),
  url: text("url").notNull(),
  summary: text("summary"),
  symbols: text("symbols").array().default([]), // array of tickers
  sentimentScore: decimal("sentiment_score"),
  sentimentLabel: text("sentiment_label"),
  clusterId: varchar("cluster_id").references(() => newsClusters.id),
  impactDirection: text("impact_direction"), // "up" | "down" | "neutral"
  impactMagnitude: integer("impact_magnitude"), // 1-3
  impactConfidence: decimal("impact_confidence"), // 0-1
  impactReason: text("impact_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  publishedIdx: index("headlines_published_idx").on(table.published),
  clusterIdx: index("headlines_cluster_idx").on(table.clusterId),
  symbolsIdx: index("headlines_symbols_idx").on(table.symbols),
}));

export const newsClusters = pgTable("news_clusters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  topic: text("topic").notNull(), // AI-generated topic name
  description: text("description"), // brief description of the cluster
  embedding: text("embedding"), // JSON-serialized OpenAI embedding
  headlineCount: integer("headline_count").default(0),
  avgImpactMagnitude: decimal("avg_impact_magnitude"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  topicIdx: index("clusters_topic_idx").on(table.topic),
  createdAtIdx: index("clusters_created_at_idx").on(table.createdAt),
}));

export const headlineCache = pgTable("headline_cache", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  headlineId: varchar("headline_id").notNull().references(() => headlines.id, { onDelete: "cascade" }),
  analysisType: text("analysis_type").notNull(), // "impact" | "clustering" | "sentiment"
  result: text("result").notNull(), // JSON-serialized analysis result
  confidence: decimal("confidence"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  headlineAnalysisIdx: index("cache_headline_analysis_idx").on(table.headlineId, table.analysisType),
}));

// Insert schemas
export const insertPriceSchema = createInsertSchema(prices).pick({
  symbol: true,
  assetType: true,
  date: true,
  close: true,
  source: true,
});

export const insertWatchlistSchema = createInsertSchema(watchlist).pick({
  symbol: true,
  assetType: true,
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

// News & Headlines insert schemas
export const insertHeadlineSchema = createInsertSchema(headlines).pick({
  published: true,
  title: true,
  source: true,
  url: true,
  summary: true,
  symbols: true,
  sentimentScore: true,
  sentimentLabel: true,
  clusterId: true,
  impactDirection: true,
  impactMagnitude: true,
  impactConfidence: true,
  impactReason: true,
}).extend({
  published: z.union([z.date(), z.string().transform(val => new Date(val))]),
  impactDirection: z.enum(["up", "down", "neutral"]).optional(),
  impactMagnitude: z.number().min(1).max(3).optional(),
  impactConfidence: z.number().min(0).max(1).optional(),
});

export const insertNewsClusterSchema = createInsertSchema(newsClusters).pick({
  topic: true,
  description: true,
  embedding: true,
  headlineCount: true,
  avgImpactMagnitude: true,
});

export const insertHeadlineCacheSchema = createInsertSchema(headlineCache).pick({
  headlineId: true,
  analysisType: true,
  result: true,
  confidence: true,
}).extend({
  analysisType: z.enum(["impact", "clustering", "sentiment"]),
  confidence: z.number().min(0).max(1).optional(),
});

// News API schemas
export const newsStreamSchema = z.object({
  scope: z.enum(["all", "portfolio", "focus"]).default("all"),
  limit: z.coerce.number().min(1).max(100).default(50),
});

export const newsAnalyzeSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  symbols: z.array(z.string()).default([]),
});

// Types
export type Price = typeof prices.$inferSelect;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertPrice = z.infer<typeof insertPriceSchema>;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
export type Event = typeof events.$inferSelect;
export type EventAlert = typeof eventAlerts.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type InsertEventAlert = z.infer<typeof insertEventAlertSchema>;

// News & Headlines types
export type NewsHeadline = typeof headlines.$inferSelect;
export type NewsCluster = typeof newsClusters.$inferSelect;
export type HeadlineCache = typeof headlineCache.$inferSelect;
export type InsertNewsHeadline = z.infer<typeof insertHeadlineSchema>;
export type InsertNewsCluster = z.infer<typeof insertNewsClusterSchema>;
export type InsertHeadlineCache = z.infer<typeof insertHeadlineCacheSchema>;

// News API response types
export type NewsAnalysisResult = {
  direction: "up" | "down" | "neutral";
  magnitude: 1 | 2 | 3;
  confidence: number; // 0-1
  why: string;
};

export type ClusteredHeadline = NewsHeadline & {
  clusterTopic?: string;
  impactLevel: "high" | "medium" | "low";
};

export type NewsStreamResponse = {
  headlines: ClusteredHeadline[];
  clusters: {
    id: string;
    topic: string;
    description?: string;
    headlines: ClusteredHeadline[];
  }[];
  freshness: {
    lastUpdated: string;
    source: string;
    isLive: boolean;
  };
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
  // Policy metadata
  isPolicy?: boolean;
  policyTopics?: string[];
  policyIntensity?: number; // 0-1
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

// MODULE D: Asset Overview 2.0 Types and Schemas
// ============================================

// OHLC Data Point
export const ohlcDataPointSchema = z.object({
  timestamp: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().optional(),
});

// Technical Indicators
export const technicalIndicatorsSchema = z.object({
  ma10: z.number().optional(),
  ma30: z.number().optional(),
  ma50: z.number().optional(),
  rsi14: z.number().optional(),
  atr14: z.number().optional(),
});

// Probabilistic Statistics
export const probabilisticStatsSchema = z.object({
  odds1d: z.object({
    up: z.number(),
    down: z.number(),
  }),
  odds5d: z.object({
    up: z.number(),
    down: z.number(),
  }),
  odds30d: z.object({
    up: z.number(),
    down: z.number(),
  }),
  var95: z.number(), // Value at Risk (95%)
  es95: z.number(), // Expected Shortfall (95%)
  upside3pct: z.object({
    in7days: z.number(),
    in14days: z.number(),
    in30days: z.number(),
  }),
});

// Support/Resistance Levels
export const supportResistanceSchema = z.object({
  support: z.array(z.object({
    level: z.number(),
    strength: z.number(), // 0-1 confidence score
  })),
  resistance: z.array(z.object({
    level: z.number(),
    strength: z.number(), // 0-1 confidence score
  })),
});

// Multi-timeframe OHLC Data
export const multiTimeframeDataSchema = z.object({
  "1h": z.array(ohlcDataPointSchema),
  "1d": z.array(ohlcDataPointSchema),
  "1w": z.array(ohlcDataPointSchema),
  "1m": z.array(ohlcDataPointSchema),
  "3m": z.array(ohlcDataPointSchema),
  "1y": z.array(ohlcDataPointSchema),
});

// Asset Overview Response
export const assetOverviewResponseSchema = z.object({
  symbol: z.string(),
  assetType: z.enum(["equity", "etf", "crypto"]),
  currentPrice: z.number(),
  change: z.number(),
  changePct: z.number(),
  ohlcData: multiTimeframeDataSchema,
  indicators: technicalIndicatorsSchema,
  stats: probabilisticStatsSchema,
  supportResistance: supportResistanceSchema,
  catalysts: z.array(z.object({
    type: z.string(),
    title: z.string(),
    impact: z.enum(["high", "medium", "low"]),
    date: z.string(),
  })),
  freshness: freshnessMetadataSchema,
});

// Asset Overview Request
export const assetOverviewRequestSchema = z.object({
  symbol: z.string().min(1),
  assetType: z.enum(["equity", "etf", "crypto"]),
});

// AI Brief Response
export const assetBriefResponseSchema = z.object({
  bullCase: z.array(z.string()), // 3 bullets
  bearCase: z.array(z.string()), // 3 bullets
  risks: z.array(z.string()), // 3 bullets
  confidence: z.number(), // 0-100
  freshness: freshnessMetadataSchema,
});

// AI Brief Request
export const assetBriefRequestSchema = z.object({
  overviewPayload: assetOverviewResponseSchema,
});

// Price Alert Creation
export const priceAlertCreateSchema = z.object({
  symbol: z.string(),
  alertType: z.enum(["price", "percentage"]),
  direction: z.enum(["above", "below"]),
  value: z.number(),
  label: z.string().optional(),
});

// Module D Type Exports
export type OHLCDataPoint = z.infer<typeof ohlcDataPointSchema>;
export type TechnicalIndicators = z.infer<typeof technicalIndicatorsSchema>;
export type ProbabilisticStats = z.infer<typeof probabilisticStatsSchema>;
export type SupportResistance = z.infer<typeof supportResistanceSchema>;
export type MultiTimeframeData = z.infer<typeof multiTimeframeDataSchema>;
export type AssetOverviewResponse = z.infer<typeof assetOverviewResponseSchema>;
export type AssetOverviewRequest = z.infer<typeof assetOverviewRequestSchema>;
export type AssetBriefResponse = z.infer<typeof assetBriefResponseSchema>;
export type AssetBriefRequest = z.infer<typeof assetBriefRequestSchema>;
export type PriceAlertCreate = z.infer<typeof priceAlertCreateSchema>;

// MODULE E: Policy & Political Indexes Types and Schemas
// ====================================================

// Policy News Cluster type
export const policyNewsClusterSchema = z.object({
  id: z.string(),
  label: z.string(), // e.g. "China tariffs", "Defense spending"
  topics: z.array(z.string()), // union of topics from clustered items
  intensity: z.number(), // 0-1 aggregate intensity
  newsIds: z.array(z.string()), // ids of news items in cluster
  summary: z.string(), // AI-generated 1-2 sentence summary
});

export type PolicyNewsCluster = z.infer<typeof policyNewsClusterSchema>;

// Policy Sensitivity type
export type PolicySensitivity = "High" | "Moderate" | "Low" | "None";

// Trump Index Response
export const trumpIndexResponseSchema = z.object({
  zScore: z.number(), // Current Trump index z-score
  change7d: z.number(), // 7-day change in index
  lastUpdated: z.string(),
  sensitiveAssets: z.array(z.object({
    symbol: z.string(),
    name: z.string(),
    correlation: z.number(), // correlation coefficient with Trump index
    currentPrice: z.number(),
    change: z.number(),
    changePct: z.number(),
    significance: z.enum(["high", "medium", "low"]), // statistical significance
    rollingImpact: z.number().optional(), // rolling impact score for sensitivity calculation
    sensitivity: z.enum(["High", "Moderate", "Low", "None"]).optional(), // policy sensitivity label
  })),
  recentNews: z.array(z.object({
    id: z.string().optional(), // unique id for clustering
    title: z.string(),
    summary: z.string(),
    url: z.string(),
    published: z.string(),
    topics: z.array(z.string()), // detected policy topics
    intensity: z.number(), // topic intensity score 0-1
  })),
  clusters: z.array(policyNewsClusterSchema).optional(), // clustered news themes
  freshness: freshnessMetadataSchema,
});

// Fedspeak Response  
export const fedspeakResponseSchema = z.object({
  currentTone: z.enum(["hawkish", "dovish", "neutral"]),
  toneScore: z.number(), // -1 (very dovish) to +1 (very hawkish)
  rollingTone7d: z.number(), // 7-day rolling average
  change7d: z.number(), // change in tone over 7 days
  lastUpdated: z.string(),
  recentQuotes: z.array(z.object({
    text: z.string(),
    speaker: z.string(),
    tone: z.enum(["hawkish", "dovish", "neutral"]),
    confidence: z.number(), // AI classification confidence 0-1
    date: z.string(),
    url: z.string(),
    impliedOdds: z.string(), // textual odds interpretation
  })),
  freshness: freshnessMetadataSchema,
});

// Policy Topics Filter
export const policyTopicsSchema = z.object({
  tariffs: z.number(),
  trade: z.number(), 
  immigration: z.number(),
  defense: z.number(),
}).partial();

// Module E Type Exports
export type TrumpIndexResponse = z.infer<typeof trumpIndexResponseSchema>;
export type FedspeakResponse = z.infer<typeof fedspeakResponseSchema>;
export type PolicyTopics = z.infer<typeof policyTopicsSchema>;

// Alert System
export const alertSchema = z.object({
  id: z.string(),
  portfolioId: z.string().optional(),
  type: z.enum(["price", "pct", "earnings", "sentiment", "policy_index", "fedspeak_regime"]),
  symbol: z.string().nullable(),
  threshold: z.number().nullable(),
  direction: z.enum(["above", "below", "crosses"]).nullable(),
  meta: z.record(z.any()).nullable(), // for storing previousRegime, etc.
  enabled: z.boolean(),
  lastTriggered: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const insertAlertSchema = alertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastTriggered: true,
});

export type Alert = z.infer<typeof alertSchema>;
export type InsertAlert = z.infer<typeof insertAlertSchema>;

// MODULE F: Market Regime Engine Types and Schemas
// ================================================

export type MarketRegime = "Risk-On" | "Neutral" | "Risk-Off" | "Policy Shock" | "Stagflation";

export type RegimeDriverKey =
  | "sentiment"
  | "policy"
  | "fed"
  | "volatility"
  | "rates"
  | "risk_appetite";

export const regimeDriverSchema = z.object({
  key: z.enum(["sentiment", "policy", "fed", "volatility", "rates", "risk_appetite"]),
  label: z.string(),
  direction: z.enum(["up", "down", "flat", "mixed"]),
  strength: z.enum(["low", "medium", "high"]),
  detail: z.string(),
});

export const marketRegimeSnapshotSchema = z.object({
  asOf: z.string(),
  regime: z.enum(["Risk-On", "Neutral", "Risk-Off", "Policy Shock", "Stagflation"]),
  confidence: z.number().min(0).max(100),
  changedSinceYesterday: z.boolean(),
  drivers: z.array(regimeDriverSchema),
  inputs: z.object({
    sentiment: z.object({
      score: z.number().optional(),
      state: z.string().optional(),
      asOf: z.string().optional(),
      isMock: z.boolean().optional(),
    }).optional(),
    policy: z.object({
      trumpZ: z.number().optional(),
      trumpRisk: z.string().optional(),
      isMock: z.boolean().optional(),
    }).optional(),
    fed: z.object({
      tone: z.enum(["hawkish", "dovish", "neutral"]).optional(),
      score: z.number().optional(),
      isMock: z.boolean().optional(),
    }).optional(),
    volatility: z.object({
      score: z.number().optional(),
      state: z.string().optional(),
      isMock: z.boolean().optional(),
    }).optional(),
    riskAppetite: z.object({
      score: z.number().optional(),
      state: z.string().optional(),
      isMock: z.boolean().optional(),
    }).optional(),
  }),
  meta: z.object({
    isMock: z.boolean(),
    missingInputs: z.array(z.string()),
    notes: z.string().optional(),
  }),
});

export type RegimeDriver = z.infer<typeof regimeDriverSchema>;
export type MarketRegimeSnapshot = z.infer<typeof marketRegimeSnapshotSchema>;
