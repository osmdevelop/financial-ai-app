import { useState, useEffect, useCallback, createContext, useContext } from "react";
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

  // Clear query when modal closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDebouncedQuery("");
    }
  }, [open]);

  const handleSelect = (asset: AssetSearchResult) => {
    onSelectAsset(asset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <Command className="rounded-lg border shadow-md">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Input
              placeholder="Search stocks, ETFs, crypto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
            />
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
            {isLoading && query.length >= 2 && (
              <div className="py-6 text-center text-sm">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Searching...</p>
              </div>
            )}
            
            {!isLoading && query.length >= 2 && (
              <>
                <CommandEmpty>
                  <div className="py-6 text-center text-sm">
                    <div className="mb-2">
                      <Search className="mx-auto h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground">No assets found for "{query}"</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Try searching for a stock symbol, company name, or cryptocurrency
                    </p>
                  </div>
                </CommandEmpty>
                
                {searchResults.length > 0 && (
                  <CommandGroup heading="Assets">
                    {searchResults.map((asset) => (
                      <CommandItem
                        key={`${asset.symbol}-${asset.assetType}`}
                        value={`${asset.symbol} ${asset.name} ${asset.assetType}`}
                        onSelect={() => handleSelect(asset)}
                        className="flex items-center justify-between p-3 cursor-pointer"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{asset.symbol}</span>
                              <Badge 
                                variant="outline" 
                                className="text-xs"
                                style={{ 
                                  borderColor: `hsl(${asset.assetType === 'equity' ? '210 40% 60%' : 
                                    asset.assetType === 'crypto' ? '45 93% 47%' : 
                                    asset.assetType === 'etf' ? '142 76% 36%' : '210 40% 60%'})`,
                                  color: `hsl(${asset.assetType === 'equity' ? '210 40% 60%' : 
                                    asset.assetType === 'crypto' ? '45 93% 47%' : 
                                    asset.assetType === 'etf' ? '142 76% 36%' : '210 40% 60%'})`
                                }}
                              >
                                {asset.assetType.toUpperCase()}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {asset.name}
                            </div>
                          </div>
                        </div>
                        
                        {asset.lastPrice && (
                          <div className="flex items-center space-x-2">
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

// Context for command palette state
interface CommandPaletteContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null);

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => {
    setOpen(prev => !prev);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const value = {
    open,
    setOpen,
    toggle,
    close,
  };

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

// Hook for using the command palette
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
}