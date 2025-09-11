import { useEffect, useMemo, useState } from "react";
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";
import { format, formatDistance, parseISO, isValid } from "date-fns";
import type { Headline } from "@shared/schema";

// --- configuration for "real-time" behavior ---
const POLL_HEADLINES_MS = 30_000; // refresh feed every 30s
const RELATIVE_TIME_TICK_MS = 60_000; // update "x minutes ago" each minute

// ---------- safe date helpers ----------
const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v); // epoch secs or ms
  if (typeof v === "string") {
    const num = Number(v);
    if (!Number.isNaN(num)) return new Date(num < 1e12 ? num * 1000 : num);
    const d = parseISO(v);
    return isValid(d) ? d : null;
  }
  return null;
};

const safeFormat = (v: unknown, fmt: string, fallback = "—") => {
  const d = toDate(v);
  return d && isValid(d) ? format(d, fmt) : fallback;
};

const safeDistance = (v: unknown, now: number, fallback = "") => {
  const d = toDate(v);
  return d && isValid(d)
    ? formatDistance(d, new Date(now), { addSuffix: true })
    : fallback;
};
// ---------------------------------------

// Group headlines by day, handling bad dates and sorting newest -> oldest
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

// Helper to show "Today / Yesterday / Month d, yyyy"
const formatTimelineDate = (dateLike: unknown) => {
  const d = toDate(dateLike);
  if (!d) return "Unknown Date";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = format(yest, "yyyy-MM-dd");
  const dStr = format(d, "yyyy-MM-dd");
  if (dStr === todayStr) return "Today";
  if (dStr === yestStr) return "Yesterday";
  return format(d, "MMMM d, yyyy");
};

// Optional impact styles/icons (kept for future use)
const getImpactColor = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case "high":
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20";
    case "low":
      return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20";
    default:
      return "text-muted-foreground bg-muted";
  }
};

const getImpactIcon = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case "high":
      return <TrendingDown className="h-3 w-3" />;
    case "medium":
      return <AlertTriangle className="h-3 w-3" />;
    case "low":
      return <TrendingUp className="h-3 w-3" />;
    default:
      return <TrendingUp className="h-3 w-3" />;
  }
};

export default function Headlines() {
  const [scope, setScope] = useState<"all" | "focus" | "watchlist">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [now, setNow] = useState(() => Date.now()); // rerender driver for relative time

  // tick so "x minutes ago" updates
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Focus assets & watchlist
  const { data: focusAssets = [] } = useQuery({
    queryKey: ["/api/focus-assets"],
    queryFn: () => api.getFocusAssets("default"),
  });

  const { data: watchlist = [] } = useQuery({
    queryKey: ["/api/watchlist"],
    queryFn: () => api.getWatchlist(),
  });

  const focusSymbols = useMemo(
    () => focusAssets.map((fa: any) => fa.symbol),
    [focusAssets],
  );
  const watchlistSymbols = useMemo(
    () => watchlist?.map((w: any) => w.symbol) ?? [],
    [watchlist],
  );

  const activeSymbols: string[] | undefined = useMemo(() => {
    if (scope === "focus") return focusSymbols;
    if (scope === "watchlist") return watchlistSymbols;
    return undefined; // "all"
  }, [scope, focusSymbols, watchlistSymbols]);

  // Headlines (real-time polling + proper scoping) — force real, no cache reuse
  const { data: headlines = [], isLoading } = useQuery({
    queryKey: ["/api/headlines/timeline", scope, activeSymbols],
    queryFn: () =>
      api.getHeadlinesTimeline(activeSymbols, scope, 100, {
        forceReal: true,
        noCache: true,
      }),
    enabled:
      scope === "all" ||
      (Array.isArray(activeSymbols) && activeSymbols.length > 0),

    // IMPORTANT: avoid stale/mock reuse
    refetchInterval: POLL_HEADLINES_MS,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchOnMount: "always",
    staleTime: 0,
    gcTime: 0,
    retry: 1,
    networkMode: "always",
    keepPreviousData: false,
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Headlines"
        subtitle="Real-time market news and sentiment analysis"
      />

      {/* optional visual flag if backend returns a mock payload */}
      {Array.isArray(headlines) && (headlines as any)._meta?.mock && (
        <div className="mx-4 md:mx-6 -mb-4">
          <span className="text-xs px-2 py-1 rounded bg-yellow-500/10 text-yellow-400">
            Showing MOCK headlines
          </span>
        </div>
      )}

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Search and Filters */}
        <div className="space-y-4 mb-6">
          <Input
            placeholder="Search headlines..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            data-testid="input-search"
          />

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
                data-testid="scope-watchlist"
                variant={scope === "watchlist" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("watchlist")}
                className="h-8"
                disabled={!watchlistSymbols.length}
              >
                Watchlist ({watchlistSymbols.length})
              </Button>
            </div>
          </div>

          {/* Active Filter Display */}
          {scope !== "all" && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {scope === "focus" ? "Focus Assets:" : "Watchlist:"}
              </span>
              {(scope === "focus" ? focusSymbols : watchlistSymbols).map(
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

        {/* Timeline Headlines */}
        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-4">
                <div className="h-6 bg-muted rounded w-24"></div>
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <Card key={j} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {headlines && headlines.length > 0 ? (
              groupHeadlinesByDate(
                headlines.filter(
                  (h: any) =>
                    !searchTerm ||
                    h.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    h.summary?.toLowerCase().includes(searchTerm.toLowerCase()),
                ),
              ).map(([dateKey, dateHeadlines]) => (
                <div key={dateKey} className="relative">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-primary">
                          {formatTimelineDate(
                            (dateHeadlines as Headline[])[0]?.published,
                          )}
                        </span>
                      </div>
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs text-muted-foreground">
                        {(dateHeadlines as Headline[]).length} headlines
                      </span>
                    </div>
                  </div>

                  {/* Timeline Items */}
                  <div className="space-y-4 relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-border"></div>

                    {(dateHeadlines as Headline[]).map((headline) => (
                      <div key={headline.id as any} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute left-4 w-4 h-4 bg-background border-2 border-primary rounded-full z-10">
                          <div className="absolute inset-1 bg-primary rounded-full"></div>
                        </div>

                        {/* Timeline content */}
                        <div className="ml-12">
                          <Card className="hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-foreground leading-tight mb-2">
                                    {headline.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium">
                                      {(headline as any).source}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {safeFormat(headline.published, "h:mm a")}
                                    </span>
                                    <span>•</span>
                                    <span>
                                      {safeDistance(headline.published, now)}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {headline.summary && (
                                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                  {headline.summary}
                                </p>
                              )}

                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-wrap">
                                  {(headline as any).symbols?.length > 0 && (
                                    <div className="flex gap-1">
                                      {(headline as any).symbols
                                        .slice(0, 4)
                                        .map((symbol: string) => (
                                          <Badge
                                            key={symbol}
                                            variant="secondary"
                                            className="text-xs"
                                          >
                                            {symbol}
                                          </Badge>
                                        ))}
                                      {(headline as any).symbols.length > 4 && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          +
                                          {(headline as any).symbols.length - 4}{" "}
                                          more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {(headline as any).url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    asChild
                                    className="h-8 px-3"
                                  >
                                    <a
                                      href={(headline as any).url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs"
                                    >
                                      Read more
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="text-muted-foreground">
                    <Newspaper className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="font-medium mb-2">No headlines found</h3>
                    <p className="text-sm">
                      {scope === "focus"
                        ? "No news found for your focus assets. Try adding more assets or switch to all headlines."
                        : scope === "watchlist"
                          ? "No news found for your watchlist. Try adding more symbols or switch to all headlines."
                          : "Try adjusting your search terms or check back later for new headlines."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
