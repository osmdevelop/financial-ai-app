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
import { GaugeMeter } from "@/components/ui/gauge-meter";
import { DollarSign, TrendingUp, Rocket, Activity } from "lucide-react";
import { PolicySnapshotCard } from "@/components/dashboard/PolicySnapshotCard";
import { formatCurrency, formatPercent } from "@/lib/constants";
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
    data: marketSentiment, 
    isLoading: sentimentLoading,
    error: sentimentError,
    refetch: refetchSentiment
  } = useQuery({
    queryKey: ["/api/sentiment/index"],
    queryFn: () => api.getEnhancedSentiment(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  const { 
    data: watchlist,
    error: watchlistError,
    refetch: refetchWatchlist
  } = useQuery({
    queryKey: ["/api/watchlist"],
    queryFn: () => api.getWatchlist(),
  });

  // Generate sample chart data for market indices
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: 4500 + (Math.random() - 0.5) * 200, // Sample S&P 500 data
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Market research and intelligence overview"
      />

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          {/* Market Index Card */}
          <Card data-testid="card-sp500">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      S&P 500
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                      Demo
                    </Badge>
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
          <Card data-testid="card-vix">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      VIX (Volatility)
                    </p>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                      Demo
                    </Badge>
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
          <Card data-testid="card-watchlist">
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
          <Card className="h-full" data-testid="card-sentiment">
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

        {/* Policy Snapshot Card */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <PolicySnapshotCard />
        </div>

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
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                    Demo
                  </Badge>
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
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                  Demo
                </Badge>
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
