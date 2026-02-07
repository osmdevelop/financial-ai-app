import { apiRequest } from "./queryClient";
import type {
  AIInsightResponse,
  PriceData,
  MarketSentiment,
  IntradayData,
  Headline,
  HeadlineImpact,
  UpcomingEarning,
  EarningsHistory,
  EarningsPrediction,
  EarningsTranscriptSummary,
  EconomicEvent,
  EconomicImpact,
  EventImpactStats,
  EventImpactPreviewItem,
  AssetSearchResult,
  AssetSheetData,
  WatchlistItem,
  InsertWatchlistItem,
  FocusAsset,
  InsertFocusAsset,
  // Phase 3 types
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
  // Module D types
  AssetOverviewResponse,
  AssetBriefResponse,
  AssetNarrativeResponse,
  // Module E types
  TrumpIndexResponse,
  FedspeakResponse,
  // Module F types
  MarketRegimeSnapshot,
  CrossAssetRegimeResponse,
  // Options signal lite
  OptionsSignalsResponse,
  // Crypto on-chain decision signals
  OnChainSignalsResponse,
} from "@shared/schema";

export const api = {
  // AI Insights (75s timeout so the button doesn't stay stuck)
  async getInsights(text: string): Promise<AIInsightResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75_000);
    try {
      const res = await apiRequest("POST", "/api/insights/explain", { text }, controller.signal);
      return res.json();
    } finally {
      clearTimeout(timeoutId);
    }
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

  async getEarningsTranscriptSummary(symbol: string): Promise<EarningsTranscriptSummary> {
    const res = await apiRequest("GET", `/api/earnings/transcript-summary?symbol=${encodeURIComponent(symbol)}`);
    return res.json();
  },

  async analyzeEarningsTranscript(request: {
    symbol?: string;
    transcriptText: string;
    date?: string;
  }): Promise<EarningsTranscriptSummary> {
    const res = await apiRequest("POST", "/api/earnings/analyze-transcript", request);
    return res.json();
  },

  async getOptionsSignals(symbol: string): Promise<OptionsSignalsResponse> {
    const res = await apiRequest("GET", `/api/options/signals?symbol=${encodeURIComponent(symbol)}`);
    return res.json();
  },

  async getOnChainSignals(): Promise<OnChainSignalsResponse> {
    const res = await apiRequest("GET", "/api/crypto/onchain-signals");
    return res.json();
  },

  // Economic Calendar
  async getEconomicEvents(days = 7): Promise<{ events: EconomicEvent[]; meta: { isMock: boolean; source: string; lastUpdated: string } }> {
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

  // Market Recap. Returns { data, meta: { isMock } } for Data Mode.
  async getMarketRecap(): Promise<{ data: MarketRecap; meta: { isMock: boolean } }> {
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

  // Event Impact Engine
  async getEventImpact(eventType?: string, horizon: number = 48): Promise<{ stats: EventImpactStats[]; horizon: number }> {
    const params = new URLSearchParams();
    if (eventType) params.set("eventType", eventType);
    params.set("horizon", String(horizon));
    const res = await apiRequest("GET", `/api/events/impact?${params}`);
    return res.json();
  },

  async getEventImpactForAsset(symbol: string, horizon: number = 48): Promise<{ symbol: string; horizon: number; stats: EventImpactStats[] }> {
    const params = new URLSearchParams({ symbol, horizon: String(horizon) });
    const res = await apiRequest("GET", `/api/events/impact/for-asset?${params}`);
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

  async postNewsAnalyze(request: { title: string; summary?: string; symbols?: string[] }): Promise<any> {
    const res = await apiRequest("POST", "/api/news/analyze", request);
    return res.json();
  },

  // MODULE D: Asset Overview 2.0
  async getAssetOverview(symbol: string, assetType: 'equity' | 'etf' | 'crypto'): Promise<AssetOverviewResponse> {
    const params = new URLSearchParams({ symbol, assetType });
    const res = await apiRequest("GET", `/api/asset/overview?${params}`);
    return res.json();
  },

  async getAssetBrief(overviewPayload: AssetOverviewResponse): Promise<AssetBriefResponse> {
    const res = await apiRequest("POST", "/api/asset/brief", { overviewPayload });
    return res.json();
  },

  async getAssetNarrative(
    symbol: string,
    days: number = 7,
    options?: { changePct?: number; period?: string }
  ): Promise<AssetNarrativeResponse> {
    const params = new URLSearchParams({ symbol, days: String(days) });
    if (options?.changePct != null) params.set("changePct", String(options.changePct));
    if (options?.period) params.set("period", options.period);
    const res = await apiRequest("GET", `/api/asset/narrative?${params}`);
    return res.json();
  },

  // MODULE E: Policy & Political Indexes
  async getTrumpIndex(): Promise<TrumpIndexResponse> {
    const res = await apiRequest("GET", "/api/policy/trump-index");
    return res.json();
  },

  async getFedspeak(): Promise<FedspeakResponse> {
    const res = await apiRequest("GET", "/api/policy/fedspeak");
    return res.json();
  },

  async getPolicyNewsIntensity(): Promise<{
    policyNewsIntensity: number;
    policyHeadlineCount: number;
    asOf: string;
  }> {
    const res = await apiRequest("GET", "/api/policy/news-intensity");
    return res.json();
  },

  // MODULE F: Market Regime Engine
  async getMarketRegimeSnapshot(): Promise<MarketRegimeSnapshot> {
    const res = await apiRequest("GET", "/api/regime/snapshot");
    return res.json();
  },

  async getMarketVolatility(days = 30): Promise<{ vix: number | null; spyDailyCloses: number[] | null; asOf: string }> {
    const res = await apiRequest("GET", `/api/market/volatility?days=${days}`);
    return res.json();
  },

  async getCrossAssetRegime(): Promise<CrossAssetRegimeResponse> {
    const res = await apiRequest("GET", "/api/regime/cross-asset");
    return res.json();
  },

  // Focus Assets (Trader Lens)
  async getFocusAssets(): Promise<{ items: FocusAsset[]; max: number }> {
    const res = await apiRequest("GET", "/api/focus-assets");
    return res.json();
  },

  async addFocusAsset(data: InsertFocusAsset): Promise<FocusAsset> {
    const res = await apiRequest("POST", "/api/focus-assets", data);
    return res.json();
  },

  async removeFocusAsset(symbol: string): Promise<{ success: boolean }> {
    const res = await apiRequest("DELETE", `/api/focus-assets/${symbol}`);
    return res.json();
  },
};
