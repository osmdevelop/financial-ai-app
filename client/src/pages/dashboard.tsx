import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import {
  KPICardSkeleton,
  ChartSkeleton,
} from "@/components/ui/loading-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// ✂️ Removed: import { SentimentGauge } from "@/components/ui/sentiment-gauge";
import { FocusAssetsPicker } from "@/components/ui/focus-assets-picker";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Rocket, Activity } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/* CircularRate: simple SVG progress ring for 0..100 scores            */
/* ------------------------------------------------------------------ */
type CircularRateProps = {
  value: number; // 0..100
  size?: number; // px
  stroke?: number; // ring thickness
  showNumber?: boolean; // show number in center
  label?: string; // optional tiny label under number
  className?: string;
};

function clamp100(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
function ringColorClass(v: number) {
  if (v >= 67) return "text-green-500";
  if (v >= 34) return "text-yellow-500";
  return "text-red-500";
}

function CircularRate({
  value,
  size = 64,
  stroke = 8,
  showNumber = true,
  label,
  className = "",
}: CircularRateProps) {
  const v = clamp100(value);
  const c = size / 2;
  const r = c - stroke / 2;
  const C = 2 * Math.PI * r;
  const offset = C * (1 - v / 100);

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-label={`Score ${v} out of 100`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className={ringColorClass(v)}>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.2)"
          strokeWidth={stroke}
        />
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${c} ${c})`}
          shapeRendering="geometricPrecision"
        />
      </svg>

      {showNumber && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-sm font-semibold tabular-nums text-foreground leading-none">
            {Math.round(v)}
          </div>
          {label ? (
            <div className="mt-0.5 text-[10px] text-muted-foreground leading-none">
              {label}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: portfolios } = useQuery({
    queryKey: ["/api/portfolios"],
    queryFn: () => api.getPortfolios(),
  });

  const demoPortfolioId = portfolios?.[0]?.id;

  const { data: portfolioData, isLoading } = useQuery({
    queryKey: ["/api/portfolios", demoPortfolioId],
    queryFn: () => api.getPortfolioDetails(demoPortfolioId!),
    enabled: !!demoPortfolioId,
  });

  const { data: priceHistory } = useQuery({
    queryKey: ["/api/portfolios", demoPortfolioId, "price-history"],
    queryFn: () => api.getPortfolioPriceHistory(demoPortfolioId!, 30),
    enabled: !!demoPortfolioId,
  });

  const { data: marketSentiment, isLoading: sentimentLoading } = useQuery({
    queryKey: ["/api/sentiment/index"],
    queryFn: () => api.getEnhancedSentiment(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Dashboard"
          subtitle="Overview of your portfolio performance"
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        </main>
      </div>
    );
  }

  const summary = portfolioData?.summary;
  const positions = portfolioData?.positions || [];

  // Calculate portfolio composition for pie chart
  const composition = positions.reduce(
    (acc, position) => {
      const type = position.assetType;
      const value = (position.lastPrice || 0) * parseFloat(position.quantity);
      acc[type] = (acc[type] || 0) + value;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalValue = Object.values(composition).reduce(
    (sum, value) => sum + value,
    0,
  );
  const pieData = Object.entries(composition).map(([type, value]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: (value / totalValue) * 100,
    color:
      type === "equity" ? "#1E40AF" : type === "etf" ? "#10B981" : "#8B5CF6",
  }));

  // Generate sample chart data for 30-day performance
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(
      Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: (summary?.totalValue || 120000) + (Math.random() - 0.5) * 10000,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Dashboard"
        subtitle="Overview of your portfolio performance"
        portfolioId={demoPortfolioId}
      />

      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
          {/* Portfolio Value Card */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Portfolio Value
                  </p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground">
                    {formatCurrency(summary?.totalValue || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-primary text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span
                    className={`text-sm font-medium ${(summary?.dailyPnLPercent || 0) >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {formatPercent(summary?.dailyPnLPercent || 0)}
                  </span>
                  <span className="text-muted-foreground text-sm ml-2">
                    vs yesterday
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Last Updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Daily P&L Card */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Daily P&L
                  </p>
                  <p
                    className={`text-3xl font-bold ${(summary?.dailyPnL || 0) >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {(summary?.dailyPnL || 0) >= 0 ? "+" : ""}
                    {formatCurrency(summary?.dailyPnL || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-success text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${(summary?.dailyPnLPercent || 0) >= 0 ? "text-success" : "text-danger"}`}
                >
                  {formatPercent(summary?.dailyPnLPercent || 0)}
                </span>
                <span className="text-muted-foreground text-sm ml-2">
                  {(summary?.dailyPnL || 0) >= 0 ? "gain" : "loss"} today
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Top Mover Card */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Top Mover
                  </p>
                  <p className="text-2xl font-bold text-foreground">
                    {summary?.topMover?.symbol || "N/A"}
                  </p>
                  <p
                    className={`text-lg font-semibold ${(summary?.topMover?.change || 0) >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {summary?.topMover?.change
                      ? `${summary.topMover.change >= 0 ? "+" : ""}${formatCurrency(summary.topMover.change)}`
                      : "No data"}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Rocket className="text-success text-xl" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center">
                  <span
                    className={`text-sm font-medium ${(summary?.topMover?.changePercent || 0) >= 0 ? "text-success" : "text-danger"}`}
                  >
                    {summary?.topMover?.changePercent
                      ? formatPercent(summary.topMover.changePercent)
                      : "0%"}
                  </span>
                  <span className="text-muted-foreground text-sm ml-2">
                    change
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Last Updated: {new Date().toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Market Sentiment Card */}
          <Card className="h-full">
            <CardContent className="p-4 sm:p-6 h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Market Sentiment
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-foreground">
                      {sentimentLoading
                        ? "Loading..."
                        : marketSentiment
                          ? `${marketSentiment.score}/100`
                          : "N/A"}
                    </p>
                    {!sentimentLoading && marketSentiment && (
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
              {!sentimentLoading && marketSentiment ? (
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
                  <CircularRate
                    value={marketSentiment.score}
                    label={marketSentiment.regime}
                    size={72} // a bit smaller to balance height
                    stroke={8}
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

        {/* Focus Assets Section */}
        <div className="mb-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-foreground">
                Focus Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FocusAssetsPicker portfolioId="default" />
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
          {/* Portfolio Performance Chart */}
          <Card>
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-foreground">
                  Portfolio Performance (30d)
                </CardTitle>
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

          {/* Asset Allocation */}
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold text-foreground">
                Asset Allocation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-3">
                {pieData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm text-foreground font-medium">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <Card>
            <CardHeader className="pb-6">
              <CardTitle className="text-lg font-semibold text-foreground">
                Recent Activity
              </CardTitle>
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
                        Portfolio positions updated
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
