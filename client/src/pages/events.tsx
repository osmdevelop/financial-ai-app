import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, TrendingUp, TrendingDown, Activity, MessageSquare, BarChart3, AlertTriangle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Event importance badge component
function ImportanceBadge({ importance }: { importance: string }) {
  const getVariant = (imp: string) => {
    switch (imp.toLowerCase()) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Badge variant={getVariant(importance)} className="text-xs">
      {importance.toUpperCase()}
    </Badge>
  );
}

// Event card component for calendar grid
function EventCard({ event }: { event: any }) {
  const eventDate = new Date(event.timestamp);
  const isToday = new Date().toDateString() === eventDate.toDateString();
  const isPast = eventDate < new Date();

  return (
    <Card className={cn(
      "p-3 border transition-colors hover:bg-muted/50",
      isToday && "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
      isPast && "opacity-60"
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-tight truncate">{event.event}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {format(eventDate, "MMM d, h:mm a")}
          </p>
        </div>
        <ImportanceBadge importance={event.importance} />
      </div>
      
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{event.category}</span>
        {event.forecast && (
          <span className="font-mono">F: {event.forecast}</span>
        )}
      </div>
      
      {event.previous && (
        <div className="text-xs text-muted-foreground mt-1">
          Prev: {event.previous}
        </div>
      )}
    </Card>
  );
}

// Pre-brief section component
function EventPrebrief() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { toast } = useToast();

  const prebriefMutation = useMutation({
    mutationFn: (eventPayload: any) => api.postEventsPrebrief({ eventPayload }),
    onSuccess: () => {
      toast({
        title: "Pre-brief Generated",
        description: "Event analysis completed successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate pre-brief",
        variant: "destructive",
      });
    },
  });

  const handlePrebrief = (event: any) => {
    setSelectedEvent(event);
    prebriefMutation.mutate(event);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-500" />
          Event Pre-Brief Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedEvent && (
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium">{selectedEvent.event}</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {format(new Date(selectedEvent.timestamp), "PPpp")}
            </p>
          </div>
        )}

        {prebriefMutation.data && (
          <div className="space-y-3">
            <div>
              <h5 className="font-medium text-sm mb-2">Market Consensus</h5>
              <p className="text-sm text-muted-foreground">{prebriefMutation.data.data.consensus}</p>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">Key Risks</h5>
              <ul className="space-y-1">
                {prebriefMutation.data.data.risks?.map((risk: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    {risk}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">Watch Points</h5>
              <ul className="space-y-1">
                {prebriefMutation.data.data.watchPoints?.map((point: string, idx: number) => (
                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">Sensitive Assets</h5>
              <div className="flex flex-wrap gap-1">
                {prebriefMutation.data.data.sensitiveAssets?.map((asset: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">{asset}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {prebriefMutation.isPending && (
          <div className="text-center py-4">
            <Activity className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Generating pre-brief analysis...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Fed Translator component
function FedTranslator() {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();

  const translateMutation = useMutation({
    mutationFn: (text: string) => api.postEventsTranslate({ text }),
    onSuccess: () => {
      toast({
        title: "Translation Complete",
        description: "Fed speak has been translated to plain English",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to translate text",
        variant: "destructive",
      });
    },
  });

  const handleTranslate = () => {
    if (!inputText.trim()) return;
    translateMutation.mutate(inputText);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          Fed Speak Translator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Central Bank Text</label>
          <Textarea
            data-testid="input-fed-text"
            placeholder="Paste Federal Reserve statement or central bank communication here..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>

        <Button 
          data-testid="button-translate"
          onClick={handleTranslate}
          disabled={!inputText.trim() || translateMutation.isPending}
          className="w-full"
        >
          {translateMutation.isPending ? "Translating..." : "Translate to Plain English"}
        </Button>

        {translateMutation.data && (
          <div className="space-y-4">
            <Separator />
            
            <div>
              <h5 className="font-medium text-sm mb-2 text-green-600">Plain English Translation</h5>
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <p className="text-sm" data-testid="text-translation">{translateMutation.data.data.translation}</p>
              </div>
            </div>

            <div>
              <h5 className="font-medium text-sm mb-2">Key Terms Explained</h5>
              <div className="space-y-2">
                {translateMutation.data.data.keyTerms?.map((term: any, idx: number) => (
                  <div key={idx} className="p-2 bg-muted rounded text-sm">
                    <span className="font-medium">{term.term}:</span> {term.explanation}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Overall Tone: <span className="font-medium">{translateMutation.data.data.tone}</span></span>
              <span className="text-xs">{format(new Date(translateMutation.data.data.as_of), "PP")}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Event Studies component
function EventStudies() {
  const [selectedEventType, setSelectedEventType] = useState("CPI");
  
  const { data: studiesData, isLoading } = useQuery({
    queryKey: ["events-studies", selectedEventType],
    queryFn: () => api.getEventsStudies(selectedEventType),
    enabled: !!selectedEventType,
  });

  const eventTypes = ["CPI", "NFP", "PPI", "FOMC", "Retail Sales"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-500" />
          Event Studies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Event Type</label>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <Button
                key={type}
                variant={selectedEventType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedEventType(type)}
                data-testid={`button-event-${type.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <BarChart3 className="h-6 w-6 animate-pulse mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-2">Loading event studies...</p>
          </div>
        )}

        {studiesData && (
          <div className="space-y-4">
            <div>
              <h5 className="font-medium text-sm mb-2">Historical Dates</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {studiesData.data.historicalDates?.slice(0, 6).map((date: string, idx: number) => (
                  <div key={idx} className="p-2 bg-muted rounded text-sm text-center">
                    {format(new Date(date), "MMM d, yyyy")}
                  </div>
                ))}
              </div>
              {studiesData.data.historicalDates?.length > 6 && (
                <p className="text-xs text-muted-foreground mt-2">
                  +{studiesData.data.historicalDates.length - 6} more dates
                </p>
              )}
            </div>

            <div>
              <h5 className="font-medium text-sm mb-3">Price Drift Analysis</h5>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Average Return</span>
                    <span className={cn("text-sm font-medium", 
                      studiesData.data.driftAnalysis?.avgReturn >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {studiesData.data.driftAnalysis?.avgReturn.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Win Rate</span>
                    <span className="text-sm font-medium">
                      {((studiesData.data.driftAnalysis?.winRate || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Drawdown</span>
                    <span className="text-sm font-medium text-red-600">
                      {studiesData.data.driftAnalysis?.maxDrawdown.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Max Upward</span>
                    <span className="text-sm font-medium text-green-600">
                      {studiesData.data.driftAnalysis?.maxUpward.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Analysis period: {studiesData.data.driftAnalysis?.preDays} days before to {studiesData.data.driftAnalysis?.postDays} days after
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Main Events page component
export default function EventsPage() {
  const [calendarDays, setCalendarDays] = useState(14);
  
  const { data: upcomingEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["events-upcoming", calendarDays],
    queryFn: () => api.getEventsUpcoming(calendarDays),
  });

  return (
    <div className="space-y-6" data-testid="page-events">
      <Header
        title="Events Intelligence"
        subtitle="Economic calendar, event analysis, and market impact studies"
      />

      {/* Economic Calendar Grid */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Economic Calendar
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Days:</label>
              <Input
                data-testid="input-calendar-days"
                type="number"
                value={calendarDays}
                onChange={(e) => setCalendarDays(parseInt(e.target.value) || 14)}
                className="w-20"
                min="1"
                max="30"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-8">
              <Calendar className="h-8 w-8 animate-pulse mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading upcoming events...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {upcomingEvents?.data?.map((event: any, idx: number) => (
                <EventCard key={`${event.event}-${idx}`} event={event} />
              ))}
              {upcomingEvents?.data?.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">No upcoming events in the selected period</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EventPrebrief />
        <FedTranslator />
      </div>

      {/* Event Studies */}
      <EventStudies />
    </div>
  );
}