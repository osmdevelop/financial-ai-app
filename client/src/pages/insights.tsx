import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Brain, Sparkles, Info, TrendingUp, Shield, Activity, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatPercent } from "@/lib/constants";
import type { AIInsightResponse } from "@shared/schema";

export default function Insights() {
  const [inputText, setInputText] = useState(
    "Analyze the recent performance of tech stocks and their impact on my portfolio diversification strategy."
  );
  const [insights, setInsights] = useState<AIInsightResponse | null>(null);
  const { toast } = useToast();

  // Get portfolio data for context
  const { data: portfolios } = useQuery({
    queryKey: ["/api/portfolios"],
    queryFn: () => api.getPortfolios(),
  });

  const demoPortfolioId = portfolios?.[0]?.id;

  const { data: portfolioData } = useQuery({
    queryKey: ["/api/portfolios", demoPortfolioId],
    queryFn: () => api.getPortfolioDetails(demoPortfolioId!),
    enabled: !!demoPortfolioId,
  });

  const { data: marketSentiment } = useQuery({
    queryKey: ["/api/sentiment"],
    queryFn: () => api.getMarketSentiment(),
  });

  // Fetch policy context data
  const { data: trumpIndex } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    queryFn: () => api.getTrumpIndex(),
  });

  const { data: fedspeak } = useQuery({
    queryKey: ["/api/policy/fedspeak"],
    queryFn: () => api.getFedspeak(),
  });

  const insightsMutation = useMutation({
    mutationFn: api.getInsights,
    onSuccess: (data) => {
      setInsights(data);
    },
    onError: () => {
      toast({
        title: "Failed to generate insights",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleExplain = () => {
    if (!inputText.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some text to analyze.",
        variant: "destructive",
      });
      return;
    }
    
    insightsMutation.mutate(inputText);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="AI Market Insights" 
        subtitle="Get AI-powered analysis and market intelligence"
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl">
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-2">AI Market Insights</h3>
            <p className="text-sm text-muted-foreground">
              Get AI-powered analysis and insights about market trends and your portfolio
            </p>
          </div>

          {/* Context Panel */}
          {portfolioData && marketSentiment && (
            <Card className="mb-6 bg-muted/30">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  Current Context
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Portfolio P&L */}
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Portfolio P&L Today</span>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${(portfolioData.summary.dailyPnL || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {(portfolioData.summary.dailyPnL || 0) >= 0 ? '+' : ''}{formatCurrency(portfolioData.summary.dailyPnL || 0)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatPercent(portfolioData.summary.dailyPnLPercent || 0)} vs yesterday
                      </p>
                    </div>
                  </div>

                  {/* Market Sentiment */}
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Market Sentiment</span>
                    </div>
                    <div className="space-y-1">
                      <p className={`text-lg font-bold ${
                        marketSentiment.score >= 70 ? 'text-success' : 
                        marketSentiment.score >= 40 ? 'text-warning' : 'text-danger'
                      }`}>
                        {marketSentiment.score}/100
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {marketSentiment.score >= 70 ? 'Bullish' : 
                         marketSentiment.score >= 40 ? 'Neutral' : 'Bearish'} sentiment
                      </p>
                    </div>
                  </div>

                  {/* Top Mover */}
                  <div className="bg-card rounded-lg p-4 border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">Top Mover</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-foreground">
                        {portfolioData.summary.topMover?.symbol || "N/A"}
                      </p>
                      <p className={`text-xs font-medium ${(portfolioData.summary.topMover?.change || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                        {portfolioData.summary.topMover?.change ? (
                          `${portfolioData.summary.topMover.change >= 0 ? '+' : ''}${formatCurrency(portfolioData.summary.topMover.change)}`
                        ) : "No data"}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Key Drivers:</span>
                  {marketSentiment.drivers.slice(0, 3).map((driver, index) => (
                    <Badge 
                      key={index} 
                      variant="outline" 
                      className={`text-xs ${
                        driver.weight > 0 ? 'border-success text-success' : 
                        driver.weight < 0 ? 'border-danger text-danger' : 
                        'border-muted text-muted-foreground'
                      }`}
                    >
                      {driver.label}
                    </Badge>
                  ))}
                </div>
                
                <p className="text-xs text-muted-foreground mt-2">
                  Context updated: {new Date().toLocaleTimeString()}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Input Section */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Label htmlFor="insight-input" className="text-sm font-medium text-foreground">
                  Describe what you'd like to understand:
                </Label>
                <Textarea 
                  id="insight-input"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={4}
                  className="resize-none"
                  placeholder="e.g., 'Why did tech stocks decline today?' or 'What's the outlook for my portfolio?'"
                  data-testid="input-insights"
                />
                
                {/* Template Prompts */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">Quick templates:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputText("Explain how today's Trump Index movement, Fedspeak tone, and policy-sensitive assets may have contributed to my portfolio's performance.")}
                    className="text-xs h-7"
                    data-testid="template-policy-portfolio"
                  >
                    How did policy affect my portfolio today?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputText("Review my policy-sensitive assets and explain which policy themes (tariffs, trade, defense, immigration) are most relevant.")}
                    className="text-xs h-7"
                    data-testid="template-policy-holdings"
                  >
                    Explain my policy-sensitive holdings
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputText("Analyze the current Fedspeak tone and whether it aligns with today's market moves in equities, crypto, and rates.")}
                    className="text-xs h-7"
                    data-testid="template-fed-tone"
                  >
                    Is Fed tone influencing markets today?
                  </Button>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    Powered by GPT-4o
                    {trumpIndex && fedspeak && (
                      <span className="text-xs text-muted-foreground ml-2">
                        • Policy context included
                      </span>
                    )}
                  </span>
                  <Button 
                    onClick={handleExplain}
                    disabled={insightsMutation.isPending}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    data-testid="button-explain"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {insightsMutation.isPending ? "Analyzing..." : "Explain"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results Section */}
          {insights && (
            <div className="space-y-6">
              {/* AI Response Card */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3 mb-4">
                    <div className="w-8 h-8 bg-purple/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="text-purple w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg font-semibold text-foreground mb-3">
                        AI Analysis Summary
                      </CardTitle>
                      <div className="prose text-foreground text-sm leading-relaxed">
                        <p>{insights.summary}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Points */}
              <Card>
                <CardContent className="p-6">
                  <CardTitle className="text-lg font-semibold text-foreground mb-4">
                    Why This Matters
                  </CardTitle>
                  <div className="space-y-3">
                    {insights.whyThisMatters.map((point, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-sm text-foreground">{point}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Action Items */}
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50">
                <CardContent className="p-6">
                  <CardTitle className="text-lg font-semibold text-foreground mb-4">
                    Recommended Actions
                  </CardTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-card rounded-lg p-4 border border-border">
                      <div className="flex items-center space-x-2 mb-2">
                        <TrendingUp className="text-primary w-4 h-4" />
                        <span className="text-sm font-medium text-foreground">Monitor</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Keep watching tech sector rotation patterns and earnings reports
                      </p>
                    </div>
                    <div className="bg-card rounded-lg p-4 border border-border">
                      <div className="flex items-center space-x-2 mb-2">
                        <Shield className="text-success w-4 h-4" />
                        <span className="text-sm font-medium text-foreground">Rebalance</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Consider rebalancing if any position exceeds 30% of total portfolio
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Show placeholder if no insights yet */}
          {!insights && !insightsMutation.isPending && (
            <Card className="bg-muted/30">
              <CardContent className="p-8 text-center">
                <Brain className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-muted-foreground mb-4">
                  Enter your market question above and click "Explain" to get AI-powered insights.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
