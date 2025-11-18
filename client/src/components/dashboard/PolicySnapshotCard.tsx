import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { usePolicySnapshot } from "@/hooks/usePolicySnapshot";

export function PolicySnapshotCard() {
  const { data, isLoading, isError, refetch } = usePolicySnapshot();

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Policy Snapshot
          </p>
          <div className="text-xs text-muted-foreground">Loading policy data...</div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="h-full">
        <CardContent className="p-4 sm:p-6">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            Policy Snapshot
          </p>
          <div className="text-xs text-destructive mb-2">Policy data unavailable</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs"
            data-testid="button-retry-policy"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const deltaColor =
    data.trumpDelta7d > 0.25
      ? "text-destructive"
      : data.trumpDelta7d < -0.25
        ? "text-green-600 dark:text-green-400"
        : "text-muted-foreground";

  const regimeColor =
    data.trumpRegime === "High Risk"
      ? "destructive"
      : data.trumpRegime === "Low Risk"
        ? "default"
        : "secondary";

  const toneColor =
    data.fedspeakTone === "hawkish"
      ? "destructive"
      : data.fedspeakTone === "dovish"
        ? "default"
        : "secondary";

  const sensitivityColors: Record<string, string> = {
    High: "bg-destructive/10 text-destructive border-destructive/20",
    Moderate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
    Low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Card className="h-full" data-testid="card-policy-snapshot">
      <CardContent className="p-4 sm:p-6 h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              Policy Snapshot
            </p>
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-xl font-bold text-foreground" data-testid="text-trump-zscore">
                {data.trumpZScore.toFixed(2)}σ
              </p>
              <Badge variant={regimeColor} className="text-xs" data-testid="badge-trump-regime">
                {data.trumpRegime}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Trump Index · {new Date(data.trumpAsOf).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="h-8 w-8 p-0"
            data-testid="button-refresh-policy"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* 7-Day Delta */}
        {data.trumpDelta7d !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${deltaColor} mb-3`} data-testid="text-delta-7d">
            {data.trumpDelta7d > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : data.trumpDelta7d < 0 ? (
              <TrendingDown className="w-3 h-3" />
            ) : null}
            <span>
              vs 7d: {data.trumpDelta7d > 0 ? "+" : ""}
              {data.trumpDelta7d.toFixed(2)}σ
            </span>
          </div>
        )}

        {/* Fedspeak */}
        <div className="mb-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Fedspeak:</span>
            <Badge variant={toneColor} className="text-xs capitalize" data-testid="badge-fedspeak-tone">
              {data.fedspeakTone}
            </Badge>
            <span className="text-xs text-muted-foreground">
              ({data.fedspeakScore.toFixed(2)})
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(data.fedspeakAsOf).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Top Sensitive Assets */}
        {data.topSensitiveAssets.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Top Policy-Sensitive
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.topSensitiveAssets.map((asset) => (
                <div
                  key={asset.symbol}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                    sensitivityColors[asset.sensitivity] || sensitivityColors.Low
                  }`}
                  data-testid={`chip-asset-${asset.symbol.toLowerCase()}`}
                >
                  <span className="font-medium">{asset.symbol}</span>
                  <span className={asset.lastChangePct >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}>
                    {asset.lastChangePct >= 0 ? "+" : ""}
                    {asset.lastChangePct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highlight Cluster Summary */}
        {data.highlightClusterSummary && (
          <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
            <p className="font-medium text-muted-foreground mb-1">Today's Theme</p>
            <p className="text-foreground line-clamp-2">
              {data.highlightClusterSummary}
            </p>
          </div>
        )}

        {/* View Details Link */}
        <div className="mt-auto pt-2">
          <Link href="/policy">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-between text-xs h-8"
              data-testid="button-view-policy-details"
            >
              <span>View policy details</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
