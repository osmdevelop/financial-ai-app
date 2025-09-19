import { apiRequest } from "./queryClient";
import type {
  Portfolio,
  InsertPortfolio,
  PositionWithPrice,
  PortfolioSummary,
  AIInsightResponse,
  PriceData,
  MarketSentiment,
  IntradayData,
  Headline,
  HeadlineImpact,
  UpcomingEarning,
  EarningsHistory,
  EarningsPrediction,
  EconomicEvent,
  EconomicImpact,
  AssetSearchResult,
  AssetSheetData,
  Transaction,
  InsertTransaction,
  ComputedPosition,
  WatchlistItem,
  InsertWatchlistItem,
  // Phase 3 types
  FocusAssetWithDetails,
  InsertFocusAsset,
  EnhancedMarketSentiment,
  SentimentNarrative,
  AssetOverview,
  AssetOverviewSummary,
  MarketRecap,
  MarketRecapSummary,
  HeadlineImpactAnalysis,
  // Today Market Drivers types
  TodayOverview,
  TodayWrapRequest,
  TodayWrapResponse,
  FreshnessMetadata,
  // Events Intelligence types
  EventPrebriefRequest,
  EventPrebriefResponse,
  EventPostmortemRequest,
  EventPostmortemResponse,
  EventTranslateRequest,
  EventTranslateResponse,
  EventStudiesResponse,
  // News types
  NewsStreamResponse,
  NewsImpactAnalysis,
} from "@shared/schema";

