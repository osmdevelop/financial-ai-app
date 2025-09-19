import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Toggle } from "@/components/ui/toggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Brain,
  Target,
  Check,
  ChevronsUpDown,
  BarChart3,
  PieChart,
  Zap,
  Shield,
  AlertTriangle,
  DollarSign,
  Percent,
  Clock,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type {
  AssetOverviewResponse,
  AssetBriefResponse,
  AssetSearchResult,
} from "@shared/schema";

export default function AssetOverview() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [aibrief, setAiBrief] = useState<AssetBriefResponse | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1d");
  const [showIndicators, setShowIndicators] = useState({
    ma: true,
    rsi: true,
    atr: false,
  });
  const [showStats, setShowStats] = useState(true);

  // Asset search query
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => api.searchAssets(searchQuery),
    enabled: searchQuery.length > 0,
  });

  // Asset overview query - Module D comprehensive data
  const {
    data: overview,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "/api/asset/overview",
      selectedAsset?.symbol,
      selectedAsset?.assetType,
    ],
    queryFn: () =>
      api.getAssetOverview(selectedAsset!.symbol, selectedAsset!.assetType as 'equity' | 'etf' | 'crypto'),
    enabled: !!selectedAsset,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Set default asset
  useEffect(() => {
    if (!selectedAsset) {
      setSelectedAsset({
        id: "1",
        symbol: "AAPL",
        name: "Apple Inc.",
        assetType: "equity",
        exchange: "NASDAQ",
      });
    }
  }, []);

  const handleGenerateBrief = async () => {
    if (!overview) return;

    setLoadingBrief(true);
    try {
      const brief = await api.getAssetBrief(overview);
      setAiBrief(brief);
      toast({
        title: "AI Brief Generated",
        description: `Analysis complete for ${overview.symbol}`,
      });
    } catch (error) {
      console.error("Failed to get AI brief:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not generate AI brief. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingBrief(false);
    }
  };

  const handleCreateAlert = () => {
    if (!selectedAsset || !overview) return;
    
    toast({
      title: "Alert Feature Coming Soon",
      description: `Price alerts for ${overview.symbol} will be available soon.`,
    });
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-600 dark:text-green-400";
    if (change < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4" />;
    if (change < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getRiskLevel = (var95: number) => {
    if (var95 < 2) return { level: "Low", color: "text-green-600", bg: "bg-green-50 dark:bg-green-900/20" };
    if (var95 < 5) return { level: "Medium", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-900/20" };
    if (var95 < 10) return { level: "High", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-900/20" };
    return { level: "Extreme", color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20" };
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Clear AI brief when asset changes
  useEffect(() => {
    setAiBrief(null);
  }, [selectedAsset?.symbol]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Asset Overview 2.0"
        subtitle="Multi-timeframe analysis with technical indicators, risk metrics & AI insights"
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Asset Search Controls */}
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={searchOpen}
                      className="w-full justify-between h-12 text-left"
                      data-testid="button-asset-search"
                    >
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5 text-muted-foreground" />
                        {selectedAsset ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                              {selectedAsset.symbol}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {selectedAsset.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Search stocks, ETFs, crypto...</span>
                        )}
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search assets..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                        data-testid="input-asset-search"
                      />
                      <CommandList>
                        <CommandEmpty>No assets found.</CommandEmpty>
                        <CommandGroup>
                          {searchResults.map((asset) => (
                            <CommandItem
                              key={asset.id}
                              onSelect={() => {
                                setSelectedAsset(asset);
                                setSearchOpen(false);
                              }}
                              data-testid={`item-asset-${asset.symbol}`}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedAsset?.symbol === asset.symbol
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col flex-1">
                                <span className="font-medium">
                                  {asset.symbol}
                                </span>
                                <span className="text-sm text-muted-foreground">
                                  {asset.name}
                                </span>
                                <span className="text-xs text-muted-foreground capitalize">
                                  {asset.assetType}{" "}
                                  {asset.exchange && `• ${asset.exchange}`}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  disabled={!selectedAsset || isLoading}
                  data-testid="button-refresh-data"
                >
                  <Activity className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Refresh
                </Button>
                
                <Button
                  onClick={handleCreateAlert}
                  variant="secondary"
                  disabled={!selectedAsset || !overview}
                  data-testid="button-create-alert"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Alert
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded w-32 mb-4"></div>
                  <div className="h-8 bg-muted rounded w-48"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : overview ? (
          <div className="space-y-6">
            {/* Asset Price Header */}
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-asset-symbol">
                      {overview.symbol}
                    </h1>
                    <p className="text-muted-foreground mb-1" data-testid="text-asset-type">
                      {overview.assetType.toUpperCase()}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Updated: {new Date(overview.freshness?.lastUpdated || new Date()).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm px-3 py-1">
                    {overview.freshness.sourceName}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Current Price</div>
                    <div className="text-3xl font-bold" data-testid="text-current-price">
                      {formatCurrency(overview.currentPrice)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">24h Change</div>
                    <div
                      className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(overview.changePct)}`}
                      data-testid="text-price-change"
                    >
                      {getChangeIcon(overview.changePct)}
                      {formatCurrency(overview.change)} ({formatPercent(overview.changePct / 100)})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Market Status</div>
                    <Badge 
                      variant={overview.freshness.freshness === "realtime" ? "default" : "secondary"}
                      className="text-sm"
                    >
                      {overview.freshness.freshness === "realtime" ? "Live" : "Delayed"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Multi-Timeframe Charts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Multi-Timeframe Analysis
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Toggle
                      pressed={showIndicators.ma}
                      onPressedChange={(pressed) => setShowIndicators(prev => ({ ...prev, ma: pressed }))}
                      size="sm"
                      data-testid="toggle-ma"
                    >
                      MA
                    </Toggle>
                    <Toggle
                      pressed={showIndicators.rsi}
                      onPressedChange={(pressed) => setShowIndicators(prev => ({ ...prev, rsi: pressed }))}
                      size="sm"
                      data-testid="toggle-rsi"
                    >
                      RSI
                    </Toggle>
                    <Toggle
                      pressed={showIndicators.atr}
                      onPressedChange={(pressed) => setShowIndicators(prev => ({ ...prev, atr: pressed }))}
                      size="sm"
                      data-testid="toggle-atr"
                    >
                      ATR
                    </Toggle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={selectedTimeframe}
                  onValueChange={setSelectedTimeframe}
                  className="space-y-4"
                >
                  <TabsList className="grid w-full grid-cols-6">
                    {Object.keys(overview.ohlcData).map((timeframe) => (
                      <TabsTrigger key={timeframe} value={timeframe} data-testid={`tab-${timeframe}`}>
                        {timeframe}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {Object.entries(overview.ohlcData).map(([timeframe, data]) => (
                    <TabsContent key={timeframe} value={timeframe} className="space-y-4">
                      <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">
                            {timeframe} Chart ({data.length} data points)
                          </p>
                          <p className="text-xs">Chart visualization coming soon</p>
                        </div>
                      </div>
                      
                      {/* Technical Indicators */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {showIndicators.ma && (
                          <Card className="p-4" data-testid="card-moving-averages">
                            <div className="text-sm font-medium mb-2">Moving Averages</div>
                            <div className="space-y-1 text-sm">
                              <div data-testid="text-ma10">MA10: {formatCurrency(overview.indicators.ma10 || 0)}</div>
                              <div data-testid="text-ma30">MA30: {formatCurrency(overview.indicators.ma30 || 0)}</div>
                              <div data-testid="text-ma50">MA50: {formatCurrency(overview.indicators.ma50 || 0)}</div>
                            </div>
                          </Card>
                        )}
                        
                        {showIndicators.rsi && (
                          <Card className="p-4" data-testid="card-rsi">
                            <div className="text-sm font-medium mb-2">RSI (14)</div>
                            <div className="text-2xl font-bold mb-1" data-testid="text-rsi">
                              {overview.indicators.rsi14?.toFixed(1) || "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground" data-testid="text-rsi-status">
                              {(overview.indicators.rsi14 || 0) > 70 
                                ? "Overbought" 
                                : (overview.indicators.rsi14 || 0) < 30 
                                ? "Oversold" 
                                : "Neutral"
                              }
                            </div>
                          </Card>
                        )}
                        
                        {showIndicators.atr && (
                          <Card className="p-4" data-testid="card-atr">
                            <div className="text-sm font-medium mb-2">ATR (14)</div>
                            <div className="text-2xl font-bold mb-1" data-testid="text-atr">
                              {formatCurrency(overview.indicators.atr14 || 0)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Volatility measure
                            </div>
                          </Card>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>

            {/* Probabilistic Statistics */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Risk & Probability Analysis
                  </CardTitle>
                  <Toggle
                    pressed={showStats}
                    onPressedChange={setShowStats}
                    data-testid="toggle-stats"
                  >
                    {showStats ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Toggle>
                </div>
              </CardHeader>
              {showStats && (
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* VaR & ES */}
                    <Card className={getRiskLevel(overview.stats.var95).bg} data-testid="card-var95">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Value at Risk (95%)
                        </div>
                        <div className={`text-2xl font-bold mb-1 ${getRiskLevel(overview.stats.var95).color}`} data-testid="text-var95">
                          {overview.stats.var95}%
                        </div>
                        <div className="text-xs text-muted-foreground" data-testid="text-risk-level">
                          {getRiskLevel(overview.stats.var95).level} Risk
                        </div>
                      </CardContent>
                    </Card>

                    <Card data-testid="card-es95">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Expected Shortfall (95%)
                        </div>
                        <div className="text-2xl font-bold mb-1 text-red-600" data-testid="text-es95">
                          {overview.stats.es95}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Avg tail loss
                        </div>
                      </CardContent>
                    </Card>

                    {/* Directional Odds */}
                    <Card data-testid="card-daily-odds">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          Daily Odds
                        </div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-green-600" data-testid="text-odds-up">{overview.stats.odds1d.up}% ↑</span>
                          <span className="text-red-600" data-testid="text-odds-down">{overview.stats.odds1d.down}% ↓</span>
                        </div>
                        <Progress
                          value={overview.stats.odds1d.up}
                          className="h-2"
                          data-testid="progress-daily-odds"
                        />
                      </CardContent>
                    </Card>

                    {/* Upside Probability */}
                    <Card data-testid="card-upside-probability">
                      <CardContent className="p-4">
                        <div className="text-sm font-medium text-muted-foreground mb-2">
                          +3% in 30 Days
                        </div>
                        <div className="text-2xl font-bold mb-1 text-blue-600" data-testid="text-upside-30d">
                          {overview.stats.upside3pct.in30days}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Probability
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Extended Odds Table */}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Multi-Timeframe Directional Odds</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">5-Day</div>
                          <div className="text-sm font-medium">
                            <span className="text-green-600">{overview.stats.odds5d.up}%</span> / 
                            <span className="text-red-600">{overview.stats.odds5d.down}%</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">30-Day</div>
                          <div className="text-sm font-medium">
                            <span className="text-green-600">{overview.stats.odds30d.up}%</span> / 
                            <span className="text-red-600">{overview.stats.odds30d.down}%</span>
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <div className="text-xs text-muted-foreground mb-1">+3% Odds</div>
                          <div className="text-sm font-medium space-y-1">
                            <div>7d: {overview.stats.upside3pct.in7days}%</div>
                            <div>14d: {overview.stats.upside3pct.in14days}%</div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Support & Resistance Levels */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Support & Resistance Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Support Levels */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-green-600">Support Levels</h4>
                    <div className="space-y-2">
                      {overview.supportResistance.support.map((level, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded" data-testid={`support-level-${index}`}>
                          <span className="font-medium" data-testid={`support-price-${index}`}>{formatCurrency(level.level)}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={level.strength * 100} className="w-16 h-2" data-testid={`support-strength-${index}`} />
                            <span className="text-xs text-muted-foreground" data-testid={`support-percentage-${index}`}>{(level.strength * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                      {overview.supportResistance.support.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No significant support levels detected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resistance Levels */}
                  <div>
                    <h4 className="text-sm font-medium mb-3 text-red-600">Resistance Levels</h4>
                    <div className="space-y-2">
                      {overview.supportResistance.resistance.map((level, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded" data-testid={`resistance-level-${index}`}>
                          <span className="font-medium" data-testid={`resistance-price-${index}`}>{formatCurrency(level.level)}</span>
                          <div className="flex items-center gap-2">
                            <Progress value={level.strength * 100} className="w-16 h-2" data-testid={`resistance-strength-${index}`} />
                            <span className="text-xs text-muted-foreground" data-testid={`resistance-percentage-${index}`}>{(level.strength * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      ))}
                      {overview.supportResistance.resistance.length === 0 && (
                        <div className="text-sm text-muted-foreground text-center py-4">
                          No significant resistance levels detected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Brief Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Investment Brief
                  </CardTitle>
                  <Button
                    onClick={handleGenerateBrief}
                    disabled={loadingBrief}
                    size="sm"
                    data-testid="button-generate-brief"
                  >
                    {loadingBrief ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Generate Brief
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aibrief ? (
                  <div className="space-y-6">
                    {/* Bull Case */}
                    <div>
                      <h4 className="font-semibold mb-3 text-green-600 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Bull Case
                      </h4>
                      <div className="space-y-2">
                        {aibrief.bullCase.map((point, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
                          >
                            <DollarSign className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
                            <span className="text-sm">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bear Case */}
                    <div>
                      <h4 className="font-semibold mb-3 text-red-600 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Bear Case
                      </h4>
                      <div className="space-y-2">
                        {aibrief.bearCase.map((point, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
                          >
                            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
                            <span className="text-sm">{point}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Key Risks */}
                    <div>
                      <h4 className="font-semibold mb-3 text-orange-600 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Key Risks
                      </h4>
                      <div className="space-y-2">
                        {aibrief.risks.map((risk, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg"
                          >
                            <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-600 flex-shrink-0" />
                            <span className="text-sm">{risk}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Analysis Confidence */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Analysis Confidence</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={aibrief.confidence} className="w-20 h-2" />
                        <span className={`text-sm font-medium ${getConfidenceColor(aibrief.confidence)}`}>
                          {aibrief.confidence}%
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground border-t pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        Generated: {new Date(aibrief.freshness?.lastUpdated || new Date()).toLocaleString()}
                      </div>
                      <p className="mt-1">{aibrief.freshness?.disclaimer || "This analysis is generated using AI and should not be considered as investment advice."}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">AI Investment Brief</h3>
                    <p className="text-sm mb-4">
                      Get AI-powered bull/bear case analysis with key risks and opportunities
                    </p>
                    <Button onClick={handleGenerateBrief} disabled={loadingBrief}>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Brief
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Catalysts from Module C */}
            {overview.catalysts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Recent Catalysts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {overview.catalysts.map((catalyst, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 border rounded-lg"
                      >
                        <Badge
                          variant={catalyst.impact === "high" ? "destructive" : catalyst.impact === "medium" ? "default" : "secondary"}
                          className="mt-0.5"
                        >
                          {catalyst.impact}
                        </Badge>
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">{catalyst.title}</p>
                          <div className="text-xs text-muted-foreground">
                            {new Date(catalyst.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Asset Selected</h3>
                <p className="text-sm">
                  Enter a symbol and click "Analyze" to get detailed
                  multi-timeframe analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
