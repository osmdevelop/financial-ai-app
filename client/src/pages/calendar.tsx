import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  AlertTriangle,
  TrendingUp,
  Globe,
  Activity,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { useDataModeContext } from "@/components/providers/data-mode-provider";

function getImportanceStyle(importance: string) {
  switch (importance) {
    case "high":
      return "bg-muted text-destructive border border-border";
    case "medium":
      return "bg-muted text-foreground border border-border";
    case "low":
      return "bg-muted text-muted-foreground border border-border";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function getTimeframeLabel(days: string) {
  switch (days) {
    case "1": return "Today";
    case "3": return "Next 3 Days";
    case "7": return "Next 7 Days";
    case "14": return "Next 2 Weeks";
    case "30": return "Next Month";
    default: return "Next 7 Days";
  }
}

function formatImpactPreview(item: { assetId: string; meanMovePct: number; percentile10Pct?: number; percentile90Pct?: number; horizonHours: number }) {
  const sign = item.meanMovePct >= 0 ? "+" : "";
  const band =
    item.percentile10Pct != null && item.percentile90Pct != null
      ? ` (${item.percentile10Pct.toFixed(1)}% to ${item.percentile90Pct.toFixed(1)}%)`
      : "";
  return `${item.assetId} ${sign}${item.meanMovePct.toFixed(1)}%${band} over ${item.horizonHours}h`;
}

function EventCardMini({ event }: { event: any }) {
  const eventDate = new Date(event.timestamp);
  const isToday = new Date().toDateString() === eventDate.toDateString();
  const isPast = eventDate < new Date();
  const impactPreview = event.impactPreview as { assetId: string; meanMovePct: number; percentile10Pct?: number; percentile90Pct?: number; horizonHours: number }[] | undefined;

  return (
    <Card
      className={cn(
        "p-3 border transition-colors hover:bg-muted/30",
        isToday && "border-foreground/30 bg-muted/30",
        isPast && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm leading-tight truncate">{event.event}</h4>
          <p className="text-xs text-muted-foreground mt-1">{format(eventDate, "MMM d, h:mm a")}</p>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">
          {event.importance}
        </Badge>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{event.category}</span>
        {event.forecast != null && <span className="font-mono">F: {event.forecast}</span>}
      </div>
      {impactPreview && impactPreview.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Historically (48h):</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {impactPreview.map((item) => (
              <li key={item.assetId}>{formatImpactPreview(item)}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function EventPrebriefTab({ events }: { events: any[] }) {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const { toast } = useToast();
  const prebriefMutation = useMutation({
    mutationFn: (eventPayload: any) => api.postEventsPrebrief({ eventPayload }),
    onSuccess: () => toast({ title: "Pre-brief generated" }),
    onError: () => toast({ title: "Failed to generate pre-brief", variant: "destructive" }),
  });
  const handlePrebrief = (event: any) => {
    setSelectedEvent(event);
    prebriefMutation.mutate(event);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Event Pre-Brief
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedEvent && (
          <div className="p-3 bg-muted rounded-md">
            <h4 className="font-medium text-sm">{selectedEvent.event}</h4>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(selectedEvent.timestamp), "PPpp")}</p>
          </div>
        )}
        {prebriefMutation.data && (
          <div className="space-y-2 text-sm">
            <div>
              <h5 className="font-medium text-xs mb-1">Consensus</h5>
              <p className="text-muted-foreground">{prebriefMutation.data.data.consensus}</p>
            </div>
            <div>
              <h5 className="font-medium text-xs mb-1">Risks</h5>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {prebriefMutation.data.data.risks?.map((risk: string, i: number) => (
                  <li key={i}>{risk}</li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-xs mb-1">Watch</h5>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                {prebriefMutation.data.data.watchPoints?.map((p: string, i: number) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {events.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">Run pre-brief for:</p>
            {events.slice(0, 3).map((ev: any, i: number) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="w-full justify-start text-left h-8 text-xs"
                onClick={() => handlePrebrief(ev)}
                disabled={prebriefMutation.isPending}
              >
                {ev.event}
              </Button>
            ))}
          </div>
        )}
        {prebriefMutation.isPending && (
          <div className="text-center py-4 text-sm text-muted-foreground">Generating pre-brief...</div>
        )}
      </CardContent>
    </Card>
  );
}

function FedTranslatorTab() {
  const [inputText, setInputText] = useState("");
  const { toast } = useToast();
  const translateMutation = useMutation({
    mutationFn: (text: string) => api.postEventsTranslate({ text }),
    onSuccess: () => toast({ title: "Translation complete" }),
    onError: () => toast({ title: "Translation failed", variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Fed Speak Translator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          placeholder="Paste Fed statement..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={3}
          className="resize-none text-sm"
        />
        <Button
          size="sm"
          onClick={() => inputText.trim() && translateMutation.mutate(inputText)}
          disabled={!inputText.trim() || translateMutation.isPending}
        >
          {translateMutation.isPending ? "Translating..." : "Translate"}
        </Button>
        {translateMutation.data && (
          <div className="p-3 bg-muted rounded-md text-sm">
            <p className="text-foreground">{translateMutation.data.data.translation}</p>
            <p className="text-xs text-muted-foreground mt-2">Tone: {translateMutation.data.data.tone}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const [activeTab, setActiveTab] = useState<"economic" | "events">("economic");
  const [timeframe, setTimeframe] = useState<string>("7");
  const [calendarDays, setCalendarDays] = useState(14);
  const { dataMode } = useDataModeContext();

  const { data: econData, isLoading: econLoading, error: econError, refetch: refetchEcon } = useQuery({
    queryKey: ["/api/econ/upcoming", timeframe],
    queryFn: () => api.getEconomicEvents(parseInt(timeframe)),
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/events/upcoming", calendarDays],
    queryFn: () => api.getEventsUpcoming(calendarDays),
  });

  const econEvents = econData?.events || [];
  const isMock = econData?.meta?.isMock ?? false;
  const upcomingEvents = eventsData?.data || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header title="Economic Calendar" subtitle="Upcoming events with min/max forecasts and market impact" />

      <div className="px-4 md:px-6 pt-2">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "economic" | "events")}>
          <TabsList className="bg-muted">
            <TabsTrigger value="economic">Economic</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {activeTab === "economic" && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-40 h-9">
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
              <Button variant="outline" size="sm" className="h-9" onClick={() => refetchEcon()}>
                <Calendar className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {dataMode === "demo" && isMock && (
                <Badge variant="outline" className="text-xs text-muted-foreground" data-testid="badge-mock-economic">
                  Sample Data
                </Badge>
              )}
            </div>

            {dataMode === "live" && isMock && !econLoading ? (
              <EmptyStateCard
                title="No data available"
                description="Sample calendar data is not shown in Live mode. Switch to Demo in Settings or try Refresh."
                actionLabel="Refresh"
                onAction={() => refetchEcon()}
                icon={<Calendar className="h-10 w-10 text-muted-foreground" />}
                data-testid="economic-empty-live"
              />
            ) : econError ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-destructive text-sm mb-2">Failed to load economic events</p>
                  <Button variant="outline" size="sm" onClick={() => refetchEcon()}>
                    Try again
                  </Button>
                </CardContent>
              </Card>
            ) : econLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {econEvents.map((event) => (
                  <Card key={event.id} className="border border-border">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs">
                              {event.country}
                            </Badge>
                            <Badge className={getImportanceStyle(event.importance)}>
                              {event.importance} impact
                            </Badge>
                          </div>
                          <CardTitle className="text-base">{event.event}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(event.timestamp), "EEEE, MMM d 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    {(event.previous || event.forecast || event.actual) && (
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-2 p-2 bg-muted/30 rounded-md text-center text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Previous</div>
                            <div className="font-medium">{event.previous || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Forecast</div>
                            <div className="font-medium">{event.forecast || "N/A"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Actual</div>
                            <div className="font-medium">{event.actual || "TBD"}</div>
                          </div>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {econEvents.length === 0 && !econLoading && !econError && (
              <EmptyStateCard
                title="No economic events"
                description={`No events for ${getTimeframeLabel(timeframe).toLowerCase()}. Try another timeframe.`}
                actionLabel="Refresh"
                onAction={() => refetchEcon()}
                icon={<Calendar className="h-10 w-10 text-muted-foreground" />}
              />
            )}
          </>
        )}

        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Days:</label>
              <Input
                type="number"
                value={calendarDays}
                onChange={(e) => setCalendarDays(parseInt(e.target.value) || 14)}
                className="w-20 h-9"
                min={1}
                max={30}
              />
            </div>

            {eventsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-3">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {upcomingEvents.map((event: any, idx: number) => (
                    <EventCardMini key={`${event.event}-${idx}`} event={event} />
                  ))}
                </div>
                {upcomingEvents.length === 0 && (
                  <EmptyStateCard
                    title="No upcoming events"
                    description="No events in the selected period."
                    icon={<Calendar className="h-10 w-10 text-muted-foreground" />}
                  />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <EventPrebriefTab events={upcomingEvents} />
                  <FedTranslatorTab />
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
