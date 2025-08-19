import { apiRequest } from "./queryClient";
import type { 
  Portfolio, 
  InsertPortfolio, 
  PositionWithPrice, 
  PortfolioSummary,
  AIInsightResponse,
  PriceData 
} from "@shared/schema";

export const api = {
  // Portfolio operations
  async getPortfolios(): Promise<Portfolio[]> {
    const res = await apiRequest("GET", "/api/portfolios");
    return res.json();
  },

  async createPortfolio(data: InsertPortfolio): Promise<Portfolio> {
    const res = await apiRequest("POST", "/api/portfolios", data);
    return res.json();
  },

  async getPortfolioDetails(id: string): Promise<{
    portfolio: Portfolio;
    positions: PositionWithPrice[];
    summary: PortfolioSummary;
  }> {
    const res = await apiRequest("GET", `/api/portfolios/${id}`);
    return res.json();
  },

  // Position operations
  async uploadPositions(portfolioId: string, positions: any[]): Promise<{ success: boolean; positions: any[] }> {
    const res = await apiRequest("POST", `/api/portfolios/${portfolioId}/positions/upload`, { positions });
    return res.json();
  },

  // Price operations
  async refreshPrices(portfolioId: string): Promise<{ success: boolean; pricesUpdated: number }> {
    const res = await apiRequest("POST", "/api/refresh-prices", { portfolioId });
    return res.json();
  },

  async getPortfolioPriceHistory(portfolioId: string, days: number = 30): Promise<any[]> {
    const res = await apiRequest("GET", `/api/portfolios/${portfolioId}/price-history?days=${days}`);
    return res.json();
  },

  // AI Insights
  async getInsights(text: string): Promise<AIInsightResponse> {
    const res = await apiRequest("POST", "/api/insights/explain", { text });
    return res.json();
  }
};
