import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/constants";
import { format, addDays, subDays } from "date-fns";

export default function Earnings() {
  const [timeframe, setTimeframe] = useState<string>("this_week");

  const { data: earnings, isLoading, refetch } = useQuery({
    queryKey: ["/api/earnings/upcoming"],
    queryFn: () => api.getUpcomingEarnings(),
  });

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
          
          <Button onClick={() => refetch()} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Earnings Grid */}
        {isLoading ? (
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
        
        {earnings?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No earnings reports found for {getTimeframeLabel(timeframe).toLowerCase()}.</p>
          </div>
        )}
      </main>
    </div>
  );
}