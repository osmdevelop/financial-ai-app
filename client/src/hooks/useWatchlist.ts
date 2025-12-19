import { useState, useEffect, useCallback } from "react";

export type WatchlistItem = {
  symbol: string;
  assetType: string;
  displayName?: string;
  addedAt: string;
};

const STORAGE_KEY = "watchlist_v1";
const MAX_ITEMS = 50;

function getStoredWatchlist(): WatchlistItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save watchlist:", e);
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(getStoredWatchlist);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setWatchlist(getStoredWatchlist());
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const addToWatchlist = useCallback((item: Omit<WatchlistItem, "addedAt">): boolean => {
    const current = getStoredWatchlist();
    
    if (current.length >= MAX_ITEMS) {
      return false;
    }
    
    const exists = current.some(
      (w) => w.symbol.toLowerCase() === item.symbol.toLowerCase()
    );
    if (exists) return true;
    
    const newItem: WatchlistItem = {
      ...item,
      addedAt: new Date().toISOString(),
    };
    
    const updated = [...current, newItem];
    saveWatchlist(updated);
    setWatchlist(updated);
    return true;
  }, []);

  const removeFromWatchlist = useCallback((symbol: string): void => {
    const current = getStoredWatchlist();
    const updated = current.filter(
      (w) => w.symbol.toLowerCase() !== symbol.toLowerCase()
    );
    saveWatchlist(updated);
    setWatchlist(updated);
  }, []);

  const isInWatchlist = useCallback((symbol: string): boolean => {
    return watchlist.some(
      (w) => w.symbol.toLowerCase() === symbol.toLowerCase()
    );
  }, [watchlist]);

  const clearWatchlist = useCallback((): void => {
    saveWatchlist([]);
    setWatchlist([]);
  }, []);

  return {
    watchlist,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
    clearWatchlist,
    maxItems: MAX_ITEMS,
    isFull: watchlist.length >= MAX_ITEMS,
  };
}
