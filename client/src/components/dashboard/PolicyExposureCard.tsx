import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PolicyExposureCardProps {
  holdings?: Array<{ symbol: string; quantity: number; value: number }>;
  className?: string;
}

export function PolicyExposureCard({ holdings = [], className }: PolicyExposureCardProps) {
  // Fetch Trump Index data for sensitive assets
  const { data: trumpData } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    refetchInterval: 5 * 60 * 1000,
  });

  const sensitiveAssets = (trumpData as any)?.sensitiveAssets || [];

  // Calculate exposure metrics
  const exposureMetrics = useMemo(() => {
    if (holdings.length === 0) {
      return {
        totalHoldings: 0,
        sensitiveCount: 0,
        sensitivePercent: 0,
        highCount: 0,
        moderateCount: 0,
        lowCount: 0,
        topSensitive: [],
      };
    }

    const holdingSymbols = new Set(holdings.map((h) => h.symbol));
    const sensitiveHoldings = sensitiveAssets.filter((asset: any) =>
      holdingSymbols.has(asset.symbol)
    );

    // Categorize by sensitivity (using correlation as proxy)
    const high = sensitiveHoldings.filter((a: any) => Math.abs(a.correlation) > 0.7);
    const moderate = sensitiveHoldings.filter(
      (a: any) => Math.abs(a.correlation) >= 0.5 && Math.abs(a.correlation) <= 0.7
    );
    const low = sensitiveHoldings.filter((a: any) => Math.abs(a.correlation) < 0.5);

    return {
      totalHoldings: holdings.length,
      sensitiveCount: sensitiveHoldings.length,
      sensitivePercent:
        holdings.length > 0 ? (sensitiveHoldings.length / holdings.length) * 100 : 0,
      highCount: high.length,
      moderateCount: moderate.length,
      lowCount: low.length,
      topSensitive: sensitiveHoldings
        .sort((a: any, b: any) => Math.abs(b.correlation) - Math.abs(a.correlation))
        .slice(0, 3),
    };
  }, [holdings, sensitiveAssets]);

  const getSensitivityBadge = (correlation: number) => {
    const absCorr = Math.abs(correlation);
    if (absCorr > 0.7) {
      return (
        <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400 text-xs">
          High
        </Badge>
      );
    }
    if (absCorr >= 0.5) {
      return (
        <Badge variant="outline" className="bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-400 text-xs">
          Moderate
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400 text-xs">
        Low
        </Badge>
    );
  };

  // If no holdings, show a simple message
  if (exposureMetrics.totalHoldings === 0) {
    return (
      <Card className={className} data-testid="policy-exposure-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Policy Exposure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No portfolio holdings to analyze. Add positions to see policy exposure.
          </p>
        </CardContent>
      </Card>
    );
  }

  // If zero exposure
  if (exposureMetrics.sensitiveCount === 0) {
    return (
      <Card className={className} data-testid="policy-exposure-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Policy Exposure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Shield className="h-5 w-5" />
            <p className="text-sm font-medium">
              Your portfolio currently has low policy sensitivity.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} data-testid="policy-exposure-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Policy Exposure
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exposure Summary */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Policy-Sensitive Assets</span>
            <span className="text-sm font-semibold">
              {exposureMetrics.sensitiveCount} of {exposureMetrics.totalHoldings} (
              {Math.round(exposureMetrics.sensitivePercent)}%)
            </span>
          </div>

          {/* Sensitivity Breakdown */}
          <div className="flex gap-2 text-xs">
            {exposureMetrics.highCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-red-600 dark:text-red-400">
                  {exposureMetrics.highCount} High
                </span>
              </div>
            )}
            {exposureMetrics.moderateCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {exposureMetrics.moderateCount} Moderate
                </span>
              </div>
            )}
            {exposureMetrics.lowCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="font-medium text-green-600 dark:text-green-400">
                  {exposureMetrics.lowCount} Low
                </span>
              </div>
            )}
          </div>

          {/* Visual Bar */}
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
            {exposureMetrics.highCount > 0 && (
              <div
                className="bg-red-500"
                style={{
                  width: `${(exposureMetrics.highCount / exposureMetrics.sensitiveCount) * 100}%`,
                }}
              />
            )}
            {exposureMetrics.moderateCount > 0 && (
              <div
                className="bg-orange-500"
                style={{
                  width: `${(exposureMetrics.moderateCount / exposureMetrics.sensitiveCount) * 100}%`,
                }}
              />
            )}
            {exposureMetrics.lowCount > 0 && (
              <div
                className="bg-green-500"
                style={{
                  width: `${(exposureMetrics.lowCount / exposureMetrics.sensitiveCount) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Top Sensitive Holdings */}
        {exposureMetrics.topSensitive.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Top Policy-Sensitive Holdings</h4>
            <div className="space-y-2">
              {exposureMetrics.topSensitive.map((asset: any) => (
                <div
                  key={asset.symbol}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  data-testid={`sensitive-holding-${asset.symbol}`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    <span className="font-medium text-sm">{asset.symbol}</span>
                    <span className="text-xs text-muted-foreground">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getSensitivityBadge(asset.correlation)}
                    <span className="text-xs text-muted-foreground">
                      β {asset.correlation.toFixed(2)}
                    </span>
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
