import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertPortfolioSchema, insertPositionSchema, insertPriceSchema } from "@shared/schema";
import { spawn } from "child_process";
import { z } from "zod";
import OpenAI from "openai";

// Schema for CSV upload
const csvUploadSchema = z.object({
  positions: z.array(z.object({
    symbol: z.string(),
    quantity: z.string(),
    avgCost: z.string(),
    assetType: z.enum(["equity", "etf", "crypto"])
  }))
});

// Schema for price refresh
const refreshPricesSchema = z.object({
  portfolioId: z.string()
});

// Schema for AI insights
const insightsSchema = z.object({
  text: z.string()
});

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Portfolio routes
  app.get("/api/portfolios", async (req, res) => {
    try {
      const portfolios = await storage.getPortfolios();
      res.json(portfolios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolios" });
    }
  });

  app.post("/api/portfolios", async (req, res) => {
    try {
      const validatedData = insertPortfolioSchema.parse(req.body);
      const portfolio = await storage.createPortfolio(validatedData);
      res.json(portfolio);
    } catch (error) {
      res.status(400).json({ error: "Invalid portfolio data" });
    }
  });

  app.get("/api/portfolios/:id", async (req, res) => {
    try {
      const portfolio = await storage.getPortfolio(req.params.id);
      if (!portfolio) {
        return res.status(404).json({ error: "Portfolio not found" });
      }
      
      const positions = await storage.getPortfolioPositionsWithPrices(req.params.id);
      const summary = await storage.getPortfolioSummary(req.params.id);
      
      res.json({
        portfolio,
        positions,
        summary
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio details" });
    }
  });

  // Position routes
  app.post("/api/portfolios/:id/positions/upload", async (req, res) => {
    try {
      const { positions } = csvUploadSchema.parse(req.body);
      const portfolioId = req.params.id;
      
      const createdPositions = [];
      for (const positionData of positions) {
        const position = await storage.upsertPosition({
          portfolioId,
          symbol: positionData.symbol.toUpperCase(),
          assetType: positionData.assetType,
          quantity: positionData.quantity,
          avgCost: positionData.avgCost
        });
        createdPositions.push(position);
      }
      
      res.json({ success: true, positions: createdPositions });
    } catch (error) {
      res.status(400).json({ error: "Invalid position data" });
    }
  });

  // Price refresh route
  app.post("/api/refresh-prices", async (req, res) => {
    try {
      const { portfolioId } = refreshPricesSchema.parse(req.body);
      
      const positions = await storage.getPositionsByPortfolio(portfolioId);
      if (positions.length === 0) {
        return res.json({ success: true, message: "No positions to refresh" });
      }

      // Separate equity/etf from crypto
      const equities = positions.filter(p => p.assetType === "equity" || p.assetType === "etf");
      const cryptos = positions.filter(p => p.assetType === "crypto");

      // Prepare data for Python script
      const requestData = {
        equities: equities.map(p => p.symbol),
        cryptos: cryptos.map(p => {
          // Map crypto symbols to CoinGecko IDs
          const symbolMap: { [key: string]: string } = {
            "BTC-USD": "bitcoin",
            "ETH-USD": "ethereum",
            "ADA-USD": "cardano",
            "SOL-USD": "solana"
          };
          return symbolMap[p.symbol] || p.symbol.toLowerCase().replace("-usd", "");
        })
      };

      // Call Python service
      const pythonProcess = spawn("python", ["python/main.py"], {
        stdio: ["pipe", "pipe", "pipe"]
      });

      pythonProcess.stdin.write(JSON.stringify(requestData));
      pythonProcess.stdin.end();

      let pythonOutput = "";
      pythonProcess.stdout.on("data", (data) => {
        pythonOutput += data.toString();
      });

      pythonProcess.on("close", async (code) => {
        if (code === 0) {
          try {
            const priceData = JSON.parse(pythonOutput);
            
            // Store prices in database
            for (const price of priceData) {
              await storage.upsertPrice({
                symbol: price.symbol,
                assetType: price.assetType,
                date: new Date(price.date),
                close: price.close.toString(),
                source: price.source
              });
            }
            
            res.json({ success: true, pricesUpdated: priceData.length });
          } catch (error) {
            res.status(500).json({ error: "Failed to parse price data" });
          }
        } else {
          res.status(500).json({ error: "Failed to fetch prices from external sources" });
        }
      });

    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  // AI Insights route
  app.post("/api/insights/explain", async (req, res) => {
    try {
      const { text } = insightsSchema.parse(req.body);
      
      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        // Return mock response
        const mockResponse = {
          summary: "Market analysis indicates mixed signals with defensive rotation patterns emerging. Your portfolio's diversification across equity, ETF, and crypto assets provides balanced exposure to different market segments, helping to mitigate correlation risk during periods of volatility.",
          whyThisMatters: [
            "Diversification Benefits: Your mix of traditional equities (AAPL), broad market exposure (SPY), and alternative assets (BTC) helps reduce correlation risk during market volatility.",
            "Quality Holdings: AAPL's strong fundamentals and market position provide stability, while SPY offers broad market exposure without sector concentration risk.",
            "Risk Management: The current allocation shows prudent position sizing, with no single asset dominating the portfolio's performance profile."
          ]
        };
        return res.json(mockResponse);
      }

      // Use real OpenAI API
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial analysis expert. Analyze the given text and provide insights about market trends, portfolio implications, and investment considerations. Respond with JSON in this format: { 'summary': string, 'whyThisMatters': string[] }"
          },
          {
            role: "user",
            content: `Please analyze this financial query and provide insights: ${text}`
          }
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);

    } catch (error) {
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // Price history route for charts
  app.get("/api/portfolios/:id/price-history", async (req, res) => {
    try {
      const portfolioId = req.params.id;
      const days = parseInt(req.query.days as string) || 30;
      
      const positions = await storage.getPositionsByPortfolio(portfolioId);
      const priceHistory = [];
      
      for (const position of positions) {
        const history = await storage.getPriceHistory(position.symbol, position.assetType, days);
        priceHistory.push({
          symbol: position.symbol,
          assetType: position.assetType,
          prices: history
        });
      }
      
      res.json(priceHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
