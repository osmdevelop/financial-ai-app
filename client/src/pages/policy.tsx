import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, TrendingUp, TrendingDown, Minus, ExternalLink, ChevronDown, ChevronUp, Target, Lightbulb } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { getSensitivityColor, getSensitivityTooltip } from "@/utils/policySensitivity";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import type { TrumpIndexResponse, FedspeakResponse, PolicySensitivity } from "@shared/schema";
import { Link } from "wouter";
import { DataStatusBadge } from "@/components/ui/data-status-badge";
import { useEvidenceMode } from "@/hooks/useEvidenceMode";
import { EvidenceToggle, EvidencePanel, SourceChip, SourceChips } from "@/components/evidence";
import type { EvidenceItem, EvidenceMeta } from "@/components/evidence";

export default function Policy() {
  const { focusAssets } = useFocusAssets();
  const focusSymbols = focusAssets.map(a => a.symbol);
  const { enabled: evidenceEnabled, toggle: toggleEvidence } = useEvidenceMode();

  const { 
    data: trumpIndex, 
    isLoading: trumpLoading, 
    error: trumpError,
    refetch: refetchTrump 
  } = useQuery<TrumpIndexResponse>({
    queryKey: ["/api/policy/trump-index"],
    queryFn: () => api.getTrumpIndex(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { 
    data: fedspeak, 
    isLoading: fedspeakLoading, 
    error: fedspeakError,
    refetch: refetchFedspeak 
  } = useQuery<FedspeakResponse>({
    queryKey: ["/api/policy/fedspeak"],
    queryFn: () => api.getFedspeak(),
    refetchInterval: 5 * 60 * 1000,
  });

  const getRegime = (zScore: number): { label: string; color: string } => {
    if (zScore > 0.75) return { label: "High Policy Risk", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    if (zScore < -0.75) return { label: "Muted Policy Risk", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
    return { label: "Normal", color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" };
  };

  const getToneColor = (tone: string): string => {
    switch (tone.toLowerCase()) {
      case "hawkish": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "dovish": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getIntensityBadge = (intensity: number): { label: string; color: string } => {
    if (intensity > 0.66) return { label: "High", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
    if (intensity > 0.33) return { label: "Medium", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
    return { label: "Low", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Policy & Political Indexes" 
        subtitle="Trump Index, Fedspeak tone, and policy-driven asset sensitivities"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8">
        {/* Evidence Toggle */}
        <div className="flex justify-end" data-testid="policy-evidence">
          <EvidenceToggle enabled={evidenceEnabled} onToggle={toggleEvidence} />
        </div>
        {/* Lens Relevance Strip - Show tip when no focus assets */}
        {focusSymbols.length === 0 && (
          <Card className="bg-primary/5 border-primary/20" data-testid="lens-policy-tip">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">See policy impact on your assets</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add focus assets to see how policy changes and Trump Index movements may affect your positions.
                  </p>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Target className="h-3 w-3" />
                      Add Focus Assets
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Lens Relevance Strip - Show when focus assets exist */}
        {focusSymbols.length > 0 && trumpIndex && (
          <Card className="bg-primary/5 border-primary/20" data-testid="lens-policy-relevance">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Target className="h-5 w-5 text-primary" />
                <span className="font-medium">Policy Impact on Your Focus Assets</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {focusAssets.map(asset => {
                  const sensitivity = trumpIndex.sensitivities?.find(
                    (s: PolicySensitivity) => s.symbol.toLowerCase() === asset.symbol.toLowerCase()
                  );
                  const hasSensitivity = !!sensitivity;
                  const zScore = trumpIndex.zScore;
                  
                  let impactLevel = "Low";
                  let impactColor = "text-green-600";
                  if (hasSensitivity) {
                    const beta = Math.abs(sensitivity.trumpBeta || 0);
                    if (beta > 0.5 && Math.abs(zScore) > 1) {
                      impactLevel = "High";
                      impactColor = "text-red-600";
                    } else if (beta > 0.3 && Math.abs(zScore) > 0.5) {
                      impactLevel = "Medium";
                      impactColor = "text-yellow-600";
                    }
                  }

                  return (
                    <div key={asset.id} className="flex items-center justify-between p-2 bg-card rounded-lg border">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-medium">{asset.symbol}</Badge>
                        {sensitivity && (
                          <span className="text-xs text-muted-foreground">
                            Beta: {sensitivity.trumpBeta?.toFixed(2) || "N/A"}
                          </span>
                        )}
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${impactColor}`}
                        data-testid={`policy-impact-${asset.symbol}`}
                      >
                        Policy Impact: {impactLevel}
                      </Badge>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Based on Trump Index z-score ({trumpIndex.zScore > 0 ? '+' : ''}{trumpIndex.zScore.toFixed(2)}) and historical asset sensitivities.
              </p>
            </CardContent>
          </Card>
        )}

        {/* SECTION 1: TRUMP INDEX */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold dark:text-white">Trump Policy Index</h2>
            <Button 
              onClick={() => refetchTrump()} 
              variant="outline" 
              size="sm"
              data-testid="refresh-trump-index"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {trumpLoading ? (
            <div className="space-y-4">
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-24 bg-muted rounded"></div>
                </CardContent>
              </Card>
            </div>
          ) : trumpError ? (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <p className="text-destructive mb-4">Unable to load Trump Index right now</p>
                <Button onClick={() => refetchTrump()} variant="outline" size="sm">
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : trumpIndex ? (
            <div className="space-y-6">
              {/* A) Summary Header */}
              <Card data-testid="trump-index-card">
                <CardHeader>
                  <CardTitle>Current Index</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="text-4xl font-bold dark:text-white mb-2" data-testid="trump-index-zscore">
                        {trumpIndex.zScore > 0 ? '+' : ''}{trumpIndex.zScore.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        7-day change: {trumpIndex.change7d > 0 ? '+' : ''}{trumpIndex.change7d.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getRegime(trumpIndex.zScore).color}>
                        {getRegime(trumpIndex.zScore).label}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        As of {new Date(trumpIndex.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* C) Sensitive Assets Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Policy-Sensitive Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full" data-testid="sensitive-assets-table">
                      <thead>
                        <tr className="border-b dark:border-gray-700">
                          <th className="text-left p-2 font-semibold">Asset</th>
                          <th className="text-left p-2 font-semibold">Correlation</th>
                          <th className="text-left p-2 font-semibold hidden lg:table-cell">Current Price</th>
                          <th className="text-right p-2 font-semibold">Today's Change</th>
                          <th className="text-center p-2 font-semibold">Policy Sensitivity</th>
                          <th className="text-center p-2 font-semibold hidden md:table-cell">Significance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trumpIndex.sensitiveAssets
                          .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                          .map((asset) => {
                            const sensitivity = asset.sensitivity || "None";
                            return (
                              <tr key={asset.symbol} className="border-b dark:border-gray-800 hover:bg-muted/50">
                                <td className="p-2">
                                  <div>
                                    <div className="font-medium dark:text-white">{asset.symbol}</div>
                                    <div className="text-xs text-muted-foreground">{asset.name}</div>
                                  </div>
                                </td>
                                <td className="p-2">
                                  <span className="font-mono text-sm">{asset.correlation.toFixed(2)}</span>
                                </td>
                                <td className="p-2 hidden lg:table-cell">
                                  <span className="font-mono text-sm">${asset.currentPrice.toFixed(2)}</span>
                                </td>
                                <td className="p-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {asset.changePct > 0 ? (
                                      <TrendingUp className="h-4 w-4 text-green-500" />
                                    ) : asset.changePct < 0 ? (
                                      <TrendingDown className="h-4 w-4 text-red-500" />
                                    ) : (
                                      <Minus className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className={asset.changePct > 0 ? "text-green-600 dark:text-green-400" : asset.changePct < 0 ? "text-red-600 dark:text-red-400" : ""}>
                                      {asset.changePct > 0 ? '+' : ''}{asset.changePct.toFixed(2)}%
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 text-center" data-testid={`sensitivity-${asset.symbol}`}>
                                  <Badge 
                                    className={getSensitivityColor(sensitivity as PolicySensitivity)}
                                    title={getSensitivityTooltip(sensitivity as PolicySensitivity)}
                                  >
                                    {sensitivity}
                                  </Badge>
                                </td>
                                <td className="p-2 text-center hidden md:table-cell">
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      asset.significance === "high" 
                                        ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                                        : asset.significance === "medium"
                                        ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300"
                                        : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                                    }
                                  >
                                    {asset.significance}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* C.5) Policy Themes / Clustered News */}
              {trumpIndex.clusters && trumpIndex.clusters.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Policy Themes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4" data-testid="policy-clusters">
                      {trumpIndex.clusters.map((cluster) => (
                        <div key={cluster.id}>
                          <PolicyCluster
                            cluster={cluster}
                            allNews={trumpIndex.recentNews}
                            getIntensityBadge={getIntensityBadge}
                          />
                          {/* Evidence Panel for each cluster */}
                          {evidenceEnabled && (
                            <EvidencePanel
                              title={`${cluster.label || (cluster as any).topic || "Cluster"} Evidence`}
                              data-testid="policy-cluster-evidence"
                              items={[
                                { kind: "note", label: "Based on", value: `${cluster.newsIds?.length || (cluster as any).articleIds?.length || (cluster as any).count || 0} articles` },
                                { kind: "input", label: "Topic", value: cluster.label || cluster.topics?.join(", ") || "N/A" },
                                ...(cluster.newsIds || (cluster as any).articleIds || []).slice(0, 3).map((id: string) => {
                                  const article = trumpIndex.recentNews?.find((n: any) => n.id === id);
                                  return {
                                    kind: "source" as const,
                                    label: "Article",
                                    value: article?.title?.slice(0, 60) || id,
                                    href: article?.url,
                                  };
                                }),
                              ] as EvidenceItem[]}
                              meta={{
                                asOf: trumpIndex.lastUpdated ? format(new Date(trumpIndex.lastUpdated), "h:mm a") : undefined,
                              } as EvidenceMeta}
                              className="mt-2"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* D) Trump Policy News Feed (Flat List) */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {trumpIndex.clusters && trumpIndex.clusters.length > 0 
                      ? "All Policy News" 
                      : "Recent Policy News"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4" data-testid="policy-news-feed">
                    {trumpIndex.recentNews.map((news, idx) => (
                      <div key={news.id || news.title + idx} className="border-b dark:border-gray-800 pb-4 last:border-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <a 
                            href={news.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 hover:underline dark:text-white font-medium"
                          >
                            {news.title}
                            <ExternalLink className="inline h-3 w-3 ml-1" />
                          </a>
                          <Badge className={getIntensityBadge(news.intensity).color}>
                            {getIntensityBadge(news.intensity).label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-2">
                          <span>{formatDistanceToNow(new Date(news.published), { addSuffix: true })}</span>
                          <span>•</span>
                          <span>{news.url ? new URL(news.url).hostname : 'Unknown source'}</span>
                        </div>
                        {news.topics.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {news.topics.map((topic) => (
                              <Badge key={topic} variant="secondary" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {news.summary && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{news.summary}</p>
                        )}
                      </div>
                    ))}
                    {trumpIndex.recentNews.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No recent policy news available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>

        {/* SECTION 2: FEDSPEAK */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold dark:text-white">Federal Reserve Communications</h2>
            <Button 
              onClick={() => refetchFedspeak()} 
              variant="outline" 
              size="sm"
              data-testid="refresh-fedspeak"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {fedspeakLoading ? (
            <div className="space-y-4">
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-8 bg-muted rounded w-1/3"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-24 bg-muted rounded"></div>
                </CardContent>
              </Card>
            </div>
          ) : fedspeakError ? (
            <Card className="border-destructive">
              <CardContent className="p-6">
                <p className="text-destructive mb-4">Unable to load Fedspeak analysis right now</p>
                <Button onClick={() => refetchFedspeak()} variant="outline" size="sm">
                  Retry
                </Button>
              </CardContent>
            </Card>
          ) : fedspeak ? (
            <div className="space-y-6">
              {/* A) Fedspeak Tone Meter */}
              <Card data-testid="fedspeak-card">
                <CardHeader>
                  <CardTitle>Current Fed Tone</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <div className="text-3xl font-bold dark:text-white mb-2" data-testid="fedspeak-tone">
                        {fedspeak.currentTone}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Score: {fedspeak.toneScore.toFixed(2)} | 7d avg: {fedspeak.rollingTone7d.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        7-day change: {fedspeak.change7d > 0 ? '+' : ''}{fedspeak.change7d.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge className={getToneColor(fedspeak.currentTone)}>
                        {fedspeak.currentTone}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        As of {new Date(fedspeak.lastUpdated).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Tone Meter Visual */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Dovish</span>
                      <span>Neutral</span>
                      <span>Hawkish</span>
                    </div>
                    <div className="relative h-3 bg-gradient-to-r from-blue-200 via-gray-200 to-orange-200 dark:from-blue-900 dark:via-gray-700 dark:to-orange-900 rounded-full">
                      <div 
                        className="absolute top-0 h-3 w-3 bg-primary rounded-full transform -translate-x-1/2"
                        style={{ left: `${((fedspeak.toneScore + 1) / 2) * 100}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* C) Fed Quotes Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Fed Communications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6" data-testid="fed-quotes">
                    {fedspeak.recentQuotes.map((quote, idx) => (
                      <div key={idx} className="border-b dark:border-gray-800 pb-4 last:border-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold dark:text-white">{quote.speaker}</span>
                              {evidenceEnabled && quote.url && (
                                <SourceChip label="Source" href={quote.url} />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(quote.date), { addSuffix: true })}
                              {evidenceEnabled && ` • ${format(new Date(quote.date), "MMM d, h:mm a")}`}
                            </div>
                          </div>
                          <Badge className={getToneColor(quote.tone)}>
                            {quote.tone}
                          </Badge>
                        </div>
                        <p className="text-sm dark:text-gray-300 mb-2 italic">"{quote.text}"</p>
                        {quote.impliedOdds && (
                          <p className="text-xs text-muted-foreground mb-2">
                            <span className="font-semibold">Implied:</span> {quote.impliedOdds}
                          </p>
                        )}
                        {quote.url && (
                          <a 
                            href={quote.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                          >
                            View source
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          Confidence: {(quote.confidence * 100).toFixed(0)}%
                        </div>
                        
                        {/* Evidence Panel for each quote */}
                        {evidenceEnabled && (
                          <EvidencePanel
                            title="Quote Evidence"
                            data-testid="policy-quote-evidence"
                            items={[
                              { kind: "source", label: "Speaker", value: quote.speaker },
                              { kind: "timestamp", label: "Date", value: format(new Date(quote.date), "MMM d, yyyy h:mm a") },
                              { kind: "input", label: "Tone", value: quote.tone },
                              { kind: "input", label: "Confidence", value: `${(quote.confidence * 100).toFixed(0)}%` },
                              ...(quote.impliedOdds ? [{ kind: "note" as const, label: "Derived", value: `Implied odds: ${quote.impliedOdds}` }] : []),
                            ] as EvidenceItem[]}
                            className="mt-2"
                          />
                        )}
                      </div>
                    ))}
                    {fedspeak.recentQuotes.length === 0 && (
                      <p className="text-muted-foreground text-center py-4">No recent Fed communications available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

// Helper component for rendering a policy cluster
function PolicyCluster({ 
  cluster, 
  allNews, 
  getIntensityBadge 
}: { 
  cluster: any; 
  allNews: any[]; 
  getIntensityBadge: (intensity: number) => { label: string; color: string }; 
}) {
  const [expanded, setExpanded] = useState(false);
  const clusterNews = allNews.filter(news => cluster.newsIds.includes(news.id));

  return (
    <div 
      className="border dark:border-gray-700 rounded-lg p-4 bg-card hover:bg-muted/30 transition-colors"
      data-testid={`cluster-${cluster.id}`}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          <h3 className="font-semibold dark:text-white text-lg">{cluster.label}</h3>
        </div>
        <Badge className={getIntensityBadge(cluster.intensity).color}>
          {getIntensityBadge(cluster.intensity).label}
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground mb-3" data-testid={`cluster-summary-${cluster.id}`}>
        {cluster.summary}
      </p>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Stories: {clusterNews.length}</span>
          {cluster.topics.length > 0 && (
            <>
              <span>•</span>
              <div className="flex flex-wrap gap-1">
                {cluster.topics.slice(0, 3).map((topic: string) => (
                  <Badge key={topic} variant="outline" className="text-xs">
                    {topic}
                  </Badge>
                ))}
                {cluster.topics.length > 3 && (
                  <span className="text-xs">+{cluster.topics.length - 3} more</span>
                )}
              </div>
            </>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="text-xs"
          data-testid={`toggle-cluster-${cluster.id}`}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show stories
            </>
          )}
        </Button>
      </div>
      
      {expanded && clusterNews.length > 0 && (
        <div className="mt-4 space-y-3 border-t dark:border-gray-700 pt-3">
          {clusterNews.map((news, idx) => (
            <div key={news.id || idx} className="pl-3 border-l-2 border-primary/30">
              <a
                href={news.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium hover:underline dark:text-white block"
              >
                {news.title}
                <ExternalLink className="inline h-3 w-3 ml-1" />
              </a>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(news.published), { addSuffix: true })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}