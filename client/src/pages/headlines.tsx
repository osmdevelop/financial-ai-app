import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Search, Clock, Filter, Zap, AlertCircle } from "lucide-react";
import { formatDistance, format, isToday, isYesterday } from "date-fns";

export default function Headlines() {
  const [focusOnly, setFocusOnly] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [focusAssets, setFocusAssets] = useState<string[]>([]);

  // Get portfolios for focus assets
  const { data: portfolios } = useQuery({
    queryKey: ["/api/portfolios"],
    queryFn: () => api.getPortfolios(),
  });

  const demoPortfolioId = portfolios?.[0]?.id;

  // Get focus assets for filtering
  const { data: focusAssetsData } = useQuery({
    queryKey: ["/api/focus-assets", demoPortfolioId],
    queryFn: () => api.getFocusAssets(demoPortfolioId!),
    enabled: !!demoPortfolioId,
  });

  useEffect(() => {
    if (focusAssetsData) {
      setFocusAssets(focusAssetsData.map(asset => asset.symbol));
    }
  }, [focusAssetsData]);

  const { data: headlines, isLoading, refetch } = useQuery({
    queryKey: ["/api/headlines/timeline", focusOnly ? focusAssets : undefined],
    queryFn: () => api.getHeadlinesTimeline(focusOnly ? focusAssets : undefined, 100),
    enabled: !focusOnly || focusAssets.length > 0,
  });

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative": return <TrendingDown className="h-4 w-4 text-red-500" />;
      case "high": return <Zap className="h-4 w-4 text-orange-500" />;
      case "medium": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "negative": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "high": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const formatTimelineDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM dd");
  };

  const groupHeadlinesByDate = (headlines: any[]) => {
    const groups: Record<string, any[]> = {};
    headlines.forEach(headline => {
      const date = format(new Date(headline.published), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(headline);
    });
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Market Headlines" 
        subtitle="Latest market news with AI-powered impact analysis"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Enhanced Filters */}
        <div className="flex flex-col gap-4 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search headlines..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="focus-only"
                  checked={focusOnly}
                  onCheckedChange={setFocusOnly}
                />
                <Label htmlFor="focus-only" className="text-sm">
                  Focus Assets Only ({focusAssets.length})
                </Label>
              </div>
              
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
          
          {focusOnly && focusAssets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground mr-2">Tracking:</span>
              {focusAssets.map((symbol) => (
                <Badge key={symbol} variant="secondary" className="text-xs">
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
                                
                                {headline.impact && (
                                  <div className="flex-shrink-0">
                                    <Badge 
                                      variant="outline"
                                      className={`${getImpactColor(headline.impact)} border`}
                                    >
                                      <span className="flex items-center gap-1">
                                        {getImpactIcon(headline.impact)}
                                        <span className="capitalize text-xs">{headline.impact}</span>
                                      </span>
                                    </Badge>
                                  </div>
                                )}
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
                                      {headline.symbols.slice(0, 4).map((symbol) => (
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
                      {focusOnly 
                        ? "No news found for your focus assets. Try adding more assets or switch to all headlines."
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