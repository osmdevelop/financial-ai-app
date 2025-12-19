import { useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { useWatchlist, WatchlistItem } from "@/hooks/useWatchlist";
import { Link } from "wouter";
import {
  Search,
  Star,
  Trash2,
  ExternalLink,
  TrendingUp,
  Bitcoin,
  BarChart3,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function getAssetTypeIcon(assetType: string) {
  switch (assetType) {
    case "crypto":
      return <Bitcoin className="h-4 w-4" />;
    case "etf":
      return <BarChart3 className="h-4 w-4" />;
    case "fx":
      return <DollarSign className="h-4 w-4" />;
    default:
      return <TrendingUp className="h-4 w-4" />;
  }
}

function getAssetTypeBadgeVariant(assetType: string): "default" | "secondary" | "outline" {
  switch (assetType) {
    case "crypto":
      return "secondary";
    case "etf":
      return "outline";
    default:
      return "default";
  }
}

export default function Watchlist() {
  const { watchlist, removeFromWatchlist, clearWatchlist, maxItems, isFull } = useWatchlist();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredWatchlist = useMemo(() => {
    if (!searchTerm) return watchlist;
    const lower = searchTerm.toLowerCase();
    return watchlist.filter(
      (item) =>
        item.symbol.toLowerCase().includes(lower) ||
        (item.displayName?.toLowerCase().includes(lower) ?? false)
    );
  }, [watchlist, searchTerm]);

  const sortedWatchlist = useMemo(() => {
    return [...filteredWatchlist].sort(
      (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
    );
  }, [filteredWatchlist]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="watchlist-page">
      <Header
        title="Watchlist"
        subtitle={`Track your favorite assets (${watchlist.length}/${maxItems})`}
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {isFull && (
            <Card className="border-amber-500/50 bg-amber-500/10">
              <CardContent className="flex items-center gap-2 py-3">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  Watchlist is full. Remove items to add more.
                </span>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Your Watchlist
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search watchlist..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                      data-testid="input-watchlist-search"
                    />
                  </div>
                  {watchlist.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearWatchlist}
                      className="text-destructive hover:text-destructive"
                      data-testid="button-clear-watchlist"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {watchlist.length === 0 ? (
                <EmptyStateCard
                  icon={<Star className="h-10 w-10 text-yellow-500" />}
                  title="No assets in watchlist"
                  description="Add assets from the Asset Overview page or when searching for assets."
                  actionLabel="Browse Assets"
                  onAction={() => window.location.href = "/asset-overview"}
                />
              ) : sortedWatchlist.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assets match your search.
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {sortedWatchlist.map((item) => (
                      <WatchlistRow
                        key={item.symbol}
                        item={item}
                        onRemove={() => removeFromWatchlist(item.symbol)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

interface WatchlistRowProps {
  item: WatchlistItem;
  onRemove: () => void;
}

function WatchlistRow({ item, onRemove }: WatchlistRowProps) {
  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
      data-testid={`watchlist-item-${item.symbol}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-full bg-muted">
          {getAssetTypeIcon(item.assetType)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">{item.symbol}</span>
            <Badge variant={getAssetTypeBadgeVariant(item.assetType)} className="text-xs">
              {item.assetType.toUpperCase()}
            </Badge>
          </div>
          {item.displayName && (
            <p className="text-sm text-muted-foreground">{item.displayName}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Added {formatDistanceToNow(new Date(item.addedAt), { addSuffix: true })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/asset-overview?symbol=${item.symbol}&type=${item.assetType}`}>
          <Button variant="ghost" size="sm" data-testid={`link-view-${item.symbol}`}>
            <ExternalLink className="h-4 w-4 mr-1" />
            View
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          data-testid={`remove-watchlist-${item.symbol}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
