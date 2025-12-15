import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { GaugeMeter } from "@/components/ui/gauge-meter";
import { RefreshCw, TrendingUp, TrendingDown, Minus, Activity, FileText } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { TodaySubscore, TodayDriver, TodayOverview } from "@shared/schema";
import { PolicyExposureCard } from "@/components/dashboard/PolicyExposureCard";

// Freshness badge component
interface FreshnessBadgeProps {
  freshness: string;
  lastUpdated: string;
  sourceName?: string;
}

function FreshnessBadge({ freshness, lastUpdated, sourceName }: FreshnessBadgeProps) {
  const getVariant = (freshness: string) => {
    if (freshness === "realtime") return "default";
    if (freshness === "recent") return "secondary";
    return "outline";
  };

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Badge variant={getVariant(freshness)} className="text-xs">
        {freshness}
      </Badge>
      {sourceName && <span>• {sourceName}</span>}
      <span>• Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
    </div>
  );
}

// Subscore component
interface SubscoreItemProps {
  subscore: TodaySubscore;
}

function SubscoreItem({ subscore }: SubscoreItemProps) {
  const { name, score, weight, change, trend } = subscore;
  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === "down") return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "text-green-500";
    if (trend === "down") return "text-red-500";
    return "text-muted-foreground";
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-foreground">{name}</h4>
          {getTrendIcon(trend)}
        </div>
        <div className="flex items-center gap-4 mt-1">
          <span className="text-sm text-muted-foreground">
            Weight: {Math.round(weight * 100)}%
          </span>
          <span className={cn("text-sm font-medium", getTrendColor(trend))}>
            {change > 0 ? "+" : ""}{change}
          </span>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-foreground tabular-nums">
          {Math.round(score)}
        </div>
        <div className="text-xs text-muted-foreground">
          /100
        </div>
      </div>
    </div>
  );
}

export default function Today() {
  const [contextNote, setContextNote] = useState("");
  const [showWrapForm, setShowWrapForm] = useState(false);
  const { toast } = useToast();

  // Fetch today's market overview
  const { data: todayOverview, isLoading, error } = useQuery({
    queryKey: ["/api/today/overview"],
    queryFn: () => api.getTodayOverview(),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  // Generate market wrap
  const generateWrapMutation = useMutation({
    mutationFn: (contextNote: string) => api.generateTodayWrap({ contextNote }),
    onSuccess: () => {
      toast({
        title: "Market wrap generated",
        description: "Your personalized market analysis is ready.",
      });
      setContextNote("");
      setShowWrapForm(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to generate wrap",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Manual refresh handler
  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/today/overview"] });
    toast({
      title: "Refreshing market data",
      description: "Fetching the latest market drivers...",
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Market Drivers"
          subtitle="Real-time market sentiment and key drivers"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
              <div className="h-32 bg-muted rounded-lg"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !todayOverview?.data) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Market Drivers"
          subtitle="Real-time market sentiment and key drivers"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Unable to load market data
              </h3>
              <p className="text-muted-foreground mb-4">
                There was an error loading today's market overview.
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try again
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const data = todayOverview.data;
  const meta = todayOverview.meta;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Market Drivers"
        subtitle="Real-time market sentiment and key drivers"
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Refresh Controls */}
        <div className="flex justify-end">
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            data-testid="button-refresh"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Market Data
          </Button>
        </div>

        {/* Market Overview Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Today's Market Overview
                </h2>
                <div className="text-muted-foreground">
                  Overall sentiment: <Badge variant="secondary" data-testid="badge-regime">{data.regime}</Badge>
                </div>
              </div>
              <FreshnessBadge 
                freshness={meta.freshness}
                lastUpdated={meta.lastUpdated}
                sourceName={meta.sourceName}
              />
            </div>

            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <GaugeMeter 
                  value={data.overallIndex} 
                  size={150}
                  strokeWidth={12}
                  colorScale="sentiment"
                  showValue={true}
                />
                <div className="mt-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Market Index
                  </h3>
                  <div className={cn(
                    "flex items-center justify-center gap-1 text-sm font-medium",
                    data.change > 0 ? "text-green-500" : 
                    data.change < 0 ? "text-red-500" : "text-muted-foreground"
                  )}>
                    {data.change > 0 ? <TrendingUp className="w-4 h-4" /> : 
                     data.change < 0 ? <TrendingDown className="w-4 h-4" /> : 
                     <Minus className="w-4 h-4" />}
                    <span data-testid="text-change">{data.change > 0 ? "+" : ""}{data.change}</span> from yesterday
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Market Components
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.subscores.map((subscore, index) => (
              <SubscoreItem
                key={index}
                subscore={subscore}
              />
            ))}
          </CardContent>
        </Card>

        {/* Policy Exposure Card */}
        <PolicyExposureCard 
          holdings={[
            { symbol: "FXI", quantity: 100, value: 3200 },
            { symbol: "ITA", quantity: 50, value: 5100 },
            { symbol: "UUP", quantity: 200, value: 4800 },
            { symbol: "SPY", quantity: 25, value: 11750 },
            { symbol: "AAPL", quantity: 30, value: 5400 },
          ]}
        />

        {/* Key Drivers */}
        {data.drivers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Key Market Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.drivers.map((driver, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-foreground">{driver.label}</h4>
                      <span className="text-sm text-muted-foreground">
                        {driver.contribution}% impact
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{driver.note}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Wrap Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                AI Market Wrap
              </CardTitle>
              <Button
                onClick={() => setShowWrapForm(!showWrapForm)}
                variant="outline"
                size="sm"
                data-testid="button-generate-wrap"
              >
                Generate Wrap
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showWrapForm && (
              <div className="space-y-4 mb-6 p-4 bg-muted/20 rounded-lg">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Additional Context (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any specific context or focus areas for the market wrap..."
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    className="mt-1"
                    data-testid="input-context-note"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    onClick={() => setShowWrapForm(false)}
                    variant="ghost"
                    size="sm"
                    data-testid="button-cancel-wrap"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => generateWrapMutation.mutate(contextNote)}
                    disabled={generateWrapMutation.isPending}
                    size="sm"
                    data-testid="button-submit-wrap"
                  >
                    {generateWrapMutation.isPending ? "Generating..." : "Generate"}
                  </Button>
                </div>
              </div>
            )}
            
            {generateWrapMutation.data?.data && (
              <div className="space-y-4">
                <Separator />
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Market Summary</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {generateWrapMutation.data.data.summary}
                  </p>
                </div>
                
                {generateWrapMutation.data.data.keyHighlights?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3">Key Highlights</h4>
                    <ul className="space-y-1">
                      {generateWrapMutation.data.data.keyHighlights.map((highlight: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <span className="text-primary mt-1">•</span>
                          <span>{highlight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground italic">
                    {generateWrapMutation.data.data.disclaimer}
                  </p>
                  <FreshnessBadge 
                    freshness={generateWrapMutation.data.meta?.freshness || "recent"}
                    lastUpdated={generateWrapMutation.data.meta?.lastUpdated || generateWrapMutation.data.data.as_of}
                    sourceName={generateWrapMutation.data.meta?.sourceName}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}