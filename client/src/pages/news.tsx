import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Clock,
  ExternalLink,
  Newspaper,
  Users,
  Target,
} from "lucide-react";
import { RefreshCcw } from "lucide-react";
import type { ClusteredHeadline, NewsStreamResponse } from "@shared/schema";
import {
  getImpactColor,
  getImpactIcon,
  TimeAgo,
} from "@/lib/news-utils";

const POLL_NEWS_MS = 30_000;

// News cluster component
function NewsClusterCard({ cluster }: { cluster: NewsStreamResponse['clusters'][0] }) {
  const [expanded, setExpanded] = useState(false);
  
  const visibleHeadlines = expanded ? cluster.headlines : cluster.headlines.slice(0, 3);
  const remainingCount = cluster.headlines.length - 3;

  return (
    <Card className="border-l-4 border-l-blue-500 mb-6">
      <CardContent className="p-6">
        {/* Cluster header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-600">
                {cluster.topic}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {cluster.headlines.length} articles
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            <TimeAgo date={cluster.headlines[0]?.published} />
          </div>
        </div>

        {/* Impact summary if available */}
        {cluster.description && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Cluster Summary</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {cluster.description}
            </p>
          </div>
        )}

        {/* Headlines in cluster */}
        <div className="space-y-3">
          {visibleHeadlines.map((headline: ClusteredHeadline, index: number) => (
            <div 
              key={headline.id}
              className={`p-3 rounded-lg border ${index === 0 ? 'bg-primary/5 border-primary/20' : 'bg-muted/20'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground leading-tight mb-1">
                    {headline.title}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <span className="font-medium">{headline.source}</span>
                    <span>•</span>
                    <TimeAgo date={headline.published} />
                  </div>
                  {headline.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {headline.summary}
                    </p>
                  )}
                  {headline.symbols && headline.symbols.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {headline.symbols.slice(0, 3).map((symbol: string) => (
                        <Badge key={symbol} variant="outline" className="text-xs">
                          {symbol}
                        </Badge>
                      ))}
                      {headline.symbols.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{headline.symbols.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  {/* Impact Badge */}
                  {headline.impactLevel && (
                    <div className="mt-2">
                      <Badge 
                        className={`text-xs ${getImpactColor(headline.impactLevel)}`}
                        variant="secondary"
                        data-testid={`badge-impact-${headline.id}`}
                      >
                        <span className="flex items-center gap-1">
                          {getImpactIcon(headline.impactLevel)}
                          {headline.impactLevel.toUpperCase()} IMPACT
                        </span>
                      </Badge>
                    </div>
                  )}
                </div>
                {headline.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => window.open(headline.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Expand/collapse button */}
        {cluster.headlines.length > 3 && (
          <div className="mt-4 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="text-primary"
            >
              {expanded 
                ? 'Show Less' 
                : `Show ${remainingCount} More Article${remainingCount > 1 ? 's' : ''}`
              }
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function NewsStream() {
  const [scope, setScope] = useState<"all" | "focus" | "portfolio">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Focus assets & portfolio (disabled due to database issues)
  const { data: focusAssets = [] } = useQuery({
    queryKey: ["/api/focus-assets"],
    queryFn: () => api.getFocusAssets("default"),
    enabled: false, // Disabled due to Neon endpoint issues
  });

  const { data: portfolios = [] } = useQuery({
    queryKey: ["/api/portfolios"],
    queryFn: () => api.getPortfolios(),
    enabled: false, // Disabled due to Neon endpoint issues
  });

  const focusSymbols = useMemo(
    () => focusAssets.map((fa: any) => fa.symbol),
    [focusAssets],
  );
  const portfolioSymbols = useMemo(
    () => {
      // Extract symbols from portfolios or provide fallback for testing
      const symbols = portfolios?.flatMap((p: any) => p.positions?.map((pos: any) => pos.symbol) || []) ?? [];
      // Fallback symbols for testing when database is disabled
      return symbols.length > 0 ? symbols : ['AAPL', 'GOOGL', 'MSFT', 'TSLA'];
    },
    [portfolios],
  );

  // Enhanced News Stream with clustering
  const {
    data: newsResponse,
    isLoading,
    isFetching,
    refetch,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["/api/news/stream", scope],
    queryFn: () => api.getNewsStream(scope, 50),
    refetchInterval: POLL_NEWS_MS,
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
    staleTime: 0,
  });

  const clusters = newsResponse?.clusters || [];
  const headlines = newsResponse?.headlines || [];

  // Filter clusters and headlines by search term
  const filteredClusters = useMemo(
    () =>
      clusters.filter((cluster) =>
        !searchTerm ||
        cluster.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cluster.headlines.some((h) =>
          h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.summary?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      ),
    [clusters, searchTerm],
  );

  const filteredHeadlines = useMemo(
    () =>
      headlines.filter((h) =>
        !searchTerm ||
        h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [headlines, searchTerm],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="News Stream"
        subtitle="Real-time news clustering with AI-powered impact analysis"
      />

      {/* Live indicator */}
      <div className="px-4 md:px-6 pt-2">
        {!isLoading && (
          <span className="text-[11px] text-muted-foreground">
            {isFetching ? "Updating…" : "Live"} • Last update{" "}
            {safeFormat(new Date(), "h:mm:ss a")}
          </span>
        )}
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          {/* Top row: search + manual refresh */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <Input
              placeholder="Search news topics and headlines..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
              data-testid="input-search"
            />
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh news stream"
                data-testid="button-refresh"
              >
                <RefreshCcw
                  className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
                />
                {isFetching ? "Refreshing…" : "Refresh"}
              </Button>
              {!!dataUpdatedAt && (
                <span className="text-xs text-muted-foreground">
                  Updated {format(new Date(dataUpdatedAt), "h:mm:ss a")}
                </span>
              )}
            </div>
          </div>

          {/* Scope buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2">
              <Button
                data-testid="scope-all"
                variant={scope === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("all")}
                className="h-8"
              >
                All Markets
              </Button>
              <Button
                data-testid="scope-focus"
                variant={scope === "focus" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("focus")}
                className="h-8"
                disabled={!focusSymbols.length}
              >
                Focus Assets ({focusSymbols.length})
              </Button>
              <Button
                data-testid="scope-portfolio"
                variant={scope === "portfolio" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("portfolio")}
                className="h-8"
                disabled={!portfolioSymbols.length}
              >
                Portfolio ({portfolioSymbols.length})
              </Button>
            </div>
          </div>

          {/* Active scope chips */}
          {scope !== "all" && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {scope === "focus" ? "Focus Assets:" : "Portfolio:"}
              </span>
              {(scope === "focus" ? focusSymbols : portfolioSymbols).map(
                (symbol) => (
                  <Badge
                    key={symbol}
                    variant="secondary"
                    className="text-xs"
                    data-testid={`badge-${symbol}`}
                  >
                    {symbol}
                  </Badge>
                ),
              )}
            </div>
          )}
        </div>

        {/* News Content */}
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="animate-pulse border-l-4 border-l-muted">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-6 bg-muted rounded-full w-32"></div>
                      <div className="h-4 bg-muted rounded w-16"></div>
                    </div>
                    <div className="space-y-3">
                      {Array.from({ length: 2 }).map((_, j) => (
                        <div key={j} className="p-3 rounded-lg bg-muted/20">
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-3/4"></div>
                            <div className="h-3 bg-muted rounded w-1/2"></div>
                            <div className="h-3 bg-muted rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Disclaimer */}
            <div className="bg-muted/50 border border-muted rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Information Only</span>
              </div>
              <p className="text-xs text-muted-foreground">
                This news analysis is for informational purposes only and should not be considered as financial advice. 
                Impact analysis is AI-generated and may not reflect actual market conditions.
              </p>
            </div>

            {/* Clustered News */}
            {filteredClusters.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Trending Topics</h2>
                  <Badge variant="secondary">{filteredClusters.length}</Badge>
                </div>
                <div className="space-y-4">
                  {filteredClusters.map((cluster, index) => (
                    <NewsClusterCard key={index} cluster={cluster} />
                  ))}
                </div>
              </div>
            )}

            {/* Individual Headlines (unclustered) */}
            {filteredHeadlines.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Newspaper className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Latest Headlines</h2>
                  <Badge variant="secondary">{filteredHeadlines.length}</Badge>
                </div>
                <div className="space-y-4">
                  {filteredHeadlines.map((headline) => (
                    <Card key={headline.id} className="hover:shadow-md transition-all duration-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground leading-tight mb-2">
                              {headline.title}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                              <span className="font-medium">{headline.source}</span>
                              <span>•</span>
                              <TimeAgo date={headline.published} />
                            </div>
                            {headline.summary && (
                              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                                {headline.summary}
                              </p>
                            )}
                            {headline.symbols && headline.symbols.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {headline.symbols.slice(0, 5).map((symbol: string) => (
                                  <Badge key={symbol} variant="outline" className="text-xs">
                                    {symbol}
                                  </Badge>
                                ))}
                                {headline.symbols.length > 5 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{headline.symbols.length - 5} more
                                  </Badge>
                                )}
                              </div>
                            )}
                            {/* Impact Badge */}
                            {headline.impactLevel && (
                              <div className="mt-2">
                                <Badge 
                                  className={`text-xs ${getImpactColor(headline.impactLevel)}`}
                                  variant="secondary"
                                  data-testid={`badge-impact-${headline.id}`}
                                >
                                  <span className="flex items-center gap-1">
                                    {getImpactIcon(headline.impactLevel)}
                                    {headline.impactLevel.toUpperCase()} IMPACT
                                  </span>
                                </Badge>
                              </div>
                            )}
                          </div>
                          {headline.url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0"
                              onClick={() => window.open(headline.url, '_blank')}
                              data-testid={`button-external-${headline.id}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {filteredClusters.length === 0 && filteredHeadlines.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Newspaper className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No matching news found' : 'No news available'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms or clearing the search.'
                    : 'Check back soon for the latest market news and analysis.'
                  }
                </p>
                {searchTerm && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchTerm("")}
                    data-testid="button-clear-search"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}