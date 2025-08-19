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

// Schema for intraday data
const intradaySchema = z.object({
  symbol: z.string(),
  interval: z.string().optional().default("1m"),
  lookback: z.string().optional().default("1d")
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

  // Intraday price route
  app.get("/api/price/intraday", async (req, res) => {
    try {
      const { symbol, interval, lookback } = intradaySchema.parse(req.query);
      
      const requestData = {
        type: "intraday",
        symbol: symbol.toUpperCase(),
        interval,
        lookback
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
            const intradayData = JSON.parse(pythonOutput);
            res.json(intradayData);
          } catch (error) {
            res.status(500).json({ error: "Failed to parse intraday data" });
          }
        } else {
          res.status(500).json({ error: "Failed to fetch intraday data" });
        }
      });

    } catch (error) {
      res.status(400).json({ error: "Invalid request parameters" });
    }
  });

  // Market Sentiment route
  app.get("/api/sentiment", async (req, res) => {
    try {
      const symbols = ["^VIX", "^TNX", "SPY"];
      const sentimentData = [];
      
      // Fetch intraday data for sentiment indicators
      for (const symbol of symbols) {
        const requestData = {
          type: "intraday",
          symbol,
          interval: "1m",
          lookback: "1d"
        };

        const pythonProcess = spawn("python", ["python/main.py"], {
          stdio: ["pipe", "pipe", "pipe"]
        });

        pythonProcess.stdin.write(JSON.stringify(requestData));
        pythonProcess.stdin.end();

        let pythonOutput = "";
        pythonProcess.stdout.on("data", (data) => {
          pythonOutput += data.toString();
        });

        await new Promise((resolve) => {
          pythonProcess.on("close", (code) => {
            if (code === 0) {
              try {
                const data = JSON.parse(pythonOutput);
                sentimentData.push({ symbol, data });
              } catch (error) {
                console.error(`Failed to parse data for ${symbol}:`, error);
              }
            }
            resolve(null);
          });
        });
      }

      // Calculate sentiment score and drivers
      let sentimentScore = 50; // Neutral baseline
      const drivers = [];
      const timestamp = new Date().toISOString();

      // Process VIX (volatility index)
      const vixData = sentimentData.find(d => d.symbol === "^VIX");
      if (vixData?.data?.candles?.length > 0) {
        const latestVix = vixData.data.candles[vixData.data.candles.length - 1].close;
        if (latestVix < 20) {
          sentimentScore += 15;
          drivers.push({
            label: "VIX Low",
            weight: 15,
            explanation: `VIX at ${latestVix.toFixed(1)} indicates low fear → bullish`
          });
        } else if (latestVix > 30) {
          sentimentScore -= 20;
          drivers.push({
            label: "VIX High",
            weight: -20,
            explanation: `VIX at ${latestVix.toFixed(1)} indicates high fear → bearish`
          });
        } else {
          drivers.push({
            label: "VIX Neutral",
            weight: 0,
            explanation: `VIX at ${latestVix.toFixed(1)} indicates neutral sentiment`
          });
        }
      }

      // Process TNX (10-year treasury)
      const tnxData = sentimentData.find(d => d.symbol === "^TNX");
      if (tnxData?.data?.candles?.length > 1) {
        const candles = tnxData.data.candles;
        const latestYield = candles[candles.length - 1].close;
        const previousYield = candles[candles.length - 2].close;
        const yieldChange = ((latestYield - previousYield) / previousYield) * 100;
        
        if (yieldChange > 2) {
          sentimentScore -= 10;
          drivers.push({
            label: "Rates Rising",
            weight: -10,
            explanation: `10yr yield up ${yieldChange.toFixed(1)}% → cautious for growth`
          });
        } else if (yieldChange < -2) {
          sentimentScore += 10;
          drivers.push({
            label: "Rates Falling",
            weight: 10,
            explanation: `10yr yield down ${Math.abs(yieldChange).toFixed(1)}% → bullish for growth`
          });
        }
      }

      // Process SPY (S&P 500)
      const spyData = sentimentData.find(d => d.symbol === "SPY");
      if (spyData?.data?.candles?.length > 0) {
        const candles = spyData.data.candles;
        const latestPrice = candles[candles.length - 1].close;
        const openPrice = candles[0].open;
        const dayChange = ((latestPrice - openPrice) / openPrice) * 100;
        
        if (dayChange > 1) {
          sentimentScore += 20;
          drivers.push({
            label: "SPY Strong",
            weight: 20,
            explanation: `SPY up ${dayChange.toFixed(1)}% today → bullish momentum`
          });
        } else if (dayChange < -1) {
          sentimentScore -= 15;
          drivers.push({
            label: "SPY Weak",
            weight: -15,
            explanation: `SPY down ${Math.abs(dayChange).toFixed(1)}% today → bearish pressure`
          });
        } else {
          drivers.push({
            label: "SPY Stable",
            weight: 0,
            explanation: `SPY ${dayChange >= 0 ? 'up' : 'down'} ${Math.abs(dayChange).toFixed(1)}% → neutral`
          });
        }
      }

      // Ensure score stays within bounds
      sentimentScore = Math.max(0, Math.min(100, sentimentScore));

      res.json({
        score: Math.round(sentimentScore),
        drivers,
        timestamp,
        lastUpdated: new Date().toLocaleTimeString()
      });

    } catch (error) {
      console.error("Sentiment API error:", error);
      res.status(500).json({ error: "Failed to calculate market sentiment" });
    }
  });

  // AI Insights route (updated with context)
  app.post("/api/insights/explain", async (req, res) => {
    try {
      const { text } = insightsSchema.parse(req.body);
      
      // Get fresh context for AI insights
      let contextInfo = "";
      try {
        // Get portfolio data
        const portfolios = await storage.getPortfolios();
        if (portfolios.length > 0) {
          const portfolioId = portfolios[0].id;
          const summary = await storage.getPortfolioSummary(portfolioId);
          const positions = await storage.getPortfolioPositionsWithPrices(portfolioId);
          
          contextInfo += `Portfolio Context (as of ${new Date().toLocaleDateString()}):\n`;
          contextInfo += `- Total Value: $${summary.totalValue.toLocaleString()}\n`;
          contextInfo += `- Daily P&L: ${summary.dailyPnL >= 0 ? '+' : ''}$${summary.dailyPnL.toLocaleString()} (${summary.dailyPnLPercent.toFixed(2)}%)\n`;
          
          if (summary.topMover) {
            contextInfo += `- Top Mover: ${summary.topMover.symbol} ${summary.topMover.change >= 0 ? '+' : ''}$${summary.topMover.change.toLocaleString()} (${summary.topMover.changePercent.toFixed(2)}%)\n`;
          }
          
          contextInfo += `- Holdings: ${positions.map(p => `${p.symbol} (${p.assetType})`).join(', ')}\n\n`;
        }
        
        // Get market sentiment
        const sentimentResponse = await fetch('http://localhost:5000/api/sentiment');
        if (sentimentResponse.ok) {
          const sentimentData = await sentimentResponse.json();
          contextInfo += `Market Sentiment (${sentimentData.lastUpdated}):\n`;
          contextInfo += `- Sentiment Score: ${sentimentData.score}/100\n`;
          contextInfo += `- Key Drivers:\n`;
          sentimentData.drivers.forEach((driver: any) => {
            contextInfo += `  • ${driver.label}: ${driver.explanation}\n`;
          });
        }
      } catch (error) {
        console.error('Failed to fetch context:', error);
        contextInfo = "Context unavailable at this time.";
      }

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        // Return mock response with context
        const mockResponse = {
          summary: `Based on current context: ${contextInfo.slice(0, 200)}... Market analysis indicates mixed signals with defensive rotation patterns emerging. Your portfolio's diversification across equity, ETF, and crypto assets provides balanced exposure to different market segments.`,
          whyThisMatters: [
            "Fresh Data Integration: Analysis uses live portfolio P&L and current market sentiment scores rather than historical patterns.",
            "Real-time Context: Current holdings performance and sentiment drivers provide actionable insights for today's market conditions.",
            "Dynamic Assessment: Live volatility indicators and yield movements inform immediate risk positioning decisions."
          ]
        };
        return res.json(mockResponse);
      }

      // Use real OpenAI API with fresh context
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a financial analysis expert. Today's date is ${new Date().toLocaleDateString()}. Only use the supplied context data and today's date for your analysis. If data is missing from the context, explicitly state 'not available in current context'. Respond with JSON in this format: { 'summary': string, 'whyThisMatters': string[] }`
          },
          {
            role: "user",
            content: `Current Context:\n${contextInfo}\n\nUser Query: ${text}\n\nProvide analysis using ONLY the context data above and today's date. Reference specific numbers and data points from the context.`
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
