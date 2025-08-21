interface CacheItem<T> {
  data: T;
  expiresAt: number;
}

class CoinGeckoAPI {
  private baseUrl: string;
  private cache = new Map<string, CacheItem<any>>();
  private lastRequestTime = 0;
  private readonly RATE_LIMIT_MS = 1100; // ~50 requests per minute for free tier
  private readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor() {
    this.baseUrl = process.env.COINGECKO_BASE || "https://api.coingecko.com/api/v3";
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params, Object.keys(params).sort()) : "";
    return `${endpoint}:${paramString}`;
  }

  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.data;
    }
    if (item) {
      this.cache.delete(key);
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.CACHE_TTL_MS
    });
  }

  private async rateLimitedRequest<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getFromCache<T>(cacheKey);
    if (cached) {
      return cached;
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest));
    }

    this.lastRequestTime = Date.now();

    const url = new URL(`${this.baseUrl}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    this.setCache(cacheKey, data);
    return data;
  }

  async getPriceSimple(ids: string[], vsCurrencies = ["usd"]) {
    try {
      const data = await this.rateLimitedRequest<Record<string, any>>("/simple/price", {
        ids: ids.join(","),
        vs_currencies: vsCurrencies.join(","),
        include_24hr_change: "true"
      });

      return data;
    } catch (error) {
      console.error("CoinGecko price simple error:", error);
      return {};
    }
  }

  async getMarketChart(id: string, days: number, vsCurrency = "usd") {
    try {
      const data = await this.rateLimitedRequest<{
        prices: [number, number][];
        market_caps: [number, number][];
        total_volumes: [number, number][];
      }>(`/coins/${id}/market_chart`, {
        vs_currency: vsCurrency,
        days: days.toString()
      });

      return (data.prices || []).map(([timestamp, price]) => ({
        timestamp,
        price
      }));
    } catch (error) {
      console.error(`CoinGecko market chart error for ${id}:`, error);
      return [];
    }
  }

  async search(query: string) {
    try {
      const data = await this.rateLimitedRequest<{
        coins: Array<{
          id: string;
          name: string;
          symbol: string;
          market_cap_rank: number;
          thumb: string;
          large: string;
        }>;
      }>("/search", { query });

      return (data.coins || []).map(coin => ({
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        marketCapRank: coin.market_cap_rank
      }));
    } catch (error) {
      console.error("CoinGecko search error:", error);
      return [];
    }
  }

  // Symbol to ID mapping for common cryptocurrencies
  private symbolToIdMap: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'LTC': 'litecoin',
    'XLM': 'stellar',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'ALGO': 'algorand',
    'ATOM': 'cosmos',
    'XTZ': 'tezos',
    'AAVE': 'aave',
    'UNI': 'uniswap',
    'COMP': 'compound-governance-token'
  };

  getIdFromSymbol(symbol: string): string {
    return this.symbolToIdMap[symbol.toUpperCase()] || symbol.toLowerCase();
  }

  async getCoinData(symbol: string) {
    const id = this.getIdFromSymbol(symbol);
    try {
      const data = await this.rateLimitedRequest<any>(`/coins/${id}`, {
        localization: "false",
        tickers: "false",
        market_data: "true",
        community_data: "false",
        developer_data: "false",
        sparkline: "false"
      });

      return {
        id: data.id,
        symbol: data.symbol?.toUpperCase(),
        name: data.name,
        currentPrice: data.market_data?.current_price?.usd,
        priceChange24h: data.market_data?.price_change_24h,
        priceChangePercentage24h: data.market_data?.price_change_percentage_24h,
        marketCap: data.market_data?.market_cap?.usd,
        totalVolume: data.market_data?.total_volume?.usd
      };
    } catch (error) {
      console.error(`CoinGecko coin data error for ${symbol}:`, error);
      return null;
    }
  }
}

export const coinGecko = new CoinGeckoAPI();