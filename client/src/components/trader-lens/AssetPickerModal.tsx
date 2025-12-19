import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Plus, X, Loader2, TrendingUp, Bitcoin, BarChart3, DollarSign } from "lucide-react";
import type { AssetSearchResult } from "@shared/schema";

interface AssetPickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function AssetPickerModal({ open, onOpenChange }: AssetPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { focusAssets, maxAssets, addAsset, removeAsset, isAdding, isRemoving } = useFocusAssets();

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["/api/search", searchQuery],
    queryFn: () => api.searchAssets(searchQuery, undefined, 20),
    enabled: searchQuery.length >= 1,
    staleTime: 30 * 1000,
  });

  const isMaxReached = focusAssets.length >= maxAssets;
  const isAssetSelected = useCallback(
    (symbol: string) => focusAssets.some(a => a.symbol.toLowerCase() === symbol.toLowerCase()),
    [focusAssets]
  );

  const handleAddAsset = (asset: AssetSearchResult) => {
    if (isMaxReached || isAssetSelected(asset.symbol)) return;
    addAsset({
      symbol: asset.symbol,
      assetType: asset.assetType as "equity" | "etf" | "crypto" | "fx" | "commodity" | "other",
      displayName: asset.name,
    });
  };

  const handleRemoveAsset = (symbol: string) => {
    removeAsset(symbol);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="asset-picker-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Manage Focus Assets
          </DialogTitle>
          <DialogDescription>
            Select up to {maxAssets} assets to personalize your Trader Lens experience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {focusAssets.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Selected ({focusAssets.length}/{maxAssets})
              </p>
              <div className="flex flex-wrap gap-2">
                {focusAssets.map((asset) => (
                  <Badge
                    key={asset.id}
                    variant="secondary"
                    className="flex items-center gap-1 py-1 px-2"
                    data-testid={`selected-asset-${asset.symbol}`}
                  >
                    {getAssetTypeIcon(asset.assetType)}
                    <span className="font-medium">{asset.symbol}</span>
                    <button
                      onClick={() => handleRemoveAsset(asset.symbol)}
                      disabled={isRemoving}
                      className="ml-1 hover:text-destructive focus:outline-none"
                      data-testid={`remove-asset-${asset.symbol}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search stocks, ETFs, crypto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="asset-search-input"
            />
          </div>

          {isMaxReached && (
            <p className="text-sm text-warning">
              Maximum of {maxAssets} assets reached. Remove one to add more.
            </p>
          )}

          <ScrollArea className="h-[300px] border rounded-lg">
            {isSearching ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : searchQuery.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Search className="h-8 w-8 mb-2" />
                <p className="text-sm">Start typing to search assets</p>
              </div>
            ) : searchResults && searchResults.length > 0 ? (
              <div className="divide-y">
                {searchResults.map((asset) => {
                  const selected = isAssetSelected(asset.symbol);
                  const disabled = selected || isMaxReached || isAdding;

                  return (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 hover:bg-muted/50"
                      data-testid={`search-result-${asset.symbol}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          {getAssetTypeIcon(asset.assetType)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{asset.symbol}</span>
                            <Badge
                              variant={getAssetTypeBadgeVariant(asset.assetType)}
                              className="text-xs"
                            >
                              {asset.assetType}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {asset.name}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={selected ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleAddAsset(asset)}
                        disabled={disabled}
                        data-testid={`add-asset-btn-${asset.symbol}`}
                      >
                        {selected ? (
                          "Added"
                        ) : isAdding ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </>
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="close-asset-picker"
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
