import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar, TrendingUp, TrendingDown, DollarSign, Target, Lightbulb, FileText, ChevronDown, AlertTriangle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/constants";
import { format, addDays, subDays } from "date-fns";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import { useEarningsTranscriptSummary } from "@/hooks/useEarningsTranscriptSummary";
import { Link } from "wouter";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { useToast } from "@/hooks/use-toast";

export default function Earnings() {
  const [timeframe, setTimeframe] = useState<string>("this_week");
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteSymbol, setPasteSymbol] = useState("");
  const [pasteText, setPasteText] = useState("");
  const { toast } = useToast();
  const { focusAssets } = useFocusAssets();
  const focusSymbols = focusAssets.map(a => a.symbol);

  const { data: earnings, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/earnings/upcoming"],
    queryFn: () => api.getUpcomingEarnings(),
  });

  const transcriptSymbol = focusSymbols[0] ?? earnings?.[0]?.symbol;
  const { data: transcriptSummary, isLoading: transcriptLoading } = useEarningsTranscriptSummary(
    transcriptSymbol ?? undefined
  );

  const analyzeMutation = useMutation({
    mutationFn: (opts: { symbol?: string; transcriptText: string; date?: string }) =>
      api.analyzeEarningsTranscript(opts),
    onSuccess: (data) => {
      setAnalyzedSummary(data);
      toast({ title: "Transcript analyzed", description: `Tone: ${data.toneLabel}, Risk: ${data.riskLevel}` });
    },
    onError: () => toast({ title: "Analysis failed", variant: "destructive" }),
  });
  const [analyzedSummary, setAnalyzedSummary] = useState<typeof transcriptSummary | null>(null);

  const displaySummary = analyzedSummary ?? transcriptSummary;

  const getTimeframeLabel = (tf: string) => {
    switch (tf) {
      case "today": return "Today";
      case "this_week": return "This Week";
      case "next_week": return "Next Week";
      case "this_month": return "This Month";
      default: return "This Week";
    }
  };

  const getSurpriseColor = (surprise: number) => {
    if (surprise > 5) return "text-green-600 dark:text-green-400";
    if (surprise < -5) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getSurpriseIcon = (surprise: number) => {
    if (surprise > 5) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (surprise < -5) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Earnings Calendar" 
        subtitle="Upcoming earnings reports with AI-powered predictions"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="next_week">Next Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => refetch()} variant="outline" data-testid="button-refresh-earnings">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Earnings Grid */}
        {error ? (
          <Card className="text-center py-12" data-testid="error-earnings">
            <CardContent>
              <Calendar className="h-12 w-12 text-danger mx-auto mb-4" />
              <p className="text-danger font-medium mb-2">Failed to load earnings data</p>
              <p className="text-muted-foreground text-sm mb-4">Unable to retrieve earnings calendar. Please try again.</p>
              <Button onClick={() => refetch()} variant="outline" data-testid="button-retry-earnings">
                <Calendar className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-20"></div>
                  <div className="h-4 bg-muted rounded w-32"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {earnings?.map((earning) => (
              <Card key={`${earning.symbol}-${earning.date}`} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">
                      {earning.symbol}
                    </CardTitle>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(earning.date), "MMM dd")}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">
                    {earning.sector}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Estimates */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground">EPS Estimate</div>
                      <div className="font-medium">
                        {earning.eps_est ? formatCurrency(earning.eps_est) : "N/A"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Sector</div>
                      <div className="font-medium">
                        {earning.sector}
                      </div>
                    </div>
                  </div>

                  {/* Coming Soon Features */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="text-sm font-medium mb-2">Features Coming Soon</div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>• Historical earnings performance</div>
                      <div>• AI-powered surprise predictions</div>
                      <div>• Market impact analysis</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Transcript insights: summary, tone, risk language */}
        {(transcriptSymbol || displaySummary) && (
          <Card className="mt-6" data-testid="card-transcript-insights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Transcript Insights
                {transcriptSymbol && (
                  <Badge variant="secondary" className="font-normal">{transcriptSymbol}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {transcriptLoading && !displaySummary ? (
                <div className="h-20 bg-muted/30 rounded animate-pulse" />
              ) : displaySummary ? (
                <>
                  <p className="text-sm text-foreground">{displaySummary.summary}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      Tone: {displaySummary.toneLabel} ({displaySummary.toneScore}/10)
                    </Badge>
                    {displaySummary.previousToneScore != null && (
                      <Badge variant="secondary">
                        Prior quarter: {displaySummary.previousToneScore}/10
                      </Badge>
                    )}
                    <Badge
                      variant={displaySummary.riskLevel === "high" ? "destructive" : displaySummary.riskLevel === "medium" ? "default" : "secondary"}
                    >
                      Risk: {displaySummary.riskLevel}
                    </Badge>
                  </div>
                  {displaySummary.riskPhrases && displaySummary.riskPhrases.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Risk language detected
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {displaySummary.riskPhrases.map((p, i) => (
                          <Badge key={i} variant="outline" className="text-xs font-normal">
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    As of {displaySummary.as_of ? format(new Date(displaySummary.as_of), "PPp") : "—"}
                  </p>
                </>
              ) : null}

              <Collapsible open={pasteOpen} onOpenChange={setPasteOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1 -ml-2">
                    <ChevronDown className={`h-4 w-4 transition-transform ${pasteOpen ? "rotate-180" : ""}`} />
                    Paste transcript to analyze
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Symbol (e.g. AAPL)"
                    value={pasteSymbol}
                    onChange={(e) => setPasteSymbol(e.target.value)}
                    className="flex h-9 w-32 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  />
                  <Textarea
                    placeholder="Paste earnings call transcript text..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    className="min-h-[120px] text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={!pasteText.trim() || analyzeMutation.isPending}
                    onClick={() =>
                      analyzeMutation.mutate({
                        symbol: pasteSymbol.trim() || undefined,
                        transcriptText: pasteText.trim(),
                      })
                    }
                  >
                    {analyzeMutation.isPending ? "Analyzing…" : "Analyze"}
                  </Button>
                </CollapsibleContent>
              </Collapsible>
            </CardContent>
          </Card>
        )}

        {earnings?.length === 0 && !isLoading && (
          <EmptyStateCard
            title="No earnings reports scheduled"
            description={`No earnings reports found for ${getTimeframeLabel(timeframe).toLowerCase()}. Try selecting a different timeframe.`}
            actionLabel="Refresh"
            onAction={() => refetch()}
            icon={<Calendar className="h-10 w-10 text-muted-foreground" />}
            data-testid="empty-earnings"
          />
        )}

        {/* Lens Tip - Show when no focus assets */}
        {!isLoading && !error && focusSymbols.length === 0 && earnings && earnings.length > 0 && (
          <Card className="mt-6 bg-primary/5 border-primary/20" data-testid="earnings-lens-tip">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Track earnings for your assets</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add focus assets to highlight earnings reports that matter most to your portfolio.
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
      </main>
    </div>
  );
}