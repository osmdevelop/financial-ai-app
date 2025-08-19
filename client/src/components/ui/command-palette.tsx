import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Search, TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AssetSearchResult } from "@shared/schema";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectAsset: (asset: AssetSearchResult) => void;
}

export function CommandPalette({ open, onOpenChange, onSelectAsset }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [query]);

  // Search assets
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ["/api/search", debouncedQuery],
    queryFn: () => api.searchAssets(debouncedQuery, undefined, 10),
    enabled: debouncedQuery.length >= 2,
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
      
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const handleSelect = useCallback((asset: AssetSearchResult) => {
    onSelectAsset(asset);
    onOpenChange(false);
  }, [onSelectAsset, onOpenChange]);

  const getAssetTypeColor = (assetType: string) => {
    switch (assetType) {
      case "equity": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "etf": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "crypto": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  const getAssetIcon = (symbol: string) => {
    // Return first letter as a simple icon
    return symbol.charAt(0).toUpperCase();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stocks, ETFs, crypto... (⌘K)"
            className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>
        
        <Command className="max-h-80">
          <CommandList>
            {query.length >= 2 && (
              <>
                {isLoading ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <CommandEmpty>No assets found.</CommandEmpty>
                ) : (
                  <CommandGroup heading="Assets">
                    {searchResults.map((asset) => (
                      <CommandItem
                        key={`${asset.symbol}-${asset.assetType}`}
                        value={`${asset.symbol} ${asset.name}`}
                        onSelect={() => handleSelect(asset)}
                        className="flex items-center justify-between p-3 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                            {getAssetIcon(asset.symbol)}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{asset.symbol}</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${getAssetTypeColor(asset.assetType)}`}
                              >
                                {asset.assetType.toUpperCase()}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground truncate max-w-md">
                              {asset.name}
                            </span>
                          </div>
                        </div>
                        
                        {asset.lastPrice && (
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              ${asset.lastPrice.toLocaleString()}
                            </div>
                          </div>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </>
            )}
            
            {query.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <div className="mb-2">
                  <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                </div>
                <p>Type at least 2 characters to search</p>
                <p className="text-xs mt-1">
                  Search for stocks, ETFs, and cryptocurrencies
                </p>
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// Hook for using the command palette
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    setOpen,
    toggle,
    close,
  };
}