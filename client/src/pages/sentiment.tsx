import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { SentimentGauge } from "@/components/ui/sentiment-gauge";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  MessageSquare, 
  Loader2,
  Brain,
  BarChart3,
  LineChart,
  Volume2,
  Newspaper
} from "lucide-react";
import type { EnhancedMarketSentiment, SentimentNarrative } from "@shared/schema";

export default function SentimentPage() {
  const [contextNote, setContextNote] = useState("");
  const [narrative, setNarrative] = useState<SentimentNarrative | null>(null);
  const { toast } = useToast();

  // Fetch enhanced sentiment data
  const { data: sentiment, isLoading, refetch } = useQuery({
    queryKey: ["/api/sentiment/index"],
    queryFn: () => api.getEnhancedSentiment(),
    refetchInterval: 2 * 60 * 1000, // Refresh every 2 minutes
  });

  // Generate AI narrative mutation
  const narrativeMutation = useMutation({
    mutationFn: ({ indexPayload, contextNote }: { indexPayload: EnhancedMarketSentiment; contextNote?: string }) =>
      api.getSentimentNarrative(indexPayload, contextNote),
    onSuccess: (data) => {
      setNarrative(data);
      toast({
        title: "AI Analysis Generated",
        description: "Market sentiment analysis is ready",
      });
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleGenerateNarrative = () => {
    if (!sentiment) return;
    narrativeMutation.mutate({ 
      indexPayload: sentiment, 
      contextNote: contextNote.trim() || undefined 
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 30) return "text-yellow-500";
    return "text-red-500";
  };

  const getRegimeColor = (regime: string) => {
    switch (regime.toLowerCase()) {
      case "bullish": return "bg-green-100 text-green-800 border-green-200";
      case "bearish": return "bg-red-100 text-red-800 border-red-200";
      case "neutral": return "bg-gray-100 text-gray-800 border-gray-200";
      case "volatile": return "bg-orange-100 text-orange-800 border-orange-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSubScoreIcon = (type: string) => {
    switch (type) {
      case "price": return <TrendingUp className="h-5 w-5" />;
      case "volume": return <Volume2 className="h-5 w-5" />;
      case "news": return <Newspaper className="h-5 w-5" />;
      case "options": return <BarChart3 className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Market Sentiment" subtitle="AI-powered market sentiment analysis" />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-muted rounded w-1/3"></div>
                    <div className="h-32 bg-muted rounded"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-16 bg-muted rounded"></div>
                      <div className="h-16 bg-muted rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!sentiment) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Market Sentiment" subtitle="AI-powered market sentiment analysis" />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardContent className="p-6 text-center">
              <div className="text-muted-foreground">
                Failed to load sentiment data
              </div>
              <Button onClick={() => refetch()} className="mt-4">
                Retry
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Market Sentiment" 
        subtitle="AI-powered market sentiment analysis"
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Sentiment Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI Sentiment Index
                  </CardTitle>
                  <Badge 
                    variant="outline" 
                    className={`${getRegimeColor(sentiment.regime)} border`}
                  >
                    {sentiment.regime}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center mb-6">
                  <SentimentGauge score={sentiment.score} size="lg" />
                </div>
                
                <div className="text-center mb-6">
                  <div className={`text-4xl font-bold ${getScoreColor(sentiment.score)}`}>
                    {sentiment.score}/100
                  </div>
                  <div className="text-sm text-muted-foreground">AI Sentiment Score</div>
                </div>

                {/* Sentiment Drivers */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Key Market Drivers</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {sentiment.drivers.map((driver, index) => (
                      <Card key={index} className="border-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{driver.label}</span>
                            <Badge 
                              variant="outline"
                              className={`${
                                driver.contribution > 0 ? 'border-green-500 text-green-700' : 
                                driver.contribution < 0 ? 'border-red-500 text-red-700' : 
                                'border-gray-500 text-gray-700'
                              }`}
                            >
                              {driver.contribution > 0 ? '+' : ''}{driver.contribution.toFixed(1)}
                            </Badge>
                          </div>
                          <div className="mt-2">
                            <Progress 
                              value={Math.abs(driver.contribution) * 10} 
                              className={`h-2 ${
                                driver.contribution > 0 ? '[&>div]:bg-green-500' : 
                                driver.contribution < 0 ? '[&>div]:bg-red-500' : 
                                '[&>div]:bg-gray-500'
                              }`} 
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Analysis Panel */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  AI Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Context Note (Optional)
                  </label>
                  <Textarea
                    placeholder="Add context about current market conditions, recent events, or specific concerns..."
                    value={contextNote}
                    onChange={(e) => setContextNote(e.target.value)}
                    className="min-h-[100px] resize-none"
                    maxLength={500}
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    {contextNote.length}/500 characters
                  </div>
                </div>

                <Button 
                  onClick={handleGenerateNarrative}
                  disabled={narrativeMutation.isPending}
                  className="w-full"
                >
                  {narrativeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate AI Analysis
                    </>
                  )}
                </Button>

                {narrative && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">AI Analysis</h4>
                          <p className="text-sm text-foreground">
                            {narrative.summary}
                          </p>
                        </div>
                        
                        {narrative.bullets.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
                            <ul className="space-y-1">
                              {narrative.bullets.map((bullet, index) => (
                                <li key={index} className="text-xs text-muted-foreground flex items-start">
                                  <span className="w-1 h-1 bg-primary rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                  {bullet}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground pt-2 border-t">
                          Generated: {narrative.as_of}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Market Context */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Market Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-sm mb-3">Current Regime</h4>
                <Badge 
                  variant="outline" 
                  className={`${getRegimeColor(sentiment.regime)} border text-lg px-4 py-2`}
                >
                  {sentiment.regime}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Market sentiment classification based on current conditions
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-sm mb-3">Last Updated</h4>
                <div className="text-sm text-foreground">
                  {sentiment.as_of}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Sentiment data is updated continuously throughout market hours
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}