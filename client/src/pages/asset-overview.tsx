import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, TrendingUp, TrendingDown, Minus, Activity, Brain, Target } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/constants";
import type { AssetOverview, AssetOverviewSummary } from "@shared/schema";

export default function AssetOverview() {
  const [symbol, setSymbol] = useState("AAPL");
  const [assetType, setAssetType] = useState("equity");
  const [aiSummary, setAiSummary] = useState<AssetOverviewSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ["/api/asset/overview", symbol, assetType],
    queryFn: () => api.getAssetOverview(symbol, assetType),
    enabled: !!symbol && !!assetType,
  });

  const handleAnalyze = async () => {
    if (!overview) return;
    
    setLoadingSummary(true);
    try {
      const summary = await api.getAssetOverviewSummary(overview);
      setAiSummary(summary);
    } catch (error) {
      console.error("Failed to get AI summary:", error);
    } finally {
      setLoadingSummary(false);
    }
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

  const getStanceBadgeColor = (stance: string) => {
    switch (stance) {
      case "Bullish": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "Bearish": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Asset Overview" 
        subtitle="Multi-timeframe analysis with AI-powered insights"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Search Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Enter symbol (e.g., AAPL, BTC)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="pl-10"
              />
            </div>
            <Select value={assetType} onValueChange={setAssetType}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equity">Stock</SelectItem>
                <SelectItem value="etf">ETF</SelectItem>
                <SelectItem value="crypto">Crypto</SelectItem>
                <SelectItem value="commodity">Commodity</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={() => refetch()} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Analyze
          </Button>
        </div>

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
            {/* Asset Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">{overview.symbol}</h1>
                    <p className="text-muted-foreground">{overview.name}</p>
                  </div>
                  <Badge variant="secondary">{overview.assetType}</Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Current Price</div>
                    <div className="text-xl font-semibold">{formatCurrency(overview.price)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">24h Change</div>
                    <div className={`text-xl font-semibold flex items-center gap-1 ${getChangeColor(overview.change24h)}`}>
                      {getChangeIcon(overview.change24h)}
                      {formatPercent(overview.change24h / 100)}
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground mt-4">
                  Updated: {new Date(overview.as_of).toLocaleString()}
                </div>
              </CardContent>
            </Card>

            {/* Multi-Timeframe Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Multi-Timeframe Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overview.frames && Object.keys(overview.frames).length > 0 ? (
                  <Tabs defaultValue={Object.keys(overview.frames)[0]} className="space-y-4">
                    <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Object.keys(overview.frames).length}, 1fr)` }}>
                      {Object.keys(overview.frames).map((timeframe) => (
                        <TabsTrigger key={timeframe} value={timeframe}>
                          {timeframe}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(overview.frames).map(([timeframe, data]) => (
                    <TabsContent key={timeframe} value={timeframe}>
                      <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Performance</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className={`text-2xl font-bold flex items-center gap-2 ${getChangeColor(data.changePct)}`}>
                              {getChangeIcon(data.changePct)}
                              {formatPercent(data.changePct / 100)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {timeframe} timeframe
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Stance</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className={getStanceBadgeColor(data.stance)}>
                                {data.stance}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Confidence: {data.confidence}%
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Key Notes</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm space-y-1">
                              {data.notes.slice(0, 2).map((note, index) => (
                                <div key={index} className="text-muted-foreground">
                                  • {note}
                                </div>
                              ))}
                              {data.notes.length > 2 && (
                                <div className="text-xs text-muted-foreground">
                                  +{data.notes.length - 2} more notes
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p>No timeframe data available for this asset.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Analysis & Summary
                  </CardTitle>
                  <Button 
                    onClick={handleAnalyze} 
                    disabled={loadingSummary}
                    size="sm"
                  >
                    {loadingSummary ? "Analyzing..." : "Generate Analysis"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Headline</h4>
                      <p className="text-lg text-foreground font-medium">
                        {aiSummary.headline}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-3">Key Insights</h4>
                      <div className="space-y-2">
                        {aiSummary.bullets.map((bullet, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                            <Target className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                            <span className="text-sm">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Analysis generated: {new Date(aiSummary.as_of).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p>Click "Generate Analysis" to get AI-powered insights for {symbol}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Asset Selected</h3>
                <p className="text-sm">
                  Enter a symbol and click "Analyze" to get detailed multi-timeframe analysis.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}