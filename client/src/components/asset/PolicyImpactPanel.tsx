import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle, TrendingUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface PolicyImpactPanelProps {
  symbol: string;
  assetName: string;
  className?: string;
}

export function PolicyImpactPanel({ symbol, assetName, className }: PolicyImpactPanelProps) {
  // Fetch Trump Index data for sensitive assets
  const { data: trumpData, isLoading: isTrumpLoading } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    refetchInterval: 5 * 60 * 1000,
  });

  const sensitiveAssets = (trumpData as any)?.sensitiveAssets || [];
  const clusters = (trumpData as any)?.clusters || [];
  const recentNews = (trumpData as any)?.recentNews || [];

  // Find if this asset is policy-sensitive
  const policyData = useMemo(() => {
    const asset = sensitiveAssets.find((a: any) => a.symbol === symbol);
    if (!asset) return null;

    const absCorr = Math.abs(asset.correlation);
    let sensitivity: "High" | "Moderate" | "Low";
    if (absCorr > 0.7) sensitivity = "High";
    else if (absCorr >= 0.5) sensitivity = "Moderate";
    else sensitivity = "Low";

    // Find relevant topics from clusters
    const relevantTopics = clusters
      .filter((cluster: any) => {
        // Check if this asset appears in the cluster's news
        return cluster.topics?.some((topic: string) =>
          topic.toLowerCase().includes(symbol.toLowerCase())
        );
      })
      .flatMap((cluster: any) => cluster.topics || [])
      .filter((topic: string, index: number, self: string[]) => 
        self.indexOf(topic) === index // unique
      )
      .slice(0, 5);

    // Find policy headlines mentioning this asset
    const assetHeadlines = recentNews
      .filter((news: any) => {
        const title = news.title?.toLowerCase() || "";
        const summary = news.summary?.toLowerCase() || "";
        const symbolLower = symbol.toLowerCase();
        const assetNameLower = assetName.toLowerCase();
        return (
          title.includes(symbolLower) ||
          summary.includes(symbolLower) ||
          title.includes(assetNameLower) ||
          summary.includes(assetNameLower)
        );
      })
      .slice(0, 3);

    return {
      asset,
      sensitivity,
      relevantTopics,
      assetHeadlines,
    };
  }, [sensitiveAssets, clusters, recentNews, symbol, assetName]);

  // AI mini-summary
  const aiSummary = useMemo(() => {
    if (!policyData) return null;

    const { sensitivity, asset } = policyData;
    const direction = asset.correlation > 0 ? "positively" : "negatively";
    const changePct = asset.lastChangePct || 0;
    const changeDir = changePct > 0 ? "up" : "down";

    return `This asset historically reacts ${direction} to policy events, with a ${sensitivity.toLowerCase()} sensitivity level (correlation: ${asset.correlation.toFixed(2)}). Recent price movement is ${changeDir} ${Math.abs(changePct).toFixed(1)}%, which may be influenced by current policy tone.`;
  }, [policyData]);

  const getSensitivityBadge = (sensitivity: "High" | "Moderate" | "Low") => {
    const variants = {
      High: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
      Moderate: "bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400",
      Low: "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
    };

    return (
      <Badge variant="outline" className={cn("text-xs font-medium", variants[sensitivity])} data-testid={`badge-sensitivity-${sensitivity.toLowerCase()}`}>
        {sensitivity} Sensitivity
      </Badge>
    );
  };

  if (isTrumpLoading) {
    return (
      <Card className={className} data-testid="policy-impact-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Policy Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Not sensitive
  if (!policyData) {
    return (
      <Card className={className} data-testid="policy-impact-panel">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Policy Impact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            <p>No significant policy sensitivity detected.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="policy-impact-panel">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Policy Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sensitivity Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Sensitivity Level</span>
          {getSensitivityBadge(policyData.sensitivity)}
        </div>

        {/* Correlation */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Policy Correlation</span>
          <div className="flex items-center gap-2">
            <span className={cn(
              "font-medium",
              policyData.asset.correlation > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            )}>
              {policyData.asset.correlation > 0 ? "+" : ""}{(policyData.asset.correlation * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Relevant Topics */}
        {policyData.relevantTopics.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">Relevant Policy Topics</span>
            <div className="flex flex-wrap gap-2">
              {policyData.relevantTopics.map((topic: string, idx: number) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-xs bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400"
                  data-testid={`topic-chip-${idx}`}
                >
                  {topic}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Mini-Summary */}
        {aiSummary && (
          <div className="p-3 bg-muted/50 rounded-lg space-y-2" data-testid="ai-summary">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <TrendingUp className="h-3 w-3" />
              AI Analysis
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aiSummary}
            </p>
          </div>
        )}

        {/* Recent Policy Headlines */}
        {policyData.assetHeadlines.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm font-medium text-foreground">
              Recent Policy News
            </span>
            <div className="space-y-2">
              {policyData.assetHeadlines.map((headline: any, idx: number) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                  data-testid={`policy-headline-${idx}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {headline.title}
                      </p>
                      {headline.source && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {headline.source}
                        </p>
                      )}
                    </div>
                    {headline.url && (
                      <a
                        href={headline.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
