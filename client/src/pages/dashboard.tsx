import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import {
  KPICardSkeleton,
  ChartSkeleton,
} from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GaugeMeter } from "@/components/ui/gauge-meter";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DollarSign, TrendingUp, TrendingDown, Rocket, Activity, RefreshCw, AlertCircle, Minus, ChevronDown, ChevronRight, BarChart2, Layers, Lightbulb, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TodaySubscore } from "@shared/schema";
import { PolicySnapshotCard } from "@/components/dashboard/PolicySnapshotCard";
import { LensSnapshotCard } from "@/components/trader-lens/LensSnapshotCard";
import { useMarketRegimeSnapshot } from "@/hooks/useMarketRegimeSnapshot";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import { useOptionsSignals } from "@/hooks/useOptionsSignals";
import { useOnChainSignals } from "@/hooks/useOnChainSignals";
import { useCrossAssetRegime } from "@/hooks/useCrossAssetRegime";
import { useEvidenceMode } from "@/hooks/useEvidenceMode";
import { computeActionLens, getRequiredMissing, type ActionLensInput } from "@/lib/action-lens";
import { computeVolatilityLevel } from "@/lib/volatility";
import { computePolicyRisk } from "@/lib/policy-risk";
import { useDataModeContext } from "@/components/providers/data-mode-provider";
import { EvidencePanel } from "@/components/evidence";
import type { EvidenceItem, EvidenceMeta } from "@/components/evidence";
import { formatCurrency, formatPercent } from "@/lib/constants";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const {
    snapshot: regimeSnapshot,
    isLoading: regimeLoading,
    error: regimeError,
    refetch: refetchRegime,
    isMock: regimeIsMock,
    isRefetching: regimeRefetching,
  } = useMarketRegimeSnapshot();

  const { 
    data: marketSentiment, 
    isLoading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment
  } = useQuery({
    queryKey: ["/api/sentiment/index"],
    queryFn: () => api.getEnhancedSentiment(),
    refetchInterval: 5 * 60 * 1000,
  });

  const { 
    data: watchlist,
    error: watchlistError,
    refetch: refetchWatchlist
  } = useQuery({
    queryKey: ["/api/watchlist"],
    queryFn: () => api.getWatchlist(),
  });

  const { data: todayOverview, isLoading: todayLoading } = useQuery({
    queryKey: ["/api/today/overview"],
    queryFn: () => api.getTodayOverview(),
    refetchInterval: 5 * 60 * 1000,
  });
  const todayData = todayOverview?.data;
  const todayMeta = todayOverview?.meta;

  const { focusAssets } = useFocusAssets();
  const optionsSymbol = focusAssets[0]?.symbol ?? "SPY";
  const { data: optionsSignals, isLoading: optionsLoading } = useOptionsSignals(optionsSymbol);
  const { data: onChainSignals, isLoading: onChainLoading } = useOnChainSignals();
  const { data: crossAssetRegime, isLoading: crossAssetLoading } = useCrossAssetRegime();

  const { data: trumpIndex } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    queryFn: () => api.getTrumpIndex(),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: fedspeak } = useQuery({
    queryKey: ["/api/policy/fedspeak"],
    queryFn: () => api.getFedspeak(),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: policyNewsData } = useQuery({
    queryKey: ["/api/policy/news-intensity"],
    queryFn: () => api.getPolicyNewsIntensity(),
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: volData } = useQuery({
    queryKey: ["/api/market/volatility"],
    queryFn: () => api.getMarketVolatility(30),
    refetchInterval: 5 * 60 * 1000,
  });

  const { dataMode } = useDataModeContext();

  const volatilityResult = useMemo(
    () =>
      computeVolatilityLevel({
        vix: volData?.vix ?? null,
        spyDailyCloses: volData?.spyDailyCloses ?? null,
        asOf: volData?.asOf ?? null,
      }),
    [volData]
  );

  const policyRiskResult = useMemo(
    () =>
      computePolicyRisk({
        trumpZ: trumpIndex?.zScore ?? null,
        policyNewsIntensity: policyNewsData?.policyNewsIntensity ?? null,
      }),
    [trumpIndex?.zScore, policyNewsData?.policyNewsIntensity]
  );

  const actionLensInput = useMemo((): ActionLensInput => {
    const fedTone =
      fedspeak?.currentTone != null
        ? (fedspeak.currentTone.toLowerCase() as "dovish" | "neutral" | "hawkish")
        : "unknown";
    const missing = getRequiredMissing({
      regime: regimeSnapshot?.regime,
      regimeConfidence: regimeSnapshot?.confidence,
      policyRisk: policyRiskResult.level as ActionLensInput["policyRisk"],
      volatility: { level: volatilityResult.level },
    });
    return {
      regime: regimeSnapshot?.regime,
      regimeConfidence: regimeSnapshot?.confidence,
      policyRisk: policyRiskResult.level as ActionLensInput["policyRisk"],
      fedTone: fedTone as ActionLensInput["fedTone"],
      volatility: {
        level: volatilityResult.level,
        basis: volatilityResult.basis,
        vix: volData?.vix ?? null,
      },
      dataStatus: {
        isMock: !!regimeIsMock,
        isPartial: (regimeSnapshot?.meta?.missingInputs?.length ?? 0) > 0,
        missing: regimeSnapshot?.meta?.missingInputs ?? [],
      },
      dataMode,
      missing: missing.length > 0 ? missing : undefined,
    };
  }, [regimeSnapshot, trumpIndex, fedspeak, regimeIsMock, dataMode, volatilityResult, policyRiskResult, volData]);

  const actionLensResult = useMemo(() => computeActionLens(actionLensInput), [actionLensInput]);
  const { enabled: evidenceEnabled } = useEvidenceMode();

  // Sample chart data only in Demo mode; in Live mode use empty or real data
  const chartData = dataMode === "demo"
    ? Array.from({ length: 30 }, (_, i) => ({
        date: new Date(
          Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
        ).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        value: 4500 + (Math.random() - 0.5) * 200,
      }))
    : [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Institutional-grade market intelligence at a glance"
      />

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        {/* Market Regime Banner */}
        <div className="animate-slide-up stagger-0 mb-4 sm:mb-6">
        <Card data-testid="regime-banner">
          <CardContent className="p-4">
            {regimeLoading && !regimeSnapshot ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            ) : regimeError && !regimeSnapshot ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Failed to load market regime</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRegime()}
                  data-testid="button-retry-regime"
                >
                  Retry
                </Button>
              </div>
            ) : regimeSnapshot ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      Market Regime:
                    </span>
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
                      data-testid="text-regime-label"
                    >
                      {regimeSnapshot.regime}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({regimeSnapshot.confidence}% confidence)
                    </span>
                  </div>
                  {regimeIsMock && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30"
                    >
                      Mock
                    </Badge>
                  )}
                </div>

                <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground flex-1">
                  {regimeSnapshot.drivers.slice(0, 3).map((driver, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <span
                        className={
                          driver.direction === "up"
                            ? "text-green-500"
                            : driver.direction === "down"
                              ? "text-red-500"
                              : "text-muted-foreground"
                        }
                      >
                        {driver.direction === "up"
                          ? "↑"
                          : driver.direction === "down"
                            ? "↓"
                            : "→"}
                      </span>
                      {driver.label}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  <span className="text-xs text-muted-foreground">
                    {new Date(regimeSnapshot.asOf).toLocaleTimeString()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchRegime()}
                    disabled={regimeRefetching}
                    className="h-7 w-7 p-0"
                    data-testid="button-refresh-regime"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${regimeRefetching ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
        </div>

        {/* Action Lens compact widget */}
        <div className="animate-slide-up stagger-1">
        <Card className="mb-4 sm:mb-6" data-testid="action-lens-card">
          <CardContent className="p-3 sm:p-4">
            {regimeLoading && !regimeSnapshot ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 flex-1 max-w-xs" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Action Lens</span>
                  <Badge
                    variant={actionLensResult.posture === "aggressive" ? "default" : actionLensResult.posture === "defensive" ? "destructive" : "secondary"}
                    className="text-[10px] font-normal"
                    data-testid="action-lens-posture"
                  >
                    {actionLensResult.posture.charAt(0).toUpperCase() + actionLensResult.posture.slice(1)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex-1">{actionLensResult.summary}</p>
                <Link href="/daily-brief">
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    Full brief
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
        {evidenceEnabled && !regimeLoading && regimeSnapshot && (
          <EvidencePanel
            title="Action Lens Evidence"
            data-testid="dashboard-evidence-action-lens"
            className="mb-4 sm:mb-6"
            items={[
              { kind: "input", label: "Regime", value: regimeSnapshot ? `${regimeSnapshot.regime} (${regimeSnapshot.confidence}% confidence)` : "Unavailable" },
              { kind: "input", label: "Confidence", value: `${actionLensResult.confidence}%` },
              {
                kind: "input",
                label: "Volatility",
                value:
                  actionLensInput.volatility?.basis === "vix"
                    ? `VIX: ${volData?.vix?.toFixed(1) ?? "—"} (${actionLensInput.volatility?.level ?? "unknown"})`
                    : actionLensInput.volatility?.basis === "realized"
                      ? `Realized Vol (20d): ${volatilityResult.value != null ? (volatilityResult.value * 100).toFixed(1) + "%" : "—"} (${actionLensInput.volatility?.level ?? "unknown"})`
                      : "Volatility unavailable",
              },
              {
                kind: "input",
                label: "Policy risk",
                value:
                  trumpIndex != null && trumpIndex.zScore != null
                    ? `Trump Z: ${trumpIndex.zScore.toFixed(2)} (${actionLensInput.policyRisk})${policyRiskResult.basis.news ? ", News" : ""}`
                    : "Unavailable",
              },
              { kind: "input", label: "Fed tone", value: fedspeak ? `${fedspeak.currentTone} (${actionLensInput.fedTone})` : "Unavailable" },
              { kind: "timestamp", label: "As of", value: volData?.asOf ?? regimeSnapshot?.asOf ? new Date(volData?.asOf ?? regimeSnapshot?.asOf!).toLocaleTimeString() : "N/A" },
            ] as EvidenceItem[]}
            meta={{
              asOf: volData?.asOf ?? regimeSnapshot?.asOf ? new Date(volData?.asOf ?? regimeSnapshot?.asOf!).toLocaleTimeString() : undefined,
              isMock: !!regimeIsMock,
              missingInputs: regimeSnapshot?.meta?.missingInputs ?? [],
              dataStatus: actionLensResult.isDemoContext ? "demo" : actionLensResult.insufficientData ? "partial" : undefined,
            } as EvidenceMeta}
          />
        )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          {/* Market Index Card */}
          <Card data-testid="card-sp500" className="animate-slide-up stagger-2">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      S&P 500
                    </p>
                    {dataMode === "demo" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                        Demo
                      </Badge>
                    )}
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground" data-testid="text-sp500-value">
                    4,850
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-success" data-testid="text-sp500-change">
                    +1.2%
                  </span>
                  <span className="text-muted-foreground text-sm ml-2">
                    vs yesterday
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* VIX Volatility Index Card */}
          <Card data-testid="card-vix" className="animate-slide-up stagger-3">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      VIX (Volatility)
                    </p>
                    {dataMode === "demo" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                        Demo
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold text-warning" data-testid="text-vix-value">
                    18.5
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <Activity className="text-warning text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span className="text-sm font-medium text-muted-foreground">
                  Low volatility
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Watchlist Count Card */}
          <Card data-testid="card-watchlist" className="animate-slide-up stagger-4">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Watchlist Assets
                  </p>
                  <p className="text-2xl font-bold text-foreground" data-testid="text-watchlist-count">
                    {watchlist?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    tracked assets
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Activity className="text-primary text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Market Sentiment Card */}
          <Card className="h-full animate-slide-up stagger-5" data-testid="card-sentiment">
            <CardContent className="p-4 sm:p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Market Sentiment
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-foreground" data-testid="text-sentiment-score">
                      {sentimentLoading
                        ? "Loading..."
                        : sentimentError
                          ? "Error"
                          : marketSentiment
                            ? `${marketSentiment.score}/100`
                            : "N/A"}
                    </p>
                    {!sentimentLoading && !sentimentError && marketSentiment && (
                      <Badge variant="secondary" className="text-xs">
                        {marketSentiment.regime}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Keep the small icon like the other cards */}
                <div className="hidden sm:flex w-12 h-12 bg-primary/10 rounded-lg items-center justify-center">
                  <Activity className="h-5 w-5 text-primary" aria-hidden />
                </div>
              </div>

              {/* Body: details on the left, ring on the right */}
              {sentimentError ? (
                <div className="mt-2 text-center text-sm text-danger" data-testid="error-sentiment">
                  <p>Failed to load sentiment data</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => refetchSentiment()} 
                    className="mt-2 text-xs"
                    data-testid="button-retry-sentiment"
                  >
                    Try Again
                  </Button>
                </div>
              ) : !sentimentLoading && marketSentiment ? (
                <div className="mt-2 flex-1 flex items-center justify-between gap-4">
                  {/* Left: drivers (clamped on small) + updated time */}
                  <div className="text-xs text-muted-foreground w-full">
                    {/* Show drivers only on md+ to keep card compact */}
                    <div className="hidden md:grid grid-cols-2 gap-x-4 gap-y-1">
                      {marketSentiment.drivers?.slice(0, 4).map((d, i) => (
                        <div key={i} className="flex justify-between">
                          <span className="text-muted-foreground">
                            {d.label}:
                          </span>
                          <span className="font-medium text-foreground">
                            {d.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-2">
                      Updated:{" "}
                      {new Date(marketSentiment.as_of).toLocaleTimeString()}
                    </div>
                  </div>

                  {/* Right: circular ring with number inside */}
                  <GaugeMeter
                    value={marketSentiment.score}
                    label={marketSentiment.regime}
                    size={72}
                    strokeWidth={8}
                    colorScale="sentiment"
                    className="shrink-0"
                  />
                </div>
              ) : (
                <div className="mt-auto text-xs text-muted-foreground">
                  Loading sentiment data...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Trader Lens and Policy Snapshot Cards */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6 lg:mb-8 animate-slide-up stagger-6">
          <LensSnapshotCard />
          <PolicySnapshotCard />
        </div>

        {/* Options Signals Lite */}
        <Card className="mb-4 sm:mb-6 lg:mb-8 animate-slide-up stagger-7" data-testid="card-options-signals">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart2 className="h-5 w-5" />
              Options Signals
              <Badge variant="secondary" className="font-normal text-xs">{optionsSymbol}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {optionsLoading && !optionsSignals ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : optionsSignals ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {optionsSignals.signals.map((s, i) => (
                    <Badge key={i} variant="outline" className="font-normal">
                      {s.label}: {s.value}{s.unit ?? ""} {s.percentileOrFlag ? `(${s.percentileOrFlag})` : ""}
                    </Badge>
                  ))}
                </div>
                {optionsSignals.explanation && (
                  <p className="text-sm text-muted-foreground">{optionsSignals.explanation}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  As of {new Date(optionsSignals.as_of).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No options signals for this symbol.</p>
            )}
          </CardContent>
        </Card>

        {/* Crypto on-chain decision signals */}
        <Card className="mb-4 sm:mb-6 lg:mb-8 animate-slide-up stagger-8" data-testid="card-onchain-signals">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5" />
              Crypto on-chain signals
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Decision-oriented: what to watch and what to do (not raw metrics).
            </p>
          </CardHeader>
          <CardContent>
            {onChainLoading && !onChainSignals ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : onChainSignals?.signals?.length ? (
              <div className="space-y-4">
                {onChainSignals.summary && (
                  <p className="text-sm text-foreground">{onChainSignals.summary}</p>
                )}
                <ul className="space-y-3">
                  {onChainSignals.signals.map((s, i) => (
                    <li key={i} className="flex flex-col gap-1 p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={s.severity === "alert" ? "destructive" : s.severity === "warning" ? "default" : "secondary"}
                          className="text-xs font-normal"
                        >
                          {s.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.implication}</p>
                      <p className="text-sm font-medium flex items-center gap-1">
                        <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        {s.suggestedAction}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground">
                  As of {new Date(onChainSignals.as_of).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No on-chain signals available.</p>
            )}
          </CardContent>
        </Card>

        {/* Cross-asset risk gauge */}
        <Card className="mb-4 sm:mb-6 lg:mb-8 animate-slide-up stagger-9" data-testid="card-cross-asset-regime">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gauge className="h-5 w-5" />
              Cross-asset risk gauge
            </CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              Single view of regime across equities, crypto, bonds. AI insight when signals conflict.
            </p>
          </CardHeader>
          <CardContent>
            {crossAssetLoading && !crossAssetRegime ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : crossAssetRegime ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-sm font-medium text-muted-foreground">Equities</span>
                    <Badge
                      variant={
                        crossAssetRegime.equities.regime === "Risk-On"
                          ? "default"
                          : crossAssetRegime.equities.regime === "Risk-Off"
                            ? "destructive"
                            : "secondary"
                      }
                      className="font-normal text-xs"
                    >
                      {crossAssetRegime.equities.regime}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-sm font-medium text-muted-foreground">Crypto</span>
                    <Badge
                      variant={
                        crossAssetRegime.crypto.regime === "Risk-On"
                          ? "default"
                          : crossAssetRegime.crypto.regime === "Risk-Off"
                            ? "destructive"
                            : "secondary"
                      }
                      className="font-normal text-xs"
                    >
                      {crossAssetRegime.crypto.regime}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                    <span className="text-sm font-medium text-muted-foreground">Bonds</span>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          crossAssetRegime.bonds.regime === "Risk-On"
                            ? "default"
                            : crossAssetRegime.bonds.regime === "Risk-Off"
                              ? "destructive"
                              : "secondary"
                        }
                        className="font-normal text-xs"
                      >
                        {crossAssetRegime.bonds.regime}
                      </Badge>
                      {crossAssetRegime.bonds.tightening && (
                        <span className="text-xs text-muted-foreground" title="Tightening">↑</span>
                      )}
                    </div>
                  </div>
                </div>
                {crossAssetRegime.conflict && crossAssetRegime.aiInsight && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10">
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{crossAssetRegime.aiInsight}</p>
                  </div>
                )}
                {crossAssetRegime.conflict && !crossAssetRegime.aiInsight && (
                  <p className="text-xs text-muted-foreground">Markets are internally conflicted; volatility regime possible.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  As of {new Date(crossAssetRegime.as_of).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Cross-asset regime unavailable.</p>
            )}
          </CardContent>
        </Card>

        {/* Market Drivers (from Today) */}
        <Collapsible className="mb-4 sm:mb-6 lg:mb-8">
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg group">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Market Drivers
                  </CardTitle>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-data-[state=open]:rotate-180 transition-transform" />
                </div>
                {todayData && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Overall: <Badge variant="secondary">{todayData.regime}</Badge>
                    {todayMeta?.lastUpdated && (
                      <span className="ml-2">Updated {new Date(todayMeta.lastUpdated).toLocaleTimeString()}</span>
                    )}
                  </p>
                )}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {todayLoading && !todayData ? (
                  <div className="flex gap-4 py-6">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                ) : todayData ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-8 py-4">
                      <GaugeMeter
                        value={todayData.overallIndex}
                        size={120}
                        strokeWidth={10}
                        colorScale="sentiment"
                        showValue={true}
                      />
                      <div className="text-center">
                        <h3 className="text-sm font-medium text-foreground">Market Index</h3>
                        <div className={cn(
                          "flex items-center justify-center gap-1 text-sm font-medium mt-1",
                          todayData.change > 0 ? "text-foreground" : todayData.change < 0 ? "text-muted-foreground" : "text-muted-foreground"
                        )}>
                          {todayData.change > 0 ? <TrendingUp className="w-4 h-4" /> : todayData.change < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                          <span>{todayData.change > 0 ? "+" : ""}{todayData.change}</span> vs yesterday
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {todayData.subscores.map((sub: TodaySubscore, i: number) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-border rounded-md">
                          <div>
                            <h4 className="font-medium text-sm text-foreground">{sub.name}</h4>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>Weight {Math.round((sub.weight || 0) * 100)}%</span>
                              <span className={cn("font-medium", sub.trend === "up" ? "text-foreground" : sub.trend === "down" ? "text-muted-foreground" : "text-muted-foreground")}>
                                {sub.change > 0 ? "+" : ""}{sub.change}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-semibold tabular-nums">{Math.round(sub.score)}</span>
                            <span className="text-xs text-muted-foreground">/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">Market drivers data unavailable.</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Market Index Performance Chart */}
          <Card>
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    S&P 500 Performance (30d)
                  </CardTitle>
                  {dataMode === "demo" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                      Demo
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded-md">
                    30d
                  </button>
                  <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                    90d
                  </button>
                  <button className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground">
                    1y
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      fontSize={12}
                    />
                    <YAxis hide />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#1E40AF"
                      strokeWidth={2}
                      dot={false}
                      fill="rgba(30, 64, 175, 0.1)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Watchlist Preview */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold text-foreground">
                Watchlist Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {watchlist && watchlist.length > 0 ? (
                  watchlist.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">
                          {item.assetType}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {item.symbol}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No assets in watchlist yet
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-6">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Recent Activity
                </CardTitle>
                {dataMode === "demo" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                    Demo
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Price update for AAPL
                      </p>
                      <p className="text-sm text-muted-foreground">
                        2 minutes ago
                      </p>
                    </div>
                  </div>
                  <span className="text-success text-sm font-medium">
                    +2.3%
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                      <Rocket className="text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Market data refreshed
                      </p>
                      <p className="text-sm text-muted-foreground">
                        1 hour ago
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    Completed
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