export const api = {
  // Portfolio operations
  async getPortfolios(): Promise<Portfolio[]> {
    const res = await apiRequest("GET", "/api/portfolios");
    return res.json();
  },

  async createPortfolio(data: InsertPortfolio): Promise<Portfolio> {
    const res = await apiRequest("POST", "/api/portfolios", data);
    return res.json();
  },

  async archivePortfolio(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest("PUT", `/api/portfolios/${id}/archive`);
    return res.json();
  },

  async deletePortfolio(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await apiRequest("DELETE", `/api/portfolios/${id}`);
    return res.json();
  },

  async getPortfolioDetails(id: string): Promise<{
    portfolio: Portfolio;
    positions: PositionWithPrice[];
    summary: PortfolioSummary;
  }> {
    const res = await apiRequest("GET", `/api/portfolios/${id}`);
    return res.json();
  },

  // Position operations
  async uploadPositions(
    portfolioId: string,
    positions: any[],
  ): Promise<{ success: boolean; positions: any[] }> {
    const res = await apiRequest(
      "POST",
      `/api/portfolios/${portfolioId}/positions/upload`,
      { positions },
    );
    return res.json();
  },

  // Price operations
  async refreshPrices(
    portfolioId: string,
  ): Promise<{ success: boolean; pricesUpdated: number }> {
    const res = await apiRequest("POST", "/api/refresh-prices", {
      portfolioId,
    });
    return res.json();
  },

  async getPortfolioPriceHistory(
    portfolioId: string,
    days: number = 30,
  ): Promise<any[]> {
    const res = await apiRequest(
      "GET",
      `/api/portfolios/${portfolioId}/price-history?days=${days}`,
    );
    return res.json();
  },

  // AI Insights
  async getInsights(text: string): Promise<AIInsightResponse> {
    const res = await apiRequest("POST", "/api/insights/explain", { text });
    return res.json();
  },

  // Market Sentiment
  async getMarketSentiment(): Promise<MarketSentiment> {
    const res = await apiRequest("GET", "/api/sentiment");
    return res.json();
  },

  // Intraday Data
  async getIntradayData(
    symbol: string,
    interval = "1m",
    lookback = "1d",
  ): Promise<IntradayData> {
    const res = await apiRequest(
      "GET",
      `/api/price/intraday?symbol=${symbol}&interval=${interval}&lookback=${lookback}`,
    );
    return res.json();
  },

  // Headlines
  async getHeadlines(symbols?: string, limit = 50): Promise<Headline[]> {
    const params = new URLSearchParams();
    if (symbols) params.set("symbols", symbols);
    params.set("limit", limit.toString());
    const res = await apiRequest("GET", `/api/headlines?${params}`);
    return res.json();
  },

  async analyzeHeadline(
    title: string,
    summary?: string,
    symbols: string[] = [],
  ): Promise<HeadlineImpact> {
    const res = await apiRequest("POST", "/api/headlines/analyze", {
      title,
      summary,
      symbols,
    });
    return res.json();
  },

  // Earnings
  async getUpcomingEarnings(limit = 50): Promise<UpcomingEarning[]> {
    const res = await apiRequest(
      "GET",
      `/api/earnings/upcoming?limit=${limit}`,
    );
    return res.json();
  },

  async getEarningsHistory(symbol: string): Promise<EarningsHistory[]> {
    const res = await apiRequest(
      "GET",
      `/api/earnings/history?symbol=${symbol}`,
    );
    return res.json();
  },

  async predictEarnings(symbol: string): Promise<EarningsPrediction> {
    const res = await apiRequest("POST", "/api/earnings/predict", { symbol });
    return res.json();
  },

  // Economic Calendar
  async getEconomicEvents(days = 7): Promise<EconomicEvent[]> {
    const res = await apiRequest("GET", `/api/econ/upcoming?days=${days}`);
    return res.json();
  },

  async analyzeEconomicEvent(
    event: string,
    previous?: string,
    forecast?: string,
    importance: string = "medium",
  ): Promise<EconomicImpact> {
    const res = await apiRequest("POST", "/api/econ/analyze", {
      event,
      previous,
      forecast,
      importance,
    });
    return res.json();
  },

  // Asset Search
  async searchAssets(
    query: string,
    types?: string[],
    limit = 10,
  ): Promise<AssetSearchResult[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    if (types) params.set("types", types.join(","));
    params.set("limit", limit.toString());
    const res = await apiRequest("GET", `/api/search?${params}`);
    return res.json();
  },

  // Asset Sheet
  async getAssetSheetData(
    symbol: string,
    assetType: string,
  ): Promise<AssetSheetData> {
    const res = await apiRequest(
      "GET",
      `/api/asset/${symbol}?assetType=${assetType}`,
    );
    return res.json();
  },

  // Transactions
  async createTransaction(
    data: InsertTransaction,
  ): Promise<{ transaction: Transaction; position: ComputedPosition | null }> {
    const res = await apiRequest("POST", "/api/transactions", data);
    return res.json();
  },

  async getTransactions(
    portfolioId: string,
    symbol?: string,
  ): Promise<Transaction[]> {
    const params = new URLSearchParams();
    params.set("portfolioId", portfolioId);
    if (symbol) params.set("symbol", symbol);
    const res = await apiRequest("GET", `/api/transactions?${params}`);
    return res.json();
  },

  async updateTransaction(
    id: string,
    data: Partial<InsertTransaction>,
  ): Promise<Transaction> {
    const res = await apiRequest("PATCH", `/api/transactions/${id}`, data);
    return res.json();
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    const res = await apiRequest("DELETE", `/api/transactions/${id}`);
    return res.json();
  },

  // Computed Positions
  async getComputedPositions(portfolioId: string): Promise<ComputedPosition[]> {
    const res = await apiRequest(
      "GET",
      `/api/positions?portfolioId=${portfolioId}`,
    );
    return res.json();
  },

  // Watchlist
  async getWatchlist(): Promise<WatchlistItem[]> {
    const res = await apiRequest("GET", "/api/watchlist");
    return res.json();
  },

  async addToWatchlist(data: InsertWatchlistItem): Promise<WatchlistItem> {
    const res = await apiRequest("POST", "/api/watchlist", data);
    return res.json();
  },

  async removeFromWatchlist(id: string): Promise<{ success: boolean }> {
    const res = await apiRequest("DELETE", `/api/watchlist/${id}`);
    return res.json();
  },

  // Migration
  async migratePositionsToTransactions(): Promise<{
    success: boolean;
    message: string;
  }> {
    const res = await apiRequest("POST", "/api/migrate");
    return res.json();
  },

  // ===== PHASE 3 API METHODS =====

  // Enhanced Sentiment
  async getEnhancedSentiment(): Promise<EnhancedMarketSentiment> {
    const res = await apiRequest("GET", "/api/sentiment/index");
    const response = await res.json();
    // Handle new response format with freshness metadata
    return response.data || response; // Fallback for backwards compatibility
  },

  async getSentimentNarrative(
    indexPayload: EnhancedMarketSentiment,
    contextNote?: string,
  ): Promise<SentimentNarrative> {
    const res = await apiRequest("POST", "/api/sentiment/explain", {
      indexPayload,
      contextNote,
    });
    return res.json();
  },

  // Focus Assets
  async getFocusAssets(portfolioId: string): Promise<FocusAssetWithDetails[]> {
    const res = await apiRequest(
      "GET",
      `/api/focus-assets?portfolioId=${portfolioId}`,
    );
    return res.json();
  },

  async createFocusAsset(
    data: InsertFocusAsset,
  ): Promise<FocusAssetWithDetails> {
    const res = await apiRequest("POST", "/api/focus-assets", data);
    return res.json();
  },

  async deleteFocusAsset(id: string): Promise<{ success: boolean }> {
    const res = await apiRequest("DELETE", `/api/focus-assets/${id}`);
    return res.json();
  },

  async reorderFocusAssets(
    items: { id: string; order: number }[],
  ): Promise<{ success: boolean }> {
    const res = await apiRequest("PATCH", "/api/focus-assets/reorder", {
      items,
    });
    return res.json();
  },

  // Asset Overview
  async getAssetOverview(
    symbol: string,
    assetType: string,
    frames: string[] = ["1h", "1d", "1w", "1m", "3m", "1y"],
  ): Promise<AssetOverview> {
    const res = await apiRequest(
      "GET",
      `/api/asset/overview?symbol=${symbol}&assetType=${assetType}&frames=${frames.join(",")}`,
    );
    return res.json();
  },

  async getAssetOverviewSummary(
    overviewPayload: AssetOverview,
  ): Promise<AssetOverviewSummary> {
    const res = await apiRequest("POST", "/api/asset/overview/explain", {
      overviewPayload,
    });
    return res.json();
  },

  // Market Recap
  async getMarketRecap(): Promise<MarketRecap> {
    const res = await apiRequest("GET", "/api/recap/daily");
    return res.json();
  },

  async getMarketRecapSummary(
    recapPayload: MarketRecap,
  ): Promise<MarketRecapSummary> {
    const res = await apiRequest("POST", "/api/recap/summarize", {
      recapPayload,
    });
    return res.json();
  },

  // Enhanced Headlines
  async getHeadlinesTimeline(
    symbols?: string[],
    scope: "all" | "focus" | "watchlist" = "all",
    limit = 100,
    opts?: { forceReal?: boolean; noCache?: boolean }, // <— add this
  ): Promise<Headline[]> {
    const params = new URLSearchParams();
    if (symbols?.length) params.set("symbols", symbols.join(","));
    params.set("scope", scope);
    params.set("limit", String(limit));
    if (opts?.forceReal) params.set("mock", "0"); // <— tell server: do NOT use mock
    if (opts?.noCache) params.set("_", String(Date.now())); // <— cache buster

    const res = await apiRequest("GET", `/api/headlines/timeline?${params}`);
    const response = await res.json();
    // Server wraps as { data, freshness }, keep BC:
    return response.data || response;
  },

  async analyzeHeadlineImpact(
    title: string,
    summary?: string,
    symbols: string[] = [],
  ): Promise<HeadlineImpactAnalysis> {
    const res = await apiRequest("POST", "/api/headlines/impact", {
      title,
      summary,
      symbols,
    });
    return res.json();
  },

  // Today Market Drivers
  async getTodayOverview(): Promise<{ data: TodayOverview; meta: FreshnessMetadata }> {
    const res = await apiRequest("GET", "/api/today/overview");
    return res.json();
  },

  async generateTodayWrap(request: TodayWrapRequest): Promise<{ data: TodayWrapResponse; meta: FreshnessMetadata }> {
    const res = await apiRequest("POST", "/api/today/wrap", request);
    return res.json();
  },

  // Events Intelligence
  async getEventsUpcoming(days: number = 14): Promise<{ data: any[]; meta: FreshnessMetadata }> {
    const res = await apiRequest("GET", `/api/events/upcoming?days=${days}`);
    return res.json();
  },

  async postEventsPrebrief(request: EventPrebriefRequest): Promise<{ data: EventPrebriefResponse; meta: FreshnessMetadata }> {
    const res = await apiRequest("POST", "/api/events/prebrief", request);
    return res.json();
  },

  async postEventsPostmortem(request: EventPostmortemRequest): Promise<{ data: EventPostmortemResponse; meta: FreshnessMetadata }> {
    const res = await apiRequest("POST", "/api/events/postmortem", request);
    return res.json();
  },

  async getEventsStudies(event: string): Promise<{ data: EventStudiesResponse; meta: FreshnessMetadata }> {
    const res = await apiRequest("GET", `/api/events/studies?event=${encodeURIComponent(event)}`);
    return res.json();
  },

  async postEventsTranslate(request: EventTranslateRequest): Promise<{ data: EventTranslateResponse; meta: FreshnessMetadata }> {
    const res = await apiRequest("POST", "/api/events/translate", request);
    return res.json();
  },

  // MODULE C: Enhanced News & Impact (Real-time Stream)
  async getNewsStream(scope: 'all' | 'focus' | 'watchlist' = 'all', limit: number = 20): Promise<{ data: NewsStreamResponse; meta: FreshnessMetadata }> {
    const params = new URLSearchParams({ scope, limit: limit.toString() });
    const res = await apiRequest("GET", `/api/news/stream?${params}`);
    return res.json();
  },

  async postNewsAnalyze(request: { title: string; summary?: string; symbols?: string[] }): Promise<{ data: NewsImpactAnalysis; meta: FreshnessMetadata }> {
    const res = await apiRequest("POST", "/api/news/analyze", request);
    return res.json();
  },
};
