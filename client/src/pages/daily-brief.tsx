import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMarketRegimeSnapshot } from "@/hooks/useMarketRegimeSnapshot";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import { useTraderLensContext } from "@/hooks/useTraderLensContext";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Clock,
  Shield,
  Activity,
  Zap,
  BarChart3,
  Calendar,
  FileText,
  ArrowRight,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
  Target,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface DailySummaryResponse {
  summary: string[];
  generatedAt: string;
}

interface MarketDriver {
  driver: string;
  direction: "bullish" | "bearish" | "neutral";
  confidence: "high" | "medium" | "low";
}

export default function DailyBrief() {
  const [lensMode, setLensMode] = useState(false);
  const { focusAssets } = useFocusAssets();
  const lensContext = useTraderLensContext();
  const focusSymbols = focusAssets.map(a => a.symbol);

  const {
    snapshot: regimeSnapshot,
    isLoading: regimeLoading,
    error: regimeError,
    refetch: refetchRegime,
    isMock: regimeIsMock,
    summary: regimeSummary,
    isRefetching: regimeRefetching,
  } = useMarketRegimeSnapshot();

  // Fetch sentiment data for Market Regime and Volatility
  const {
    data: sentiment,
    isLoading: sentimentLoading,
    error: sentimentError,
  } = useQuery({
    queryKey: ["/api/sentiment/index"],
    queryFn: () => api.getEnhancedSentiment(),
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch policy data for Policy Risk Level
  const {
    data: trumpIndex,
    isLoading: policyLoading,
    error: policyError,
  } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    queryFn: () => api.getTrumpIndex(),
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch Fedspeak data for Fed Tone
  const {
    data: fedspeak,
    isLoading: fedLoading,
    error: fedError,
  } = useQuery({
    queryKey: ["/api/policy/fedspeak"],
    queryFn: () => api.getFedspeak(),
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch headlines for market drivers - respect Lens Mode
  const {
    data: headlines,
    isLoading: headlinesLoading,
    error: headlinesError,
  } = useQuery({
    queryKey: ["/api/headlines/timeline", lensMode ? "lens" : "all", focusSymbols],
    queryFn: () => api.getHeadlinesTimeline(
      lensMode && focusSymbols.length > 0 ? focusSymbols : undefined,
      lensMode && focusSymbols.length > 0 ? "focus" : "all",
      20
    ),
    refetchInterval: 5 * 60 * 1000,
  });

  // Fetch economic events
  const {
    data: econEvents,
    isLoading: econLoading,
    error: econError,
  } = useQuery({
    queryKey: ["/api/econ/upcoming"],
    queryFn: () => api.getEconomicEvents(7),
    refetchInterval: 10 * 60 * 1000,
  });

  // Fetch upcoming earnings
  const {
    data: earnings,
    isLoading: earningsLoading,
    error: earningsError,
  } = useQuery({
    queryKey: ["/api/earnings/upcoming"],
    queryFn: () => api.getUpcomingEarnings(10),
    refetchInterval: 10 * 60 * 1000,
  });

  // Fetch AI daily summary
  const {
    data: aiSummary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["/api/daily-brief/summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/daily-brief/summary");
      return res.json() as Promise<DailySummaryResponse>;
    },
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });

  const summaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-brief/generate");
      return res.json();
    },
    onSuccess: () => {
      refetchSummary();
    },
  });

  // Filter headlines for focus assets when in Lens Mode
  const filteredHeadlines = lensMode && focusSymbols.length > 0
    ? (headlines || []).filter((h: any) => {
        if (!h.symbols) return false;
        return h.symbols.some((s: string) =>
          focusSymbols.some(fs => 
            s.toLowerCase().includes(fs.toLowerCase()) || 
            fs.toLowerCase().includes(s.toLowerCase())
          )
        );
      })
    : headlines || [];

  // Derive market drivers from headlines (respects Lens Mode via filteredHeadlines)
  const marketDrivers: MarketDriver[] = filteredHeadlines.slice(0, 5).map((h: any) => ({
    driver: h.title?.substring(0, 80) + (h.title?.length > 80 ? "..." : "") || "Market News",
    direction: h.impactDirection === "up" ? "bullish" : h.impactDirection === "down" ? "bearish" : "neutral",
    confidence: h.impactConfidence && h.impactConfidence > 0.7 ? "high" : h.impactConfidence && h.impactConfidence > 0.4 ? "medium" : "low",
  }));

  // Derive bias from regime
  const getRegimeBias = () => {
    if (sentiment?.regime === "Risk-On") return "up";
    if (sentiment?.regime === "Risk-Off") return "down";
    return "neutral";
  };

  // Derive policy risk level from z-score
  const getPolicyRiskLevel = () => {
    if (!trumpIndex?.zScore) return "N/A";
    const z = trumpIndex.zScore;
    if (z > 1.5) return "High";
    if (z > 0.5) return "Medium";
    if (z > -0.5) return "Low";
    return "None";
  };

  // Define asset impact data - default market assets
  const defaultAssetImpact = [
    { symbol: "SPY", name: "S&P 500 ETF", bias: getRegimeBias(), driver: "Sentiment index", risk: "medium" },
    { symbol: "QQQ", name: "Nasdaq 100 ETF", bias: getRegimeBias(), driver: "Tech sentiment", risk: "medium" },
    { symbol: "IWM", name: "Russell 2000 ETF", bias: sentiment?.score && sentiment.score > 50 ? "up" : "neutral", driver: "Risk appetite", risk: "high" },
    { symbol: "BTC", name: "Bitcoin", bias: "neutral", driver: "Crypto flows", risk: "high" },
    { symbol: "GLD", name: "Gold", bias: fedspeak?.currentTone === "dovish" ? "up" : "neutral", driver: "Fed policy", risk: "low" },
    { symbol: "USO", name: "Oil", bias: "neutral", driver: "Supply/demand", risk: "medium" },
    { symbol: "UUP", name: "US Dollar", bias: fedspeak?.currentTone === "hawkish" ? "up" : "neutral", driver: "Rate expectations", risk: "medium" },
    { symbol: "TNX", name: "10Y Treasury", bias: fedspeak?.currentTone === "hawkish" ? "up" : "down", driver: "Rate expectations", risk: "medium" },
  ];

  // Lens Mode: Show focus assets instead of defaults
  const assetImpact = lensMode && focusAssets.length > 0
    ? focusAssets.map(asset => ({
        symbol: asset.symbol,
        name: asset.displayName || asset.symbol,
        bias: getRegimeBias(),
        driver: `Regime: ${regimeSnapshot?.regime || "Unknown"}`,
        risk: "medium" as const,
      }))
    : defaultAssetImpact;

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case "bullish":
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case "bearish":
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return (
      <Badge variant={variants[confidence] || "outline"} className="text-xs">
        {confidence}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const colors: Record<string, string> = {
      high: "bg-red-500/10 text-red-500 border-red-500/20",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      low: "bg-green-500/10 text-green-500 border-green-500/20",
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[risk] || ""}`}>
        {risk}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Daily Market Brief"
        subtitle="AI-generated market overview synthesizing policy, sentiment, and macro context"
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        {/* Lens Toggle */}
        {focusSymbols.length > 0 && (
          <div className="flex items-center gap-3" data-testid="lens-toggle-container">
            <Button
              variant={lensMode ? "default" : "outline"}
              size="sm"
              onClick={() => setLensMode(!lensMode)}
              className="gap-2"
              data-testid="toggle-lens-mode"
            >
              <Target className="h-4 w-4" />
              {lensMode ? "Lens Mode On" : "Enable Lens Mode"}
            </Button>
            {lensMode && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Focusing on:</span>
                {focusSymbols.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Lens Context Card (when Lens Mode is on) */}
        {lensMode && (
          <Card className="bg-primary/5 border-primary/20" data-testid="lens-context-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Trader Lens Context</span>
                <Badge 
                  variant="outline" 
                  className={
                    lensContext.shouldTradeToday.level === "Green" 
                      ? "bg-green-500/10 text-green-600 border-green-500/30"
                      : lensContext.shouldTradeToday.level === "Red"
                        ? "bg-red-500/10 text-red-600 border-red-500/30"
                        : "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
                  }
                  data-testid="lens-trade-badge"
                >
                  Trade Today: {lensContext.shouldTradeToday.level}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{lensContext.shouldTradeToday.reason}</p>
              {lensContext.relevantDrivers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {lensContext.relevantDrivers.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Informational Banner */}
        <Alert data-testid="alert-disclaimer">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            This is an informational summary for research purposes only. It does not constitute investment advice, 
            recommendations, or predictions. Always conduct your own research.
          </AlertDescription>
        </Alert>

        {/* Regime Context Strip */}
        <Card className="bg-muted/30" data-testid="regime-context-strip">
          <CardContent className="p-4">
            {regimeLoading && !regimeSnapshot ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : regimeError && !regimeSnapshot ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Failed to load regime context</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRegime()}
                  data-testid="button-retry-regime-brief"
                >
                  Retry
                </Button>
              </div>
            ) : regimeSnapshot ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Regime Context:</span>
                  <Badge
                    variant={
                      regimeSnapshot.regime === "Risk-On"
                        ? "default"
                        : regimeSnapshot.regime === "Risk-Off"
                          ? "destructive"
                          : regimeSnapshot.regime === "Policy Shock"
                            ? "secondary"
                            : "outline"
                    }
                    className="font-semibold"
                  >
                    {regimeSnapshot.regime}
                  </Badge>
                  {regimeIsMock && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30"
                    >
                      Mock
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground flex-1">{regimeSummary}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRegime()}
                  disabled={regimeRefetching}
                  className="h-7 w-7 p-0 shrink-0"
                  data-testid="button-refresh-regime-brief"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${regimeRefetching ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Section 1: Today at a Glance */}
        <section data-testid="section-at-a-glance">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Today at a Glance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Market Regime Card */}
            <Card data-testid="card-market-regime">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Market Regime</p>
                    {sentimentLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : sentimentError ? (
                      <p className="text-sm text-destructive">Error loading</p>
                    ) : (
                      <p className="text-xl font-bold" data-testid="text-market-regime">
                        {sentiment?.regime || "N/A"}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {sentiment?.as_of ? formatTimestamp(sentiment.as_of) : "Live"}
                </p>
              </CardContent>
            </Card>

            {/* Policy Risk Level Card */}
            <Card data-testid="card-policy-risk">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Policy Risk</p>
                    {policyLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : policyError ? (
                      <p className="text-sm text-destructive">Error loading</p>
                    ) : (
                      <p className="text-xl font-bold" data-testid="text-policy-risk">
                        {getPolicyRiskLevel()}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-orange-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {trumpIndex?.lastUpdated ? formatTimestamp(trumpIndex.lastUpdated) : "Live"}
                </p>
              </CardContent>
            </Card>

            {/* Fed Tone Card */}
            <Card data-testid="card-fed-tone">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Fed Tone</p>
                    {fedLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : fedError ? (
                      <p className="text-sm text-destructive">Error loading</p>
                    ) : (
                      <p className="text-xl font-bold capitalize" data-testid="text-fed-tone">
                        {fedspeak?.currentTone || "N/A"}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <Activity className="w-5 h-5 text-blue-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {fedspeak?.lastUpdated ? formatTimestamp(fedspeak.lastUpdated) : "Live"}
                </p>
              </CardContent>
            </Card>

            {/* Volatility State Card */}
            <Card data-testid="card-volatility">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Volatility State</p>
                    {sentimentLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : sentimentError ? (
                      <p className="text-sm text-destructive">Error loading</p>
                    ) : (
                      <p className="text-xl font-bold" data-testid="text-volatility">
                        {sentiment?.score !== undefined
                          ? sentiment.score > 60
                            ? "Low Vol"
                            : sentiment.score > 40
                              ? "Normal"
                              : "Elevated"
                          : "N/A"}
                      </p>
                    )}
                  </div>
                  <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-purple-500" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Score: {sentiment?.score ?? "N/A"}/100
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Section 2: What Moved Markets Today */}
        <section data-testid="section-market-drivers">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            What Moved Markets Today
          </h2>
          <Card>
            <CardContent className="p-4">
              {headlinesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : headlinesError ? (
                <p className="text-sm text-destructive">Failed to load market drivers</p>
              ) : marketDrivers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No significant market drivers identified today.</p>
              ) : (
                <ul className="space-y-3">
                  {marketDrivers.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`driver-item-${idx}`}
                    >
                      <div className="mt-0.5">{getDirectionIcon(item.direction)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.driver}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={item.direction === "bullish" ? "default" : item.direction === "bearish" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {item.direction}
                          </Badge>
                          {getConfidenceBadge(item.confidence)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Asset Impact Snapshot */}
        <section data-testid="section-asset-impact">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Asset Impact Snapshot
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 font-medium text-muted-foreground">Asset</th>
                      <th className="text-center p-4 font-medium text-muted-foreground">Bias</th>
                      <th className="text-left p-4 font-medium text-muted-foreground">Primary Driver</th>
                      <th className="text-center p-4 font-medium text-muted-foreground">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assetImpact.map((asset) => (
                      <tr
                        key={asset.symbol}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                        data-testid={`asset-row-${asset.symbol}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{asset.symbol}</span>
                            <span className="text-muted-foreground text-xs">{asset.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getDirectionIcon(asset.bias)}
                            <span className="capitalize text-xs">{asset.bias}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{asset.driver}</td>
                        <td className="p-4 text-center">{getRiskBadge(asset.risk)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 4: AI Daily Summary */}
        <section data-testid="section-ai-summary">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              AI Daily Summary
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => summaryMutation.mutate()}
              disabled={summaryMutation.isPending}
              data-testid="button-refresh-summary"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${summaryMutation.isPending ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-6">
              {summaryLoading || summaryMutation.isPending ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : summaryError ? (
                <div className="text-center py-6">
                  <AlertTriangle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">Unable to generate AI summary at this time.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => summaryMutation.mutate()}
                    data-testid="button-retry-summary"
                  >
                    Try Again
                  </Button>
                </div>
              ) : aiSummary?.summary?.length ? (
                <div className="space-y-4">
                  {aiSummary.summary.map((sentence, idx) => (
                    <div key={idx} className="flex items-start gap-3" data-testid={`summary-sentence-${idx}`}>
                      <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm leading-relaxed">{sentence}</p>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    Generated {aiSummary.generatedAt ? formatTimestamp(aiSummary.generatedAt) : "recently"}
                  </p>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">No summary available. Click refresh to generate.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => summaryMutation.mutate()}
                    data-testid="button-generate-summary"
                  >
                    Generate Summary
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Section 5: What to Watch Next */}
        <section data-testid="section-watch-next">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            What to Watch Next
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Economic Events */}
            <Card data-testid="card-upcoming-economic">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Upcoming Economic Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {econLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : econError ? (
                  <p className="text-sm text-muted-foreground">Unable to load events</p>
                ) : econEvents?.length ? (
                  <ul className="space-y-2">
                    {econEvents.slice(0, 5).map((event: any, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                        data-testid={`econ-event-${idx}`}
                      >
                        <span className="truncate flex-1">{event.event}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {event.importance || "medium"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                )}
              </CardContent>
            </Card>

            {/* Earnings */}
            <Card data-testid="card-upcoming-earnings">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Upcoming Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {earningsLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : earningsError ? (
                  <p className="text-sm text-muted-foreground">Unable to load earnings</p>
                ) : earnings?.length ? (
                  <ul className="space-y-2">
                    {earnings.slice(0, 5).map((earning: any, idx: number) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                        data-testid={`earnings-item-${idx}`}
                      >
                        <span className="font-medium">{earning.symbol}</span>
                        <span className="text-muted-foreground text-xs">
                          {earning.reportDate || earning.date || "TBD"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming earnings</p>
                )}
              </CardContent>
            </Card>

            {/* Policy Risks */}
            <Card data-testid="card-policy-risks">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Policy Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {policyLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : policyError ? (
                  <p className="text-sm text-muted-foreground">Unable to load policy risks</p>
                ) : trumpIndex?.recentNews?.length ? (
                  <ul className="space-y-2">
                    {trumpIndex.recentNews.slice(0, 4).map((news, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                        data-testid={`policy-risk-${idx}`}
                      >
                        <span className="truncate flex-1 mr-2">{news.title}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full"
                              style={{ width: `${news.intensity * 100}%` }}
                            />
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No active policy risks</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
