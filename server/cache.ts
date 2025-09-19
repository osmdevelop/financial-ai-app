interface CacheItem<T> {
  data: T;
  expiresAt: number;
  source: 'cache' | 'live' | 'mock';
  as_of: string;
}

class LRUCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheItem<T> | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check expiry
    if (item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    return item;
  }

  set(key: string, item: CacheItem<T>): void {
    // Remove existing item if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // If cache is at max capacity, remove least recently used (first item)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, item);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new LRUCache(1000);

/**
 * Generic caching function that handles data fetching with TTL-based caching
 * @param key - Unique cache key
 * @param ttlSec - Time to live in seconds
 * @param fetcher - Function that fetches the data
 * @returns Promise with cached or fresh data including metadata
 */
export async function getCachedOrFetch<T>(
  key: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<{
  data: T;
  source: 'cache' | 'live' | 'mock';
  as_of: string;
  fresh: boolean;
}> {
  // Try to get from cache first
  const cached = globalCache.get(key) as CacheItem<T> | null;
  if (cached) {
    return {
      data: cached.data,
      source: 'cache',
      as_of: cached.as_of,
      fresh: cached.source !== 'mock',
    };
  }

  let data: T;
  let source: 'live' | 'mock' = 'live';
  const as_of = new Date().toISOString();

  try {
    // Try to fetch live data
    data = await fetcher();
  } catch (error) {
    console.warn(`Cache miss and fetch failed for key ${key}:`, error);
    // Return mock data on error - this should be handled by the caller
    throw error;
  }

  // Store in cache
  const expiresAt = Date.now() + (ttlSec * 1000);
  globalCache.set(key, {
    data,
    expiresAt,
    source,
    as_of,
  });

  return {
    data,
    source,
    as_of,
    fresh: true,
  };
}

/**
 * Clear all cached data - useful for testing or manual refresh
 */
export function clearCache(): void {
  globalCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: globalCache.size(),
    maxSize: 1000,
  };
}