import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  ExternalLink,
  Newspaper,
  Users,
  Target,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import type { Headline } from "@shared/schema";
import type { ClusteredHeadline, NewsStreamResponse } from "@shared/schema";
import {
  getImpactColor,
  getImpactIcon,
  TimeAgo,
  safeFormat,
  formatTimelineDate,
  toDate,
} from "@/lib/news-utils";
import { format, isValid } from "date-fns";
import { useEvidenceMode } from "@/hooks/useEvidenceMode";
import { useDataModeContext } from "@/components/providers/data-mode-provider";
import { EvidenceToggle, SourceChip } from "@/components/evidence";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { DataStatusBadge } from "@/components/ui/data-status-badge";

const POLL_HEADLINES_MS = 30_000;
const POLL_NEWS_MS = 30_000;

const groupHeadlinesByDate = (headlines: Headline[]) => {
  const grouped = headlines.reduce(
    (acc, headline) => {
      const d = toDate((headline as any)?.published);
      const key = d && isValid(d) ? format(d, "yyyy-MM-dd") : "Unknown";
      (acc[key] ||= []).push(headline);
      return acc;
    },
    {} as Record<string, Headline[]>,
  );
  return Object.entries(grouped).sort(([a], [b]) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return b.localeCompare(a);
  });
};

type NewsCluster = NewsStreamResponse["clusters"] extends (infer C)[] ? C : never;

function NewsClusterCard({
  cluster,
  evidenceEnabled,
}: {
  cluster: NewsCluster;
  evidenceEnabled?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleHeadlines = expanded ? cluster.headlines : cluster.headlines.slice(0, 3);
  const remainingCount = cluster.headlines.length - 3;

  return (
    <Card className="border-l-4 border-l-border mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-foreground">{cluster.topic}</span>
            <Badge variant="secondary" className="text-xs">
              {cluster.headlines.length} articles
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            <TimeAgo date={cluster.headlines[0]?.published} />
          </span>
        </div>
        {cluster.description && (
          <div className="mb-3 p-3 bg-muted/50 rounded-md">
            <p className="text-sm text-muted-foreground">{cluster.description}</p>
          </div>
        )}
        <div className="space-y-2">
          {visibleHeadlines.map((headline: ClusteredHeadline, index: number) => (
            <div
              key={headline.id}
              className={`p-3 rounded-md border ${index === 0 ? "bg-muted/30 border-border" : "bg-muted/10 border-border/50"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-medium text-foreground leading-tight">{headline.title}</h4>
                    {evidenceEnabled && headline.source && (
                      <SourceChip label={headline.source} href={headline.url} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span>{headline.source}</span>
                    <span>•</span>
                    <TimeAgo date={headline.published} />
                    {evidenceEnabled && headline.symbols?.length ? (
                      <>
                        <span>•</span>
                        <span>Matched: {headline.symbols.slice(0, 3).join(", ")}</span>
                      </>
                    ) : null}
                  </div>
                  {headline.summary && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{headline.summary}</p>
                  )}
                  {headline.symbols && headline.symbols.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {headline.symbols.slice(0, 3).map((s: string) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                      {headline.symbols.length > 3 && (
                        <Badge variant="outline" className="text-xs">+{headline.symbols.length - 3}</Badge>
                      )}
                    </div>
                  )}
                  {headline.impactLevel ? (
                    <Badge
                      className={`text-xs mt-2 ${getImpactColor(headline.impactLevel)}`}
                      variant="secondary"
                    >
                      {getImpactIcon(headline.impactLevel)} {headline.impactLevel.toUpperCase()} IMPACT
                    </Badge>
                  ) : null}
                </div>
                {headline.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    onClick={() => window.open(headline.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
        {cluster.headlines.length > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show less" : `Show ${remainingCount} more`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState<"timeline" | "clusters">("timeline");
  const [scope, setScope] = useState<"all" | "focus" | "watchlist">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [policyFilter, setPolicyFilter] = useState<"all" | "policy">("all");
  const { enabled: evidenceEnabled, toggle: toggleEvidence } = useEvidenceMode();
  const { dataMode } = useDataModeContext();

  const { data: focusData } = useQuery({
    queryKey: ["/api/focus-assets"],
    queryFn: () => api.getFocusAssets(),
  });
  const focusAssets = focusData?.items ?? [];
  const { data: watchlist = [] } = useQuery({
    queryKey: ["/api/watchlist"],
    queryFn: () => api.getWatchlist(),
  });
  const focusSymbols = useMemo(() => focusAssets.map((fa: any) => fa.symbol), [focusAssets]);
  const watchlistSymbols = useMemo(() => watchlist?.map((w: any) => w.symbol) ?? [], [watchlist]);
  const activeSymbols: string[] | undefined = useMemo(() => {
    if (scope === "focus") return focusSymbols;
    if (scope === "watchlist") return watchlistSymbols;
    return undefined;
  }, [scope, focusSymbols, watchlistSymbols]);

  const {
    data: headlines = [],
    isLoading: timelineLoading,
    isFetching: timelineFetching,
    error: timelineError,
    refetch: refetchTimeline,
    dataUpdatedAt: timelineUpdatedAt,
  } = useQuery({
    queryKey: ["/api/headlines/timeline", scope, activeSymbols, dataMode],
    queryFn: () =>
      api.getHeadlinesTimeline(activeSymbols, scope, 100, { forceReal: dataMode === "live", noCache: true }),
    enabled: scope === "all" || (Array.isArray(activeSymbols) && activeSymbols.length > 0),
    refetchInterval: POLL_HEADLINES_MS,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const filteredTimeline = useMemo(
    () =>
      (headlines as Headline[]).filter((h: any) => {
        const matchSearch =
          !searchTerm ||
          h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.summary?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchPolicy = policyFilter === "all" || h.isPolicy === true;
        return matchSearch && matchPolicy;
      }),
    [headlines, searchTerm, policyFilter],
  );
  const groupedTimeline = useMemo(() => groupHeadlinesByDate(filteredTimeline), [filteredTimeline]);

  const {
    data: newsResponse,
    isLoading: clustersLoading,
    isFetching: clustersFetching,
    refetch: refetchClusters,
    dataUpdatedAt: clustersUpdatedAt,
  } = useQuery({
    queryKey: ["/api/news/stream", scope],
    queryFn: () => api.getNewsStream(scope, 50),
    refetchInterval: POLL_NEWS_MS,
    refetchIntervalInBackground: true,
    placeholderData: (prev) => prev,
    staleTime: 0,
  });

  const clusters = newsResponse?.data?.clusters || [];
  const clusterHeadlines = newsResponse?.data?.headlines || [];
  const filteredClusters = useMemo(
    () =>
      clusters.filter(
        (c: any) =>
          !searchTerm ||
          c.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.headlines?.some(
            (h: any) =>
              h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              h.summary?.toLowerCase().includes(searchTerm.toLowerCase()),
          ),
      ),
    [clusters, searchTerm],
  );
  const filteredClusterHeadlines = useMemo(
    () =>
      clusterHeadlines.filter(
        (h: any) =>
          !searchTerm ||
          h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          h.summary?.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [clusterHeadlines, searchTerm],
  );

  const isMock = newsResponse?.meta?.isMock ?? false;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="News & Headlines" subtitle="Live headlines and topic clusters — stop avoiding red folder news, start trading it" />

      <div className="px-4 md:px-6 pt-2 flex items-center justify-between gap-2 flex-wrap">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "timeline" | "clusters")}>
          <TabsList className="bg-muted">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="clusters">Clusters</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <EvidenceToggle enabled={evidenceEnabled} onToggle={toggleEvidence} />
          <span className="text-[11px] text-muted-foreground">
            {activeTab === "timeline"
              ? timelineFetching
                ? "Updating…"
                : `Updated ${timelineUpdatedAt ? safeFormat(new Date(timelineUpdatedAt), "h:mm a") : "—"}`
              : clustersFetching
                ? "Updating…"
                : isMock
                  ? "Sample"
                  : `Updated ${clustersUpdatedAt ? safeFormat(new Date(clustersUpdatedAt), "h:mm a") : "—"}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (activeTab === "timeline" ? refetchTimeline() : refetchClusters())}
            disabled={activeTab === "timeline" ? timelineFetching : clustersFetching}
          >
            <RefreshCcw className={`h-4 w-4 mr-1 ${activeTab === "timeline" ? timelineFetching : clustersFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="space-y-4 mb-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs h-9"
            />
            <div className="flex gap-1">
              <Button
                variant={scope === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("all")}
                className="h-9"
              >
                All
              </Button>
              <Button
                variant={scope === "focus" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("focus")}
                className="h-9"
                disabled={!focusSymbols.length}
              >
                Focus ({focusSymbols.length})
              </Button>
              <Button
                variant={scope === "watchlist" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("watchlist")}
                className="h-9"
                disabled={!watchlistSymbols.length}
              >
                Watchlist ({watchlistSymbols.length})
              </Button>
            </div>
            {activeTab === "timeline" && (
              <div className="flex gap-1 border-l border-border pl-3">
                <Button
                  variant={policyFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPolicyFilter("all")}
                  className="h-9"
                >
                  All
                </Button>
                <Button
                  variant={policyFilter === "policy" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPolicyFilter("policy")}
                  className="h-9"
                >
                  Policy
                </Button>
              </div>
            )}
          </div>
        </div>

        {activeTab === "timeline" && (
          <>
            {timelineLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : timelineError ? (
              <EmptyStateCard
                title="Could not load headlines"
                description={dataMode === "live" ? "Rate limit or provider error. Try again or switch to Demo." : "Headlines could not be loaded. Try again."}
                actionLabel="Retry"
                onAction={() => refetchTimeline()}
                variant="error"
                icon={<Newspaper className="h-10 w-10 text-muted-foreground" />}
                data-testid="news-timeline-error"
              />
            ) : groupedTimeline.length > 0 ? (
              <div className="space-y-8">
                {groupedTimeline.map(([dateKey, dateHeadlines]) => (
                  <div key={dateKey}>
                    <div className="flex items-center gap-2 pb-3 border-b border-border">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {formatTimelineDate((dateHeadlines as Headline[])[0]?.published)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {(dateHeadlines as Headline[]).length} headlines
                      </span>
                    </div>
                    <div className="space-y-3 mt-3">
                      {(dateHeadlines as Headline[]).map((headline) => (
                        <Card key={(headline as any).id} className="border-l-2 border-l-border">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <h3 className="font-medium text-foreground leading-tight">{headline.title}</h3>
                                  {evidenceEnabled && (headline as any).source && (
                                    <SourceChip
                                      label={(headline as any).source}
                                      href={(headline as any).url}
                                    />
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                  <span>{(headline as any).source}</span>
                                  <span>•</span>
                                  <TimeAgo date={headline.published} />
                                </div>
                                {headline.summary && (
                                  <p className="text-sm text-muted-foreground mt-2">{headline.summary}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {(headline as any).symbols?.slice(0, 4).map((s: string) => (
                                    <Badge key={s} variant="secondary" className="text-xs">
                                      {s}
                                    </Badge>
                                  ))}
                                  {(headline as any).url && (
                                    <Button variant="ghost" size="sm" asChild className="h-8">
                                      <a href={(headline as any).url} target="_blank" rel="noopener noreferrer">
                                        Read more <ExternalLink className="h-3 w-3 ml-1" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyStateCard
                title={dataMode === "live" ? "No data available" : "No headlines"}
                description={
                  dataMode === "live"
                    ? "No headlines returned. Try Refresh or switch to Demo mode for sample data."
                    : scope === "focus" || scope === "watchlist"
                      ? "No recent news for selected scope. Try All or add assets."
                      : "No headlines match your filters."
                }
                actionLabel="Refresh"
                onAction={() => refetchTimeline()}
                icon={<Newspaper className="h-10 w-10 text-muted-foreground" />}
              />
            )}
          </>
        )}

        {activeTab === "clusters" && (
          <>
            {clustersLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="animate-pulse border-l-4 border-l-border">
                    <CardContent className="p-4">
                      <div className="h-5 bg-muted rounded w-32 mb-3" />
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-full" />
                        <div className="h-4 bg-muted rounded w-4/5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : dataMode === "live" && isMock ? (
              <EmptyStateCard
                title="No data available"
                description="Sample data is not shown in Live mode. Switch to Demo in Settings to see sample clusters, or wait for live data."
                actionLabel="Refresh"
                onAction={() => refetchClusters()}
                icon={<Newspaper className="h-10 w-10 text-muted-foreground" />}
                data-testid="news-clusters-empty-live"
              />
            ) : (
              <>
                <div className="mb-4 p-3 bg-muted/50 rounded-md border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Information only</span>
                    {dataMode === "demo" && isMock && (
                      <DataStatusBadge status="demo" details="Sample data" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    News analysis is for informational purposes. Impact is AI-generated.
                  </p>
                </div>
                {filteredClusters.length > 0 && (
                  <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Topics
                      <Badge variant="secondary">{filteredClusters.length}</Badge>
                    </h2>
                    {filteredClusters.map((cluster, idx) => (
                      <NewsClusterCard key={idx} cluster={cluster} evidenceEnabled={evidenceEnabled} />
                    ))}
                  </div>
                )}
                {filteredClusterHeadlines.length > 0 && (
                  <div className="mt-6">
                    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                      <Newspaper className="h-4 w-4" />
                      Latest
                      <Badge variant="secondary">{filteredClusterHeadlines.length}</Badge>
                    </h2>
                    <div className="space-y-3">
                      {filteredClusterHeadlines.slice(0, 10).map((headline: any) => (
                        <Card key={headline.id} className="border-l-2 border-l-border">
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground leading-tight">{headline.title}</h3>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {headline.source} • <TimeAgo date={headline.published} />
                                </div>
                              </div>
                              {headline.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="shrink-0"
                                  onClick={() => window.open(headline.url, "_blank")}
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
                {filteredClusters.length === 0 && filteredClusterHeadlines.length === 0 && !clustersLoading && (
                  <EmptyStateCard
                    title={searchTerm ? "No matching news" : "No news available"}
                    description={searchTerm ? "Try different search terms." : "Check back later."}
                    icon={<Newspaper className="h-10 w-10 text-muted-foreground" />}
                  />
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
