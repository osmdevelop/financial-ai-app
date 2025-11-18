import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  RefreshCw, 
  Calendar,
  Building2,
  BarChart3,
  Globe,
  Target,
} from "lucide-react";
import { formatPercent } from "@/lib/constants";
import { format } from "date-fns";
import type { MarketRecap, MarketRecapSummary } from "@shared/schema";

export default function MarketRecap() {
  const [aiSummary, setAiSummary] = useState<MarketRecapSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const queryClient = useQueryClient();

  const { 
    data: recap, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ["/api/recap/daily"],
    queryFn: () => api.getMarketRecap(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const handleGetSummary = async () => {
    if (!recap) return;
    
    setLoadingSummary(true);
    try {
      const summary = await api.getMarketRecapSummary(recap);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Market Recap" 
        subtitle="Daily market summary with sector analysis and AI insights"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {error ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unable to load market recap
              </h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading today's market recap data.
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/recap/daily"] })} 
                variant="outline"
                data-testid="button-retry-recap"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-48"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recap ? (
          <>
            {/* Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {format(new Date(recap.as_of), "EEEE, MMMM do, yyyy")}
                </span>
              </div>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/recap/daily"] })} 
                variant="outline" 
                size="sm"
                data-testid="button-refresh-recap"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="space-y-6">
              {/* Market Indices */}
              <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Major Indices
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {recap.indices.map((index, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-lg">{index.symbol}</h3>
                          <Badge variant="secondary">{index.name}</Badge>
                        </div>
                        <div className={`text-xl font-bold flex items-center gap-1 ${getChangeColor(index.pct)}`}>
                          {getChangeIcon(index.pct)}
                          <span>{formatPercent(index.pct / 100)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sector Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Sector Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recap.sectors
                    .sort((a, b) => b.pct - a.pct)
                    .map((sector, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{sector.name}</div>
                        <div className="text-sm text-muted-foreground">{sector.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getChangeColor(sector.pct)}`}>
                          {formatPercent(sector.pct / 100)}
                        </div>
                      </div>
                      <div className="w-20">
                        <Progress 
                          value={Math.abs(sector.pct) * 10} 
                          className="h-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Sector Performance Chart</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={recap.sectors.sort((a, b) => b.pct - a.pct)}
                        layout="horizontal"
                        margin={{ top: 5, right: 30, left: 60, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          type="number"
                          className="text-xs fill-muted-foreground"
                          tickFormatter={(value) => `${value.toFixed(1)}%`}
                        />
                        <YAxis 
                          type="category"
                          dataKey="symbol"
                          className="text-xs fill-muted-foreground"
                          width={60}
                        />
                        <Bar 
                          dataKey="pct"
                          fill="hsl(var(--primary))"
                          radius={[0, 2, 2, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Movers */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <TrendingUp className="h-5 w-5" />
                    Top Gainers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recap.movers.gainers.slice(0, 5).map((stock, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-xs text-muted-foreground">{stock.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-green-600 font-semibold">
                            +{formatPercent(stock.pct / 100)}
                          </div>
                          {stock.volume && (
                            <div className="text-xs text-muted-foreground">
                              Vol: {stock.volume.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <TrendingDown className="h-5 w-5" />
                    Top Losers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recap.movers.losers.slice(0, 5).map((stock, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-xs text-muted-foreground">{stock.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-red-600 font-semibold">
                            {formatPercent(stock.pct / 100)}
                          </div>
                          {stock.volume && (
                            <div className="text-xs text-muted-foreground">
                              Vol: {stock.volume.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Market Brief
                  </CardTitle>
                  <Button 
                    onClick={handleGetSummary} 
                    disabled={loadingSummary}
                    size="sm"
                  >
                    {loadingSummary ? "Analyzing..." : "Generate Brief"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {aiSummary ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-3">Market Summary</h4>
                      <div className="space-y-2">
                        {aiSummary.bullets.map((bullet, index) => (
                          <div key={index} className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
                            <Target className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                            <span className="text-sm">{bullet}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Tomorrow's Focus</h4>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          {aiSummary.watchTomorrow}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Analysis generated: {new Date(aiSummary.as_of).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                    <p>Click "Generate Brief" to get AI-powered market analysis</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-2">No Market Data</h3>
                <p className="text-sm">
                  Market recap data is currently unavailable. Please try again later.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}