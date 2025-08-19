import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Star, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { AssetSearchResult, AssetSheetData, WatchlistItem } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";

interface AssetSheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetSearchResult | null;
  onAddTransaction: (asset: AssetSearchResult) => void;
}

export function AssetSheetModal({ 
  open, 
  onOpenChange, 
  asset, 
  onAddTransaction 
}: AssetSheetModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch asset sheet data
  const { data: assetData, isLoading } = useQuery({
    queryKey: ["/api/asset", asset?.symbol, asset?.assetType],
    queryFn: () => api.getAssetSheetData(asset!.symbol, asset!.assetType),
    enabled: !!(asset?.symbol && asset?.assetType && open),
  });

  // Fetch watchlist to check if asset is already watched
  const { data: watchlist = [] } = useQuery({
    queryKey: ["/api/watchlist"],
    queryFn: () => api.getWatchlist(),
  });

  const isInWatchlist = watchlist.some((item: WatchlistItem) => 
    item.symbol === asset?.symbol && item.assetType === asset?.assetType
  );

  // Add to watchlist mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: (data: { symbol: string; assetType: string }) =>
      api.addToWatchlist(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: `${asset?.symbol} has been added to your watchlist.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add to watchlist. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddToWatchlist = () => {
    if (!asset) return;
    
    addToWatchlistMutation.mutate({
      symbol: asset.symbol,
      assetType: asset.assetType,
    });
  };

  const handleAddTransaction = () => {
    if (!asset) return;
    onAddTransaction(asset);
    onOpenChange(false);
  };

  const getAssetTypeColor = (assetType: string) => {
    switch (assetType) {
      case "equity": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "etf": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "crypto": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const formatMarketCap = (marketCap?: number) => {
    if (!marketCap) return "N/A";
    
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    }
    return `$${marketCap.toLocaleString()}`;
  };

  const formatChange = (change: number, isPercent = false) => {
    const sign = change >= 0 ? "+" : "";
    if (isPercent) {
      return `${sign}${change.toFixed(2)}%`;
    }
    return `${sign}$${change.toFixed(2)}`;
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg font-bold">
              {asset.symbol.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">{asset.symbol}</span>
                <Badge 
                  variant="secondary" 
                  className={getAssetTypeColor(asset.assetType)}
                >
                  {asset.assetType.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                {asset.name}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        ) : assetData ? (
          <div className="space-y-6">
            {/* Price and Change */}
            <div className="space-y-2">
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold">
                  ${assetData.price.toLocaleString()}
                </span>
                <div className={`flex items-center space-x-1 ${
                  assetData.change24h >= 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {assetData.change24h >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {formatChange(assetData.change24h)}
                  </span>
                  <span className="text-sm">
                    ({formatChange(assetData.changePercent24h, true)})
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(assetData.asOf).toLocaleString()}
              </p>
            </div>

            {/* Mini Chart */}
            {assetData.miniChart && assetData.miniChart.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">7-Day Price Chart</h3>
                <div className="h-32 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={assetData.miniChart}>
                      <XAxis 
                        dataKey="ts" 
                        tickFormatter={(ts) => new Date(ts).toLocaleDateString()}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <YAxis 
                        domain={['dataMin', 'dataMax']}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="close" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Market Cap */}
            {assetData.marketCap && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                  <p className="text-lg font-semibold">
                    {formatMarketCap(assetData.marketCap)}
                  </p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-sm text-muted-foreground">24h Change</p>
                  <p className={`text-lg font-semibold ${
                    assetData.changePercent24h >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    {formatChange(assetData.changePercent24h, true)}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t">
              <Button 
                onClick={handleAddTransaction}
                className="flex-1"
                size="lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAddToWatchlist}
                disabled={isInWatchlist || addToWatchlistMutation.isPending}
                size="lg"
              >
                <Star className={`mr-2 h-4 w-4 ${isInWatchlist ? "fill-current" : ""}`} />
                {isInWatchlist ? "In Watchlist" : "Add to Watchlist"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Failed to load asset data</p>
            <p className="text-sm mt-1">Please try again later</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}