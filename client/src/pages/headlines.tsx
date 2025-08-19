import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ExternalLink, TrendingUp, TrendingDown, Minus, Search } from "lucide-react";
import { formatDistance } from "date-fns";

export default function Headlines() {
  const [category, setCategory] = useState<string>("general");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const { data: headlines, isLoading, refetch } = useQuery({
    queryKey: ["/api/headlines", searchTerm],
    queryFn: () => api.getHeadlines(searchTerm),
  });

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "negative": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Market Headlines" 
        subtitle="Latest market news with AI-powered impact analysis"
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="entertainment">Entertainment</SelectItem>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="sports">Sports</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>

        {/* Headlines Grid */}
        {isLoading ? (
          <div className="grid gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {headlines?.map((headline) => (
              <Card key={headline.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 line-clamp-2">
                        {headline.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{headline.source}</span>
                        <span>•</span>
                        <span>{formatDistance(new Date(headline.published), new Date(), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 flex items-center justify-center">
                      <span className="text-muted-foreground text-xs">News</span>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {headline.summary && (
                    <p className="text-muted-foreground mb-4 line-clamp-3">
                      {headline.summary}
                    </p>
                  )}
                  
                  {/* Detected Symbols */}
                  {headline.symbols && headline.symbols.length > 0 && (
                    <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Related Symbols:</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {headline.symbols.map((symbol: string) => (
                          <Badge key={symbol} variant="outline" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                      </div>
                      
                      {!headline.analyzed && (
                        <p className="text-xs text-muted-foreground">
                          AI analysis pending
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {headline.source}
                      </Badge>
                    </div>
                    
                    <Button variant="outline" size="sm" asChild>
                      <a href={headline.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Read More
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {headlines?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No headlines found for the current filters.</p>
          </div>
        )}
      </main>
    </div>
  );
}