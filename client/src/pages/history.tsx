import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataStatusBadge } from "@/components/ui/data-status-badge";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import {
  History as HistoryIcon,
  Trash2,
  ExternalLink,
  X,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import {
  getSnapshotsInRange,
  clearHistory,
  compareSnapshots,
  type DailySnapshot,
  type SnapshotDelta,
} from "@/lib/history-storage";

function getRegimeBadgeStyles(regime: string) {
  switch (regime) {
    case "Risk-On":
      return "bg-green-500/10 text-green-600 border-green-500/30";
    case "Risk-Off":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    case "Policy Shock":
      return "bg-orange-500/10 text-orange-600 border-orange-500/30";
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-500/30";
  }
}

function getTradeLevelStyles(level: string) {
  switch (level) {
    case "Green":
      return "bg-green-500/10 text-green-600 border-green-500/30";
    case "Red":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    default:
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
  }
}

function formatSnapshotDate(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    return format(date, "EEE, MMM d");
  } catch {
    return dateStr;
  }
}

interface SnapshotItemProps {
  snapshot: DailySnapshot;
  previousSnapshot?: DailySnapshot;
  onClick: () => void;
}

function SnapshotItem({ snapshot, previousSnapshot, onClick }: SnapshotItemProps) {
  const delta = useMemo(() => {
    if (!previousSnapshot) return null;
    return compareSnapshots(previousSnapshot, snapshot);
  }, [snapshot, previousSnapshot]);

  const dataStatus = snapshot.meta.isMock
    ? "mock"
    : snapshot.meta.missingInputs.length > 0
      ? "partial"
      : "live";

  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={onClick}
      data-testid={`history-item-${snapshot.date}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">
                {formatSnapshotDate(snapshot.date)}
              </span>
              <DataStatusBadge status={dataStatus} />
            </div>

            <p className="text-sm text-muted-foreground truncate mb-2">
              {snapshot.dailyCall}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {snapshot.regime && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getRegimeBadgeStyles(snapshot.regime.regime)}`}
                >
                  {snapshot.regime.regime}
                  {snapshot.regime.confidence !== undefined &&
                    ` (${Math.round(snapshot.regime.confidence)}%)`}
                </Badge>
              )}
              {snapshot.shouldTradeToday && (
                <Badge
                  variant="outline"
                  className={`text-xs ${getTradeLevelStyles(snapshot.shouldTradeToday.level)}`}
                >
                  {snapshot.shouldTradeToday.level}
                </Badge>
              )}
              {delta && delta.changes.length > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {delta.changes.length} change{delta.changes.length !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

interface SnapshotDetailProps {
  snapshot: DailySnapshot;
  previousSnapshot?: DailySnapshot;
  onClose: () => void;
}

function SnapshotDetail({ snapshot, previousSnapshot, onClose }: SnapshotDetailProps) {
  const delta = useMemo<SnapshotDelta>(() => {
    if (!previousSnapshot) {
      return { changes: [], summary: "First recorded snapshot." };
    }
    return compareSnapshots(previousSnapshot, snapshot);
  }, [snapshot, previousSnapshot]);

  const dataStatus = snapshot.meta.isMock
    ? "mock"
    : snapshot.meta.missingInputs.length > 0
      ? "partial"
      : "live";

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      data-testid="history-detail"
    >
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-background border-l shadow-xl overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-semibold">{formatSnapshotDate(snapshot.date)}</h2>
            <DataStatusBadge status={dataStatus} className="mt-1" />
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Daily Call
            </h3>
            <p className="text-sm">{snapshot.dailyCall}</p>
            {snapshot.shouldTradeToday && (
              <Badge
                variant="outline"
                className={`mt-2 ${getTradeLevelStyles(snapshot.shouldTradeToday.level)}`}
              >
                {snapshot.shouldTradeToday.level === "Green" && "Favorable conditions"}
                {snapshot.shouldTradeToday.level === "Yellow" && "Mixed conditions"}
                {snapshot.shouldTradeToday.level === "Red" && "Elevated caution"}
              </Badge>
            )}
          </section>

          {snapshot.regime && snapshot.regime.drivers.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Top Drivers
              </h3>
              <ul className="space-y-1">
                {snapshot.regime.drivers.slice(0, 3).map((driver, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span>
                      <span className="font-medium">{driver.key}</span>
                      {driver.detail && (
                        <span className="text-muted-foreground"> — {driver.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              What Changed
            </h3>
            {delta.changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">{delta.summary}</p>
            ) : (
              <ul className="space-y-2">
                {delta.changes.map((change, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm p-2 bg-muted/30 rounded-lg"
                  >
                    <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-medium">{change.label}</span>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {change.from} → {change.to}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            {snapshot.regime && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Regime</p>
                <p className="text-sm font-medium">{snapshot.regime.regime}</p>
                {snapshot.regime.confidence !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {Math.round(snapshot.regime.confidence)}% confidence
                  </p>
                )}
              </div>
            )}
            {snapshot.fed?.tone && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Fed Tone</p>
                <p className="text-sm font-medium capitalize">{snapshot.fed.tone}</p>
              </div>
            )}
            {snapshot.policy?.trumpRisk && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Policy Risk</p>
                <p className="text-sm font-medium capitalize">{snapshot.policy.trumpRisk}</p>
              </div>
            )}
            {snapshot.volatility?.state && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Volatility</p>
                <p className="text-sm font-medium capitalize">{snapshot.volatility.state}</p>
              </div>
            )}
          </div>

          {snapshot.focusAssets && snapshot.focusAssets.length > 0 && (
            <section>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Focus Assets
              </h3>
              <div className="flex flex-wrap gap-2">
                {snapshot.focusAssets.map((asset) => (
                  <Badge key={asset.symbol} variant="secondary">
                    {asset.symbol}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <Link href="/daily-brief">
            <Button className="w-full" data-testid="link-open-daily-brief">
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Daily Brief
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function History() {
  const [range, setRange] = useState<"7" | "30">("7");
  const [selectedSnapshot, setSelectedSnapshot] = useState<DailySnapshot | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const snapshots = useMemo(() => {
    return getSnapshotsInRange(parseInt(range));
  }, [range, refreshKey]);

  const snapshotMap = useMemo(() => {
    const map = new Map<string, DailySnapshot>();
    snapshots.forEach((s) => map.set(s.date, s));
    return map;
  }, [snapshots]);

  const getPreviousSnapshot = (snapshot: DailySnapshot): DailySnapshot | undefined => {
    const sortedDates = Array.from(snapshotMap.keys()).sort((a, b) => a.localeCompare(b));
    const currentIndex = sortedDates.indexOf(snapshot.date);
    if (currentIndex > 0) {
      return snapshotMap.get(sortedDates[currentIndex - 1]);
    }
    return undefined;
  };

  const handleClearHistory = () => {
    clearHistory();
    setShowClearConfirm(false);
    setSelectedSnapshot(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="history-page">
      <Header
        title="History"
        subtitle="Review your daily market snapshots"
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Tabs value={range} onValueChange={(v) => setRange(v as "7" | "30")}>
            <TabsList>
              <TabsTrigger value="7" data-testid="history-range-7d">
                7D
              </TabsTrigger>
              <TabsTrigger value="30" data-testid="history-range-30d">
                30D
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowClearConfirm(true)}
            disabled={snapshots.length === 0}
            data-testid="history-clear"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear History
          </Button>
        </div>

        {snapshots.length === 0 ? (
          <EmptyStateCard
            title="No history yet"
            description="Your daily snapshots will appear here after you open the Daily Brief."
            actionLabel="Go to Daily Brief"
            onAction={() => (window.location.href = "/daily-brief")}
            icon={<HistoryIcon className="h-10 w-10 text-muted-foreground" />}
            data-testid="empty-history"
          />
        ) : (
          <div className="space-y-3">
            {snapshots.map((snapshot) => (
              <SnapshotItem
                key={snapshot.id}
                snapshot={snapshot}
                previousSnapshot={getPreviousSnapshot(snapshot)}
                onClick={() => setSelectedSnapshot(snapshot)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedSnapshot && (
        <SnapshotDetail
          snapshot={selectedSnapshot}
          previousSnapshot={getPreviousSnapshot(selectedSnapshot)}
          onClose={() => setSelectedSnapshot(null)}
        />
      )}

      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear History?</DialogTitle>
            <DialogDescription>
              This will permanently delete all saved snapshots. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearHistory}
              data-testid="confirm-clear-history"
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
