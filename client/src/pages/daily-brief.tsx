import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useMarketRegimeSnapshot } from "@/hooks/useMarketRegimeSnapshot";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import { useTraderLensContext } from "@/hooks/useTraderLensContext";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Eye,
  Target,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "wouter";

interface DailySummaryResponse {
  summary: string[];
  generatedAt: string;
}

type TradeLevel = "Green" | "Yellow" | "Red";

export default function DailyBrief() {
  const [aiSummaryOpen, setAiSummaryOpen] = useState(false);
  const { focusAssets } = useFocusAssets();
  const lensContext = useTraderLensContext();
  const focusSymbols = focusAssets.map(a => a.symbol);

  const {
    snapshot: regimeSnapshot,
    isLoading: regimeLoading,
    isMock: regimeIsMock,
  } = useMarketRegimeSnapshot();

  const {
    data: sentiment,
    isLoading: sentimentLoading,
  } = useQuery({
    queryKey: ["/api/sentiment/index"],
    queryFn: () => api.getEnhancedSentiment(),
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: trumpIndex,
    isLoading: policyLoading,
  } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    queryFn: () => api.getTrumpIndex(),
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: fedspeak,
    isLoading: fedLoading,
  } = useQuery({
    queryKey: ["/api/policy/fedspeak"],
    queryFn: () => api.getFedspeak(),
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: headlines,
    isLoading: headlinesLoading,
  } = useQuery({
    queryKey: ["/api/headlines/timeline", "lens", focusSymbols],
    queryFn: () => api.getHeadlinesTimeline(
      focusSymbols.length > 0 ? focusSymbols : undefined,
      focusSymbols.length > 0 ? "focus" : "all",
      10
    ),
    refetchInterval: 5 * 60 * 1000,
  });

  const {
    data: econEvents,
    isLoading: econLoading,
  } = useQuery({
    queryKey: ["/api/econ/upcoming"],
    queryFn: () => api.getEconomicEvents(7),
    refetchInterval: 10 * 60 * 1000,
  });

  const {
    data: aiSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["/api/daily-brief/summary"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/daily-brief/summary");
      return res.json() as Promise<DailySummaryResponse>;
    },
    refetchInterval: 15 * 60 * 1000,
    retry: 1,
  });

  const summaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/daily-brief/generate");
      return res.json();
    },
    onSuccess: () => {
      refetchSummary();
    },
  });

  const isLoading = regimeLoading || sentimentLoading || policyLoading || fedLoading;
  const isMockData = regimeIsMock || regimeSnapshot?.meta?.isMock;

  const generateMarketCall = useMemo(() => {
    if (!regimeSnapshot && !sentiment) {
      return { text: "Market conditions are being assessed.", level: "Yellow" as TradeLevel };
    }

    const regime = regimeSnapshot?.regime || sentiment?.regime || "Neutral";
    const volatility = sentiment?.score !== undefined 
      ? (sentiment.score > 60 ? "low" : sentiment.score > 40 ? "normal" : "elevated")
      : "unknown";
    const policyRisk = trumpIndex?.zScore !== undefined
      ? (trumpIndex.zScore > 1.5 ? "high" : trumpIndex.zScore > 0.5 ? "moderate" : "low")
      : "unknown";

    let text = "";
    let level: TradeLevel = "Yellow";

    if (regime === "Risk-Off" || regime === "Policy Shock") {
      text = policyRisk === "high" 
        ? "Risk-off regime with elevated policy uncertainty — caution advised."
        : "Risk-off conditions detected — reduced exposure may be prudent.";
      level = "Red";
    } else if (regime === "Risk-On") {
      if (volatility === "low" && policyRisk !== "high") {
        text = "Risk-on with low volatility — conditions appear favorable.";
        level = "Green";
      } else if (policyRisk === "high") {
        text = "Risk-on but policy uncertainty elevated — selective positioning.";
        level = "Yellow";
      } else {
        text = "Risk-on conditions — market appears constructive.";
        level = "Green";
      }
    } else {
      if (volatility === "elevated") {
        text = "Conditions are mixed with elevated volatility — selective trading only.";
        level = "Yellow";
      } else {
        text = "Conditions are neutral — no strong directional bias.";
        level = "Yellow";
      }
    }

    return { text, level };
  }, [regimeSnapshot, sentiment, trumpIndex]);

  const whatChanged = useMemo(() => {
    const changes: string[] = [];

    if (regimeSnapshot?.changedSinceYesterday) {
      changes.push(`Regime shifted to ${regimeSnapshot.regime}`);
    }

    if (fedspeak?.change7d && Math.abs(fedspeak.change7d) > 0.5) {
      const direction = fedspeak.change7d > 0 ? "more hawkish" : "more dovish";
      changes.push(`Fed tone shifted ${direction} over the past week`);
    }

    if (trumpIndex?.change7d && Math.abs(trumpIndex.change7d) > 0.3) {
      const direction = trumpIndex.change7d > 0 ? "increased" : "decreased";
      changes.push(`Policy risk ${direction} over the past week`);
    }

    return changes.slice(0, 3);
  }, [regimeSnapshot, fedspeak, trumpIndex]);

  const lensExposures = useMemo(() => {
    if (focusAssets.length === 0) return [];

    const exposures: { risk: string; asset: string }[] = [];
    const policyZ = trumpIndex?.zScore ?? 0;
    const volatilityScore = sentiment?.score ?? 50;

    focusAssets.forEach(asset => {
      if (policyZ > 1) {
        exposures.push({ risk: "Policy risk", asset: asset.symbol });
      }
      if (volatilityScore < 40) {
        exposures.push({ risk: "Volatility", asset: asset.symbol });
      }
      if (!exposures.some(e => e.asset === asset.symbol)) {
        exposures.push({ risk: "Market regime", asset: asset.symbol });
      }
    });

    return exposures.slice(0, 2);
  }, [focusAssets, trumpIndex, sentiment]);

  const lensHeadlines = useMemo(() => {
    if (!headlines || focusSymbols.length === 0) return [];
    
    return (headlines || [])
      .filter((h: any) => {
        if (!h.symbols) return false;
        return h.symbols.some((s: string) =>
          focusSymbols.some(fs => 
            s.toLowerCase().includes(fs.toLowerCase()) || 
            fs.toLowerCase().includes(s.toLowerCase())
          )
        );
      })
      .slice(0, 3);
  }, [headlines, focusSymbols]);

  const watchNext = useMemo(() => {
    let events: any[] = [];
    if (econEvents) {
      events = Array.isArray(econEvents) ? econEvents : (econEvents.events || []);
    }
    if (events.length === 0) return null;

    const upcoming = events
      .filter((e: any) => new Date(e.date) > new Date())
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (upcoming.length === 0) return null;

    const event = upcoming[0];
    const isToday = new Date(event.date).toDateString() === new Date().toDateString();
    const isTomorrow = new Date(event.date).toDateString() === 
      new Date(Date.now() + 86400000).toDateString();

    const timeLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : format(new Date(event.date), "EEE");
    
    return {
      title: event.event || event.name || "Economic event",
      time: timeLabel,
      impact: event.importance || event.impact || "medium",
    };
  }, [econEvents]);

  const getHeadlineCategory = (headline: any): string => {
    const title = (headline.title || "").toLowerCase();
    if (title.includes("fed") || title.includes("rate") || title.includes("powell")) return "Macro";
    if (title.includes("tariff") || title.includes("trump") || title.includes("policy")) return "Policy";
    if (title.includes("earnings") || title.includes("profit") || title.includes("revenue")) return "Earnings";
    return "Market";
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "recently";
    }
  };

  const getTradeLevelBadge = (level: TradeLevel) => {
    const styles = {
      Green: "bg-green-500/15 text-green-600 border-green-500/30",
      Yellow: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
      Red: "bg-red-500/15 text-red-600 border-red-500/30",
    };
    return styles[level];
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Daily Brief"
        subtitle={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 max-w-4xl mx-auto w-full">
        {/* Informational Banner - Subtle */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid="info-banner">
          <Info className="h-3 w-3" />
          <span>Informational only. Not investment advice.</span>
        </div>

        {/* SECTION 1: Today's Market Call (HERO) */}
        <section data-testid="daily-call">
          <Card className="border-2 bg-card/50">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-2xl lg:text-3xl font-semibold leading-tight">
                    {generateMarketCall.text}
                  </h2>
                  <Badge 
                    variant="outline" 
                    className={`text-sm px-3 py-1 ${getTradeLevelBadge(generateMarketCall.level)}`}
                    data-testid="trade-level-badge"
                  >
                    {generateMarketCall.level === "Green" && "Favorable conditions"}
                    {generateMarketCall.level === "Yellow" && "Mixed conditions"}
                    {generateMarketCall.level === "Red" && "Elevated caution"}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECTION 2: What Changed (or Didn't) */}
        <section data-testid="daily-changes">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            What Changed
          </h3>
          <Card>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : whatChanged.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No major regime changes since yesterday.
                </p>
              ) : (
                <ul className="space-y-2">
                  {whatChanged.map((change, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECTION 3: Your Lens Impact */}
        <section data-testid="lens-impact">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Your Lens Impact
          </h3>
          <Card>
            <CardContent className="p-4">
              {focusAssets.length === 0 ? (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    No focus assets selected.
                  </p>
                  <Link href="/settings">
                    <Button variant="ghost" size="sm" className="text-xs gap-1">
                      <Target className="h-3 w-3" />
                      Add focus assets
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">
                    Your focus assets are currently most exposed to:
                  </p>
                  {lensExposures.length > 0 ? (
                    <ul className="space-y-1">
                      {lensExposures.map((exp, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-primary">•</span>
                          <span>{exp.risk} via <span className="font-medium">{exp.asset}</span></span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No significant exposures identified.
                    </p>
                  )}
                  <div className="flex items-center gap-1 pt-1">
                    <span className="text-xs text-muted-foreground">Tracking:</span>
                    {focusSymbols.map(s => (
                      <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECTION 4: Headlines That Matter (Max 3) */}
        <section data-testid="lens-headlines">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Headlines That Matter
            </h3>
            <Link href="/news">
              <Button variant="ghost" size="sm" className="text-xs gap-1 h-7">
                View all
                <ExternalLink className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-4">
              {headlinesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : focusSymbols.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add focus assets to see relevant headlines.
                </p>
              ) : lensHeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No significant headlines for your focus assets today.
                </p>
              ) : (
                <ul className="space-y-3">
                  {lensHeadlines.map((h: any, idx: number) => (
                    <li 
                      key={idx} 
                      className="pb-3 last:pb-0 border-b last:border-0 border-border/50"
                      data-testid={`headline-item-${idx}`}
                    >
                      <p className="text-sm font-medium leading-snug mb-1">{h.title}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {getHeadlineCategory(h)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {h.source || "Market news"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECTION 5: What to Watch Next */}
        <section data-testid="watch-next">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            What to Watch Next
          </h3>
          <Card>
            <CardContent className="p-4">
              {econLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : !watchNext ? (
                <p className="text-sm text-muted-foreground">
                  No major catalysts on the immediate horizon.
                </p>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{watchNext.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {watchNext.time} — {watchNext.impact} impact expected
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* SECTION 6: AI Summary (Collapsible, Collapsed by Default) */}
        <section data-testid="ai-summary">
          <Collapsible open={aiSummaryOpen} onOpenChange={setAiSummaryOpen}>
            <Card>
              <CollapsibleTrigger asChild>
                <CardContent className="p-4 cursor-pointer hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Read AI Summary</span>
                    </div>
                    {aiSummaryOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 pb-4 px-4 border-t border-border/50">
                  {summaryLoading || summaryMutation.isPending ? (
                    <div className="space-y-2 py-2">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-4 w-full" />
                      ))}
                    </div>
                  ) : aiSummary?.summary?.length ? (
                    <div className="space-y-3 py-2">
                      {aiSummary.summary.map((sentence, idx) => (
                        <p key={idx} className="text-sm leading-relaxed">
                          {sentence}
                        </p>
                      ))}
                      <p className="text-xs text-muted-foreground pt-2">
                        Generated {aiSummary.generatedAt ? formatTimestamp(aiSummary.generatedAt) : "recently"}
                      </p>
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-sm text-muted-foreground mb-3">
                        No summary available.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => summaryMutation.mutate()}
                        disabled={summaryMutation.isPending}
                        data-testid="button-generate-summary"
                      >
                        <Eye className="w-3 h-3 mr-2" />
                        Generate Summary
                      </Button>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </section>

        {/* Data Freshness Footer */}
        <footer className="pt-4 pb-8 border-t border-border/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>
                Data as of {sentiment?.as_of ? formatTimestamp(sentiment.as_of) : "recently"}
              </span>
            </div>
            {isMockData && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>Some inputs unavailable — view with caution.</span>
              </div>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}
