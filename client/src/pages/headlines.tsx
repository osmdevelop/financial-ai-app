import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Clock, ExternalLink, Newspaper, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { format, formatDistance } from "date-fns";
import type { Headline } from "@shared/schema";

// Helper function to group headlines by date
const groupHeadlinesByDate = (headlines: Headline[]) => {
  const grouped = headlines.reduce((acc, headline) => {
    const date = format(new Date(headline.published), "yyyy-MM-dd");
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(headline);
    return acc;
  }, {} as Record<string, Headline[]>);

  return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
};

// Helper function to format timeline date
const formatTimelineDate = (dateStr: string) => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return "Unknown Date";
    }
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
      return "Today";
    } else if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
      return "Yesterday";
    } else {
      return format(date, "MMMM d, yyyy");
    }
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Unknown Date";
  }
};

// Helper function to get impact color
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

// Helper function to get impact icon
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

  const { data: headlines, isLoading } = useQuery({
    queryKey: ["/api/headlines/timeline"],
    queryFn: () => api.getHeadlinesTimeline(),
  });

  const { data: focusAssets = [] } = useQuery({
    queryKey: ["/api/focus-assets"],
    queryFn: () => api.getFocusAssets("default"),
  });

  const { data: watchlist = [] } = useQuery({
    queryKey: ["/api/watchlist"],
    queryFn: () => api.getWatchlist(),
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Headlines" 
        subtitle="Real-time market news and sentiment analysis"
      />
      
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
                disabled={!focusAssets.length}
              >
                Focus Assets ({focusAssets.length})
              </Button>
              <Button
                data-testid="scope-watchlist"
                variant={scope === "watchlist" ? "default" : "outline"}
                size="sm"
                onClick={() => setScope("watchlist")}
                className="h-8"
                disabled={!watchlist?.length}
              >
                Watchlist ({watchlist?.length || 0})
              </Button>
            </div>
          </div>
          
          {/* Active Filter Display */}
          {scope !== "all" && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">
                {scope === "focus" ? "Focus Assets:" : "Watchlist:"}
              </span>
              {(scope === "focus" ? focusAssets.map(fa => fa.symbol) : watchlist?.map(w => w.symbol) || []).map((symbol) => (
                <Badge key={symbol} variant="secondary" className="text-xs" data-testid={`badge-${symbol}`}>
                  {symbol}
                </Badge>
              ))}
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
                headlines.filter(h => 
                  !searchTerm || 
                  h.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  h.summary?.toLowerCase().includes(searchTerm.toLowerCase())
                )
              ).map(([date, dateHeadlines]) => (
                <div key={date} className="relative">
                  {/* Date Header */}
                  <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-primary">
                          {formatTimelineDate(dateHeadlines[0].published)}
                        </span>
                      </div>
                      <div className="h-px bg-border flex-1"></div>
                      <span className="text-xs text-muted-foreground">
                        {dateHeadlines.length} headlines
                      </span>
                    </div>
                  </div>

                  {/* Timeline Items */}
                  <div className="space-y-4 relative">
                    {/* Timeline line */}
                    <div className="absolute left-6 top-0 bottom-0 w-px bg-border"></div>
                    
                    {dateHeadlines.map((headline, index) => (
                      <div key={headline.id} className="relative">
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
                                    <span className="font-medium">{headline.source}</span>
                                    <span>•</span>
                                    <span>{format(new Date(headline.published), "h:mm a")}</span>
                                    <span>•</span>
                                    <span>{formatDistance(new Date(headline.published), new Date(), { addSuffix: true })}</span>
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
                                  {headline.symbols && headline.symbols.length > 0 && (
                                    <div className="flex gap-1">
                                      {headline.symbols.slice(0, 4).map((symbol: string) => (
                                        <Badge key={symbol} variant="secondary" className="text-xs">
                                          {symbol}
                                        </Badge>
                                      ))}
                                      {headline.symbols.length > 4 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{headline.symbols.length - 4} more
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {headline.url && (
                                  <Button variant="ghost" size="sm" asChild className="h-8 px-3">
                                    <a 
                                      href={headline.url} 
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
                        : "Try adjusting your search terms or check back later for new headlines."
                      }
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