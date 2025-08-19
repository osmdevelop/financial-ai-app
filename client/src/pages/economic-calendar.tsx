import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, AlertTriangle, TrendingUp, Globe } from "lucide-react";
import { format, addDays } from "date-fns";

export default function EconomicCalendar() {
  const [timeframe, setTimeframe] = useState<string>("7");

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["/api/econ/upcoming", timeframe],
    queryFn: () => api.getEconomicEvents(parseInt(timeframe)),
  });

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "low": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getImportanceIcon = (importance: string) => {
    switch (importance) {
      case "high": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "medium": return <TrendingUp className="h-4 w-4 text-orange-500" />;
      case "low": return <Globe className="h-4 w-4 text-green-500" />;
      default: return <Globe className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTimeframeLabel = (days: string) => {
    switch (days) {
      case "1": return "Today";
      case "3": return "Next 3 Days";
      case "7": return "Next 7 Days";
      case "14": return "Next 2 Weeks";
      case "30": return "Next Month";
      default: return "Next 7 Days";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Economic Calendar" 
        subtitle="Upcoming economic events with market impact analysis"
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Today</SelectItem>
              <SelectItem value="3">Next 3 Days</SelectItem>
              <SelectItem value="7">Next 7 Days</SelectItem>
              <SelectItem value="14">Next 2 Weeks</SelectItem>
              <SelectItem value="30">Next Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={() => refetch()} variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Events List */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-32"></div>
                    <div className="h-6 bg-muted rounded w-16"></div>
                  </div>
                  <div className="h-6 bg-muted rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {events?.map((event) => (
              <Card key={event.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">
                          {event.country}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {getImportanceIcon(event.importance)}
                          <Badge className={getImportanceColor(event.importance)}>
                            {event.importance} impact
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="text-lg mb-1">
                        {event.event}
                      </CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(event.timestamp), "EEEE, MMMM do 'at' h:mm a")}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Event Data */}
                  {(event.previous || event.forecast || event.actual) && (
                    <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Previous</div>
                        <div className="font-medium text-sm">
                          {event.previous || "N/A"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Forecast</div>
                        <div className="font-medium text-sm">
                          {event.forecast || "N/A"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground mb-1">Actual</div>
                        <div className="font-medium text-sm">
                          {event.actual || "TBD"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Impact Analysis Placeholder */}
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-sm font-medium mb-2">Market Impact Analysis</div>
                    <p className="text-sm text-muted-foreground mb-2">
                      AI-powered impact analysis coming soon for this {event.importance}-impact event.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="text-xs">Equities</Badge>
                      <Badge variant="outline" className="text-xs">Bonds</Badge>
                      <Badge variant="outline" className="text-xs">USD</Badge>
                      <Badge variant="outline" className="text-xs">Commodities</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {events?.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No economic events found for {getTimeframeLabel(timeframe).toLowerCase()}.</p>
          </div>
        )}
      </main>
    </div>
  );
}