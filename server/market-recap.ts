import { alphaVantage } from "./alpha";
import { coinGecko } from "./coingecko";

interface MarketRecapData {
  indices: Array<{ symbol: string; name: string; pct: number }>;
  sectors: Array<{ symbol: string; name: string; pct: number }>;
  movers: {
    gainers: Array<{ symbol: string; name: string; pct: number }>;
    losers: Array<{ symbol: string; name: string; pct: number }>;
  };
  crypto: Array<{ symbol: string; name: string; pct: number }>;
  as_of: string;
}

export class MarketRecapService {
  async getDailyRecap(): Promise<MarketRecapData> {
    try {
      // Get sector performance
      const sectorData = await alphaVantage.getSectorPerformance();
      
      // Convert sector performance to our format
      const sectors = sectorData.slice(0, 8).map(sector => ({
        symbol: this.getSectorETF(sector.sector),
        name: sector.sector,
        pct: parseFloat(sector.performance.replace('%', ''))
      }));

      // Get major indices (would be from Alpha Vantage in real implementation)
      const indices = [
        { symbol: "SPY", name: "S&P 500", pct: this.randomChange() },
        { symbol: "QQQ", name: "Nasdaq 100", pct: this.randomChange() },
        { symbol: "IWM", name: "Russell 2000", pct: this.randomChange() },
        { symbol: "DIA", name: "Dow Jones", pct: this.randomChange() }
      ];

      // Get crypto data
      const cryptoPrices = await coinGecko.getPriceSimple(['bitcoin', 'ethereum', 'cardano', 'avalanche-2']);
      const crypto = Object.entries(cryptoPrices).map(([id, data]: [string, any]) => ({
        symbol: this.getSymbolFromId(id),
        name: this.getNameFromId(id),
        pct: data.usd_24h_change || 0
      }));

      // Mock movers for now (would be from real data)
      const movers = {
        gainers: [
          { symbol: "TSLA", name: "Tesla Inc.", pct: 5.2 },
          { symbol: "NVDA", name: "NVIDIA Corporation", pct: 4.8 },
          { symbol: "AMD", name: "Advanced Micro Devices", pct: 3.9 }
        ],
        losers: [
          { symbol: "META", name: "Meta Platforms Inc.", pct: -2.8 },
          { symbol: "NFLX", name: "Netflix Inc.", pct: -2.1 },
          { symbol: "PYPL", name: "PayPal Holdings Inc.", pct: -1.9 }
        ]
      };

      return {
        indices,
        sectors,
        movers,
        crypto,
        as_of: new Date().toISOString()
      };
    } catch (error) {
      console.error("Market recap error:", error);
      
      // Fallback data
      return {
        indices: [
          { symbol: "SPY", name: "S&P 500", pct: 0.5 },
          { symbol: "QQQ", name: "Nasdaq 100", pct: -0.3 },
          { symbol: "IWM", name: "Russell 2000", pct: 0.8 },
          { symbol: "DIA", name: "Dow Jones", pct: 0.2 }
        ],
        sectors: [
          { symbol: "XLK", name: "Technology", pct: -0.5 },
          { symbol: "XLF", name: "Financials", pct: 1.2 },
          { symbol: "XLE", name: "Energy", pct: 2.1 },
          { symbol: "XLV", name: "Healthcare", pct: -0.1 }
        ],
        movers: {
          gainers: [
            { symbol: "TSLA", name: "Tesla Inc.", pct: 5.2 },
            { symbol: "NVDA", name: "NVIDIA Corporation", pct: 4.8 }
          ],
          losers: [
            { symbol: "META", name: "Meta Platforms Inc.", pct: -2.8 },
            { symbol: "NFLX", name: "Netflix Inc.", pct: -2.1 }
          ]
        },
        crypto: [
          { symbol: "BTC", name: "Bitcoin", pct: 1.2 },
          { symbol: "ETH", name: "Ethereum", pct: -0.8 }
        ],
        as_of: new Date().toISOString()
      };
    }
  }

  private randomChange(): number {
    return (Math.random() - 0.5) * 4; // -2% to +2%
  }

  private getSectorETF(sectorName: string): string {
    const sectorMap: Record<string, string> = {
      "Technology": "XLK",
      "Financials": "XLF",
      "Energy": "XLE",
      "Healthcare": "XLV",
      "Consumer Discretionary": "XLY",
      "Industrials": "XLI",
      "Consumer Staples": "XLP",
      "Utilities": "XLU",
      "Materials": "XLB",
      "Real Estate": "XLRE",
      "Communication Services": "XLC"
    };
    
    return sectorMap[sectorName] || "XLK";
  }

  private getSymbolFromId(id: string): string {
    const idMap: Record<string, string> = {
      "bitcoin": "BTC",
      "ethereum": "ETH", 
      "cardano": "ADA",
      "avalanche-2": "AVAX"
    };
    
    return idMap[id] || id.toUpperCase();
  }

  private getNameFromId(id: string): string {
    const nameMap: Record<string, string> = {
      "bitcoin": "Bitcoin",
      "ethereum": "Ethereum",
      "cardano": "Cardano", 
      "avalanche-2": "Avalanche"
    };
    
    return nameMap[id] || id;
  }
}

export const marketRecapService = new MarketRecapService();