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
              {(scope === "focus" ? focusAssets : watchlist?.map(w => w.symbol) || []).map((symbol) => (
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