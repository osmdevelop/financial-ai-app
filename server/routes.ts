import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertPortfolioSchema,
  insertPositionSchema,
  insertPriceSchema,
  insertTransactionSchema,
  insertWatchlistSchema,
  insertFocusAssetSchema,
  insertUserPrefsSchema,
  insertAlertSchema,
} from "@shared/schema";
import { spawn } from "child_process";
import { z } from "zod";
import { ZodError } from "zod";
import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

// Decide default mock policy: only allow mock by default in dev when env toggle is on.
const allowMockByDefault =
  process.env.NODE_ENV !== "production" && process.env.USE_MOCK_NEWS === "1";

// Schema for CSV upload
const csvUploadSchema = z.object({
  positions: z.array(
    z.object({
      symbol: z.string(),
      quantity: z.string(),
      avgCost: z.string(),
      assetType: z.enum(["equity", "etf", "crypto"]),
    }),
  ),
});

// Schema for price refresh
const refreshPricesSchema = z.object({
  portfolioId: z.string(),
});

// Schema for AI insights
const insightsSchema = z.object({
  text: z.string(),
});

// Schema for AI insight templates
const insightTemplateSchema = z.object({
  template: z.enum([
    "portfolio_health",
    "market_outlook",
    "risk_analysis",
    "opportunities",
    "weekly_summary",
  ]),
});

// Schema for intraday data
const intradaySchema = z.object({
  symbol: z.string(),
  interval: z.string().optional().default("1m"),
  lookback: z.string().optional().default("1d"),
});

// Schema for headlines
const headlineAnalyzeSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  symbols: z.array(z.string()).default([]),
});

// Schema for earnings prediction
const earningsPredictSchema = z.object({
  symbol: z.string(),
});

// Schema for economic impact analysis
const econAnalyzeSchema = z.object({
  event: z.string(),
  previous: z.string().optional(),
  forecast: z.string().optional(),
  importance: z.enum(["low", "medium", "high"]).default("medium"),
});

// Schema for asset search
const assetSearchSchema = z.object({
  q: z.string().min(1),
  types: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(",") : ["equity", "etf", "crypto"])),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10)),
});

// Schema for asset sheet
const assetSheetSchema = z.object({
  symbol: z.string(),
  assetType: z.enum(["equity", "etf", "crypto", "fx", "commodity"]),
});

// Phase 3 schemas
const focusAssetQuerySchema = z.object({
  portfolioId: z.string(),
});

const focusAssetReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number(),
    }),
  ),
});

const sentimentExplainSchema = z.object({
  indexPayload: z.any(),
  contextNote: z.string().optional(),
});

const assetOverviewSchema = z.object({
  symbol: z.string(),
  assetType: z.enum(["equity", "etf", "crypto", "fx", "commodity"]),
  frames: z.string().optional().default("1h,1d,1w,1m,3m,1y"),
});

const assetOverviewExplainSchema = z.object({
  overviewPayload: z.any(),
});

const headlinesTimelineSchema = z.object({
  symbols: z.string().optional(),
  scope: z.enum(["all", "focus", "watchlist"]).optional().default("all"),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 100)),
});

// Function to calculate impact level for headlines
function calculateImpactLevel(headline: any): "high" | "medium" | "low" {
  const sentimentScore = Math.abs(headline.sentimentScore || 0);
  const symbolCount = headline.symbols?.length || 0;
  const hasEarnings =
    headline.title?.toLowerCase().includes("earnings") || false;
  const hasBreaking =
    headline.title?.toLowerCase().includes("breaking") || false;

  // High impact: Strong sentiment + multiple symbols OR earnings/breaking news
  if ((sentimentScore > 0.3 && symbolCount > 2) || hasEarnings || hasBreaking) {
    return "high";
  }

  // Medium impact: Moderate sentiment + some symbols
  if (sentimentScore > 0.1 && symbolCount > 0) {
    return "medium";
  }

  // Low impact: everything else
  return "low";
}

const headlineImpactSchema = z.object({
  title: z.string(),
  summary: z.string().optional(),
  symbols: z.array(z.string()).default([]),
});

const recapSummarizeSchema = z.object({
  recapPayload: z.any(),
});

// Schema for transaction queries
const transactionQuerySchema = z.object({
  portfolioId: z.string(),
  symbol: z.string().optional(),
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
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

      const positions = await storage.getPortfolioPositionsWithPrices(
        req.params.id,
      );
      const summary = await storage.getPortfolioSummary(req.params.id);

      res.json({
        portfolio,
        positions,
        summary,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio details" });
    }
  });

  app.put("/api/portfolios/:id/archive", async (req, res) => {
    try {
      await storage.archivePortfolio(req.params.id);
      res.json({ success: true, message: "Portfolio archived" });
    } catch (error) {
      res.status(500).json({ error: "Failed to archive portfolio" });
    }
  });

  app.delete("/api/portfolios/:id", async (req, res) => {
    try {
      await storage.deletePortfolio(req.params.id);
      res.json({ success: true, message: "Portfolio deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete portfolio" });
    }
  });

  // Phase 4 - User Preferences routes
  app.get("/api/prefs", async (req, res) => {
    try {
      const portfolioId = req.query.portfolioId as string;
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }

      const prefs = await storage.getUserPrefs(portfolioId);
      if (!prefs) {
        return res.status(404).json({ error: "User preferences not found" });
      }

      res.json(prefs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user preferences" });
    }
  });

  app.post("/api/prefs", async (req, res) => {
    try {
      const validatedData = insertUserPrefsSchema.parse(req.body);
      const prefs = await storage.upsertUserPrefs(validatedData);
      res.json(prefs);
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid preferences data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save user preferences" });
    }
  });

  // Phase 4 - Alerts routes
  app.post("/api/alerts", async (req, res) => {
    try {
      const validatedData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(validatedData);
      res.json(alert);
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid alert data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create alert" });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    try {
      const portfolioId = req.query.portfolioId as string;
      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }

      const alerts = await storage.getAlerts(portfolioId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.patch("/api/alerts/:id", async (req, res) => {
    try {
      const updates = insertAlertSchema.partial().parse(req.body);
      const alert = await storage.updateAlert(req.params.id, updates);

      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json(alert);
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid alert data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update alert" });
    }
  });

  app.delete("/api/alerts/:id", async (req, res) => {
    try {
      await storage.deleteAlert(req.params.id);
      res.json({ success: true, message: "Alert deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete alert" });
    }
  });

  // Phase 4 - Notifications route
  app.get("/api/notifications", async (req, res) => {
    try {
      const portfolioId = req.query.portfolioId as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!portfolioId) {
        return res.status(400).json({ error: "portfolioId is required" });
      }

      const notifications = await storage.getNotifications(portfolioId, limit);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notifications" });
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
          avgCost: positionData.avgCost,
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
      const equities = positions.filter(
        (p) => p.assetType === "equity" || p.assetType === "etf",
      );
      const cryptos = positions.filter((p) => p.assetType === "crypto");

      // Prepare data for Python script
      const requestData = {
        equities: equities.map((p) => p.symbol),
        cryptos: cryptos.map((p) => {
          // Map crypto symbols to CoinGecko IDs
          const symbolMap: { [key: string]: string } = {
            "BTC-USD": "bitcoin",
            "ETH-USD": "ethereum",
            "ADA-USD": "cardano",
            "SOL-USD": "solana",
          };
          return (
            symbolMap[p.symbol] || p.symbol.toLowerCase().replace("-usd", "")
          );
        }),
      };

      // Call Python service
      const pythonProcess = spawn("python", ["python/main.py"], {
        stdio: ["pipe", "pipe", "pipe"],
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
                source: price.source,
              });
            }

            res.json({ success: true, pricesUpdated: priceData.length });
          } catch (error) {
            res.status(500).json({ error: "Failed to parse price data" });
          }
        } else {
          res
            .status(500)
            .json({ error: "Failed to fetch prices from external sources" });
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
        lookback,
      };

      // Call Python service
      const pythonProcess = spawn("python", ["python/main.py"], {
        stdio: ["pipe", "pipe", "pipe"],
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
      const sentimentData: Array<{ symbol: string; data: any }> = [];

      // Fetch intraday data for sentiment indicators
      for (const symbol of symbols) {
        const requestData = {
          type: "intraday",
          symbol,
          interval: "1m",
          lookback: "1d",
        };

        const pythonProcess = spawn("python", ["python/main.py"], {
          stdio: ["pipe", "pipe", "pipe"],
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
      const vixData = sentimentData.find((d) => d.symbol === "^VIX");
      if (
        vixData &&
        vixData.data &&
        vixData.data.candles &&
        vixData.data.candles.length > 0
      ) {
        const latestVix =
          vixData.data.candles[vixData.data.candles.length - 1].close;
        if (latestVix < 20) {
          sentimentScore += 15;
          drivers.push({
            label: "VIX Low",
            weight: 15,
            explanation: `VIX at ${latestVix.toFixed(1)} indicates low fear → bullish`,
          });
        } else if (latestVix > 30) {
          sentimentScore -= 20;
          drivers.push({
            label: "VIX High",
            weight: -20,
            explanation: `VIX at ${latestVix.toFixed(1)} indicates high fear → bearish`,
          });
        } else {
          drivers.push({
            label: "VIX Neutral",
            weight: 0,
            explanation: `VIX at ${latestVix.toFixed(1)} indicates neutral sentiment`,
          });
        }
      }

      // Process TNX (10-year treasury)
      const tnxData = sentimentData.find((d) => d.symbol === "^TNX");
      if (
        tnxData &&
        tnxData.data &&
        tnxData.data.candles &&
        tnxData.data.candles.length > 1
      ) {
        const candles = tnxData.data.candles;
        const latestYield = candles[candles.length - 1].close;
        const previousYield = candles[candles.length - 2].close;
        const yieldChange =
          ((latestYield - previousYield) / previousYield) * 100;

        if (yieldChange > 2) {
          sentimentScore -= 10;
          drivers.push({
            label: "Rates Rising",
            weight: -10,
            explanation: `10yr yield up ${yieldChange.toFixed(1)}% → cautious for growth`,
          });
        } else if (yieldChange < -2) {
          sentimentScore += 10;
          drivers.push({
            label: "Rates Falling",
            weight: 10,
            explanation: `10yr yield down ${Math.abs(yieldChange).toFixed(1)}% → bullish for growth`,
          });
        }
      }

      // Process SPY (S&P 500)
      const spyData = sentimentData.find((d) => d.symbol === "SPY");
      if (
        spyData &&
        spyData.data &&
        spyData.data.candles &&
        spyData.data.candles.length > 0
      ) {
        const candles = spyData.data.candles;
        const latestPrice = candles[candles.length - 1].close;
        const openPrice = candles[0].open;
        const dayChange = ((latestPrice - openPrice) / openPrice) * 100;

        if (dayChange > 1) {
          sentimentScore += 20;
          drivers.push({
            label: "SPY Strong",
            weight: 20,
            explanation: `SPY up ${dayChange.toFixed(1)}% today → bullish momentum`,
          });
        } else if (dayChange < -1) {
          sentimentScore -= 15;
          drivers.push({
            label: "SPY Weak",
            weight: -15,
            explanation: `SPY down ${Math.abs(dayChange).toFixed(1)}% today → bearish pressure`,
          });
        } else {
          drivers.push({
            label: "SPY Stable",
            weight: 0,
            explanation: `SPY ${dayChange >= 0 ? "up" : "down"} ${Math.abs(dayChange).toFixed(1)}% → neutral`,
          });
        }
      }

      // Ensure score stays within bounds
      sentimentScore = Math.max(0, Math.min(100, sentimentScore));

      res.json({
        score: Math.round(sentimentScore),
        drivers,
        timestamp,
        lastUpdated: new Date().toLocaleTimeString(),
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
          const positions =
            await storage.getPortfolioPositionsWithPrices(portfolioId);

          contextInfo += `Portfolio Context (as of ${new Date().toLocaleDateString()}):\n`;
          contextInfo += `- Total Value: $${summary.totalValue.toLocaleString()}\n`;
          contextInfo += `- Daily P&L: ${summary.dailyPnL >= 0 ? "+" : ""}$${summary.dailyPnL.toLocaleString()} (${summary.dailyPnLPercent.toFixed(2)}%)\n`;

          if (summary.topMover) {
            contextInfo += `- Top Mover: ${summary.topMover.symbol} ${summary.topMover.change >= 0 ? "+" : ""}$${summary.topMover.change.toLocaleString()} (${summary.topMover.changePercent.toFixed(2)}%)\n`;
          }

          contextInfo += `- Holdings: ${positions.map((p) => `${p.symbol} (${p.assetType})`).join(", ")}\n\n`;
        }

        // Get market sentiment
        const sentimentResponse = await fetch(
          "http://localhost:5000/api/sentiment",
        );
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
        console.error("Failed to fetch context:", error);
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
            "Dynamic Assessment: Live volatility indicators and yield movements inform immediate risk positioning decisions.",
          ],
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
            content: `You are a financial analysis expert. Today's date is ${new Date().toLocaleDateString()}. Only use the supplied context data and today's date for your analysis. If data is missing from the context, explicitly state 'not available in current context'. Respond with JSON in this format: { 'summary': string, 'whyThisMatters': string[] }`,
          },
          {
            role: "user",
            content: `Current Context:\n${contextInfo}\n\nUser Query: ${text}\n\nProvide analysis using ONLY the context data above and today's date. Reference specific numbers and data points from the context.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  // AI Insight Templates route
  app.post("/api/insights/run", async (req, res) => {
    try {
      const { template } = insightTemplateSchema.parse(req.body);

      // Define template prompts and mock responses
      const templates = {
        portfolio_health: {
          prompt:
            "Analyze my portfolio's overall health, diversification, and risk exposure",
          mockResponse: {
            summary:
              "Your portfolio demonstrates strong fundamentals with a well-balanced allocation across 3 asset classes. Current diversification metrics show healthy risk distribution with moderate correlation between holdings.",
            whyThisMatters: [
              "Risk Balance: Your 60/30/10 equity/ETF/crypto split provides growth potential while limiting single-asset exposure",
              "Correlation Analysis: Holdings show low correlation (0.3 average), reducing portfolio volatility during market stress",
              "Rebalancing Signal: Current allocation remains within target bands, no immediate rebalancing required",
            ],
          },
        },
        market_outlook: {
          prompt:
            "Provide current market outlook and how it affects my portfolio positioning",
          mockResponse: {
            summary:
              "Market conditions show mixed signals with defensive rotation in progress. Current sentiment analysis indicates cautious optimism with volatility concerns in growth sectors.",
            whyThisMatters: [
              "Sector Rotation: Value sectors outperforming growth aligns with your defensive ETF positions",
              "Volatility Hedging: Your diversified approach provides natural hedging against current market uncertainty",
              "Opportunity Window: Recent pullbacks may present entry points for quality names on your watchlist",
            ],
          },
        },
        risk_analysis: {
          prompt:
            "Analyze current risk factors and potential vulnerabilities in my portfolio",
          mockResponse: {
            summary:
              "Portfolio risk analysis reveals moderate exposure with key concentrations in technology and growth sectors. Current beta suggests portfolio volatility aligns with broader market movements.",
            whyThisMatters: [
              "Concentration Risk: Technology allocation represents 35% of portfolio, creating sector-specific vulnerability",
              "Market Beta: Portfolio beta of 1.2 indicates higher volatility than market average during corrections",
              "Liquidity Profile: All holdings maintain strong daily volume, ensuring exit flexibility during stress events",
            ],
          },
        },
        opportunities: {
          prompt:
            "Identify potential opportunities and actionable insights for portfolio optimization",
          mockResponse: {
            summary:
              "Market analysis reveals emerging opportunities in defensive sectors and oversold quality names. Current valuations suggest selective accumulation opportunities in core holdings.",
            whyThisMatters: [
              "Valuation Opportunity: Recent market correction has pushed quality names below historical averages",
              "Defensive Rotation: Utilities and consumer staples showing relative strength, supporting your ETF positions",
              "Accumulation Zone: Current price levels for top holdings suggest favorable risk/reward for additional positions",
            ],
          },
        },
        weekly_summary: {
          prompt:
            "Provide a comprehensive weekly portfolio and market summary with key insights",
          mockResponse: {
            summary:
              "This week's portfolio performance shows resilience despite market volatility. Key positions demonstrated defensive characteristics while maintaining exposure to growth opportunities.",
            whyThisMatters: [
              "Weekly Performance: Portfolio outperformed benchmarks by 1.2% due to defensive positioning and low correlation",
              "Market Context: Broader indices faced pressure from rate concerns, validating your balanced allocation strategy",
              "Next Week Setup: Technical indicators suggest continued volatility, supporting current defensive posture",
            ],
          },
        },
      };

      // Get context for real API calls
      let contextInfo = "";
      try {
        // Get portfolio data
        const portfolios = await storage.getPortfolios();
        if (portfolios.length > 0) {
          const portfolioId = portfolios[0].id;
          const summary = await storage.getPortfolioSummary(portfolioId);
          const positions =
            await storage.getPortfolioPositionsWithPrices(portfolioId);

          contextInfo += `Portfolio Context (as of ${new Date().toLocaleDateString()}):\n`;
          contextInfo += `- Total Value: $${summary.totalValue.toLocaleString()}\n`;
          contextInfo += `- Daily P&L: ${summary.dailyPnL >= 0 ? "+" : ""}$${summary.dailyPnL.toLocaleString()} (${summary.dailyPnLPercent.toFixed(2)}%)\n`;

          if (summary.topMover) {
            contextInfo += `- Top Mover: ${summary.topMover.symbol} ${summary.topMover.change >= 0 ? "+" : ""}$${summary.topMover.change.toLocaleString()} (${summary.topMover.changePercent.toFixed(2)}%)\n`;
          }

          contextInfo += `- Holdings: ${positions.map((p) => `${p.symbol} (${p.assetType})`).join(", ")}\n\n`;
        }

        // Get market sentiment
        const sentimentResponse = await fetch(
          "http://localhost:5000/api/sentiment",
        );
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
        console.error("Failed to fetch context:", error);
        contextInfo = "Context unavailable at this time.";
      }

      const templateData = templates[template];

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        // Return template mock response
        return res.json(templateData.mockResponse);
      }

      // Use real OpenAI API with template prompt and context
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a financial analysis expert. Today's date is ${new Date().toLocaleDateString()}. Only use the supplied context data and today's date for your analysis. If data is missing from the context, explicitly state 'not available in current context'. Respond with JSON in this format: { 'summary': string, 'whyThisMatters': string[] }`,
          },
          {
            role: "user",
            content: `Current Context:\n${contextInfo}\n\nTemplate Analysis Request: ${templateData.prompt}\n\nProvide analysis using ONLY the context data above and today's date. Reference specific numbers and data points from the context. Focus specifically on the template topic requested.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid request", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate template insights" });
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
        const history = await storage.getPriceHistory(
          position.symbol,
          position.assetType,
          days,
        );
        priceHistory.push({
          symbol: position.symbol,
          assetType: position.assetType,
          prices: history,
        });
      }

      res.json(priceHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch price history" });
    }
  });

  // Headlines routes
  app.get("/api/headlines", async (req, res) => {
    try {
      const symbols = req.query.symbols as string;
      const limit = parseInt(req.query.limit as string) || 50;

      // Try to get live headlines from NewsAPI
      if (process.env.NEWSAPI_KEY) {
        try {
          const response = await fetch(
            `https://newsapi.org/v2/everything?q=stock market OR economy OR earnings&sortBy=publishedAt&pageSize=${limit}&apiKey=${process.env.NEWSAPI_KEY}`,
          );

          if (response.ok) {
            const newsData = await response.json();
            const headlines = [];

            // Known symbols to detect in headlines
            const knownSymbols = [
              "AAPL",
              "MSFT",
              "GOOGL",
              "AMZN",
              "TSLA",
              "META",
              "NVDA",
              "SPY",
              "QQQ",
              "BTC-USD",
              "ETH-USD",
            ];

            for (const article of newsData.articles || []) {
              // Simple symbol detection in title
              const detectedSymbols = knownSymbols.filter(
                (symbol) =>
                  article.title?.toLowerCase().includes(symbol.toLowerCase()) ||
                  article.title
                    ?.toLowerCase()
                    .includes(symbol.replace("-USD", "").toLowerCase()),
              );

              const headline = await storage.createHeadline({
                published: article.publishedAt || new Date().toISOString(),
                title: article.title || "",
                source: article.source?.name || "Unknown",
                url: article.url || "",
                symbols: detectedSymbols,
                summary: article.description,
                analyzed: false,
              });
              headlines.push(headline);
            }

            return res.json(headlines);
          }
        } catch (error) {
          console.error("NewsAPI error:", error);
        }
      }

      // Fallback to sample data
      try {
        const sampleData = await fs.readFile(
          path.join(process.cwd(), "infra/dev/headlines.sample.json"),
          "utf-8",
        );
        const headlines = JSON.parse(sampleData);

        // Store in memory for future requests
        for (const headline of headlines) {
          await storage.createHeadline({
            published: headline.published,
            title: headline.title,
            source: headline.source,
            url: headline.url,
            symbols: headline.symbols || [],
            summary: headline.summary,
            analyzed: headline.analyzed || false,
          });
        }

        res.json(headlines.slice(0, limit));
      } catch (error) {
        res.status(500).json({ error: "Failed to load sample headlines" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch headlines" });
    }
  });

  app.post("/api/headlines/analyze", async (req, res) => {
    try {
      const { title, summary, symbols } = headlineAnalyzeSchema.parse(req.body);
      const as_of = new Date().toISOString();

      // Check if OpenAI API key is available
      if (!process.env.OPENAI_API_KEY) {
        // Return mock analysis using keyword rules
        const whyThisMatters = [];
        const impacts: Array<{
          symbol: string;
          direction: "up" | "down" | "neutral";
          confidence: number;
        }> = [];

        // Simple keyword-based analysis
        const text = `${title} ${summary || ""}`.toLowerCase();

        if (
          text.includes("beats") ||
          text.includes("strong") ||
          text.includes("growth")
        ) {
          whyThisMatters.push(
            "Strong earnings typically drive stock price appreciation",
          );
          symbols.forEach((symbol) => {
            impacts.push({ symbol, direction: "up" as const, confidence: 0.7 });
          });
        } else if (
          text.includes("miss") ||
          text.includes("weak") ||
          text.includes("decline")
        ) {
          whyThisMatters.push(
            "Disappointing results may pressure stock valuation",
          );
          symbols.forEach((symbol) => {
            impacts.push({
              symbol,
              direction: "down" as const,
              confidence: 0.6,
            });
          });
        } else {
          whyThisMatters.push(
            "Market impact depends on broader context and investor sentiment",
          );
          symbols.forEach((symbol) => {
            impacts.push({
              symbol,
              direction: "neutral" as const,
              confidence: 0.5,
            });
          });
        }

        return res.json({ whyThisMatters, impacts, as_of });
      }

      // Use OpenAI for analysis
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a financial analyst. Today is ${new Date().toLocaleDateString()}. Analyze the provided headline and return JSON with: { 'whyThisMatters': string[], 'impacts': [{ 'symbol': string, 'direction': 'up'|'down'|'neutral', 'confidence': number }], 'as_of': string }. Only use the provided headline content.`,
          },
          {
            role: "user",
            content: `Title: ${title}\nSummary: ${summary || "Not provided"}\nSymbols: ${symbols.join(", ")}\n\nAnalyze potential market impact.`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || "{}");
      result.as_of = as_of;
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze headline" });
    }
  });

  // Earnings routes
  app.get("/api/earnings/upcoming", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;

      // Load sample earnings data
      const csvData = await fs.readFile(
        path.join(process.cwd(), "infra/dev/earnings.sample.csv"),
        "utf-8",
      );
      const lines = csvData.trim().split("\n");
      const headers = lines[0].split(",");

      const earnings = lines.slice(1).map((line) => {
        const values = line.split(",");
        return {
          symbol: values[0],
          date: values[1],
          eps_est: parseFloat(values[2]),
          sector: values[3],
        };
      });

      res.json(earnings.slice(0, limit));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch upcoming earnings" });
    }
  });

  app.get("/api/earnings/history", async (req, res) => {
    try {
      const symbol = req.query.symbol as string;

      if (!symbol) {
        return res.status(400).json({ error: "Symbol parameter is required" });
      }

      // Mock earnings history (in real implementation, would use yfinance)
      const mockHistory = [
        {
          quarter: "Q3 2024",
          actual: 2.18,
          estimate: 2.1,
          surprise: 0.08,
          surprisePercent: 3.8,
        },
        {
          quarter: "Q2 2024",
          actual: 1.95,
          estimate: 2.05,
          surprise: -0.1,
          surprisePercent: -4.9,
        },
        {
          quarter: "Q1 2024",
          actual: 2.33,
          estimate: 2.2,
          surprise: 0.13,
          surprisePercent: 5.9,
        },
        {
          quarter: "Q4 2023",
          actual: 2.87,
          estimate: 2.75,
          surprise: 0.12,
          surprisePercent: 4.4,
        },
      ];

      res.json(mockHistory);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch earnings history" });
    }
  });

  app.post("/api/earnings/predict", async (req, res) => {
    try {
      const { symbol } = earningsPredictSchema.parse(req.body);
      const as_of = new Date().toISOString();

      // Simple heuristic prediction based on mock history
      const mockHistory = [
        { surprise: 0.08, surprisePercent: 3.8 },
        { surprise: -0.1, surprisePercent: -4.9 },
        { surprise: 0.13, surprisePercent: 5.9 },
        { surprise: 0.12, surprisePercent: 4.4 },
      ];

      const positiveCount = mockHistory.filter((h) => h.surprise > 0).length;
      const totalCount = mockHistory.length;

      const surpriseUpProb = positiveCount / totalCount;
      const surpriseDownProb = 1 - surpriseUpProb;

      const commentary =
        surpriseUpProb > 0.6
          ? `${symbol} has beaten estimates in ${positiveCount} of the last ${totalCount} quarters, suggesting potential for positive surprise.`
          : surpriseUpProb < 0.4
            ? `${symbol} has missed estimates in ${totalCount - positiveCount} of the last ${totalCount} quarters, indicating elevated risk.`
            : `${symbol} shows mixed earnings history with balanced surprise probability.`;

      res.json({
        surpriseUpProb,
        surpriseDownProb,
        commentary,
        as_of,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to predict earnings" });
    }
  });

  // Economic Calendar routes
  app.get("/api/econ/upcoming", async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;

      // Try Trading Economics API if key available
      if (process.env.TRADING_ECONOMICS_KEY) {
        // In a real implementation, would call Trading Economics API
        // For now, fall through to sample data
      }

      // Load sample economic data
      const sampleData = await fs.readFile(
        path.join(process.cwd(), "infra/dev/econ.sample.json"),
        "utf-8",
      );
      const events = JSON.parse(sampleData);

      // Filter events within the requested days
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() + days);

      const filteredEvents = events.filter((event: any) => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= new Date() && eventDate <= cutoff;
      });

      res.json(filteredEvents);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch economic events" });
    }
  });

  app.post("/api/econ/analyze", async (req, res) => {
    try {
      const { event, previous, forecast, importance } = econAnalyzeSchema.parse(
        req.body,
      );
      const as_of = new Date().toISOString();

      // Rule-based impact analysis
      const affectedAssets = [];
      const directionByAsset: any = {};
      let reasoning = "";

      const eventLower = event.toLowerCase();

      if (eventLower.includes("cpi") || eventLower.includes("inflation")) {
        affectedAssets.push("rates", "usd", "gold");
        directionByAsset.rates = "up";
        directionByAsset.usd = "up";
        directionByAsset.gold = "down";
        reasoning =
          "Inflation data typically drives rate expectations and currency strength";
      } else if (
        eventLower.includes("employment") ||
        eventLower.includes("jobless")
      ) {
        affectedAssets.push("equities", "usd");
        directionByAsset.equities = "up";
        directionByAsset.usd = "up";
        reasoning =
          "Employment data reflects economic health and consumer spending power";
      } else if (eventLower.includes("gdp")) {
        affectedAssets.push("equities", "usd");
        directionByAsset.equities = "up";
        directionByAsset.usd = "up";
        reasoning =
          "GDP growth data drives broad market sentiment and currency strength";
      } else if (eventLower.includes("fomc") || eventLower.includes("fed")) {
        affectedAssets.push("rates", "equities", "usd", "gold");
        directionByAsset.rates = "mixed";
        directionByAsset.equities = "mixed";
        directionByAsset.usd = "mixed";
        directionByAsset.gold = "mixed";
        reasoning = "Federal Reserve decisions impact all major asset classes";
      } else {
        affectedAssets.push("equities");
        directionByAsset.equities = "mixed";
        reasoning =
          "Economic event may have moderate impact on market sentiment";
      }

      let explanation = reasoning;

      // Add OpenAI explanation if available
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content:
                  "You are an economic analyst. Provide a concise explanation of how this economic event might impact markets. Keep response under 100 words.",
              },
              {
                role: "user",
                content: `Event: ${event}\nPrevious: ${previous || "N/A"}\nForecast: ${forecast || "N/A"}\nImportance: ${importance}`,
              },
            ],
          });

          explanation = response.choices[0].message.content || reasoning;
        } catch (error) {
          console.error("OpenAI error in econ analysis:", error);
        }
      }

      res.json({
        affectedAssets,
        directionByAsset,
        reasoning,
        explanation,
        as_of,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to analyze economic event" });
    }
  });

  // Asset Search API
  app.get("/api/search", async (req, res) => {
    try {
      const { q, types, limit } = assetSearchSchema.parse(req.query);
      const results = await storage.searchAssets(q, types, limit);
      res.json(results);
    } catch (error) {
      res.status(400).json({ error: "Invalid search parameters" });
    }
  });

  // Asset Overview / Multi-timeframe (MUST come before /api/asset/:symbol)
  app.get("/api/asset/overview", async (req, res) => {
    try {
      const { symbol, assetType, frames } = assetOverviewSchema.parse(
        req.query,
      );

      // First check if the asset exists in our search results by exact symbol match
      const searchResults = await storage.searchAssets(symbol);
      const validAsset = searchResults.find(
        (asset) =>
          asset.symbol.toLowerCase() === symbol.toLowerCase() &&
          asset.assetType === assetType,
      );

      if (!validAsset) {
        return res.status(404).json({
          error: `Asset ${symbol} (${assetType}) not found. Please search for valid assets from our database.`,
          suggestion: "Try searching for AAPL, GOOGL, BTC, or SPY",
        });
      }

      const timeframes = frames.split(",");

      // Use real data service for overview
      const { assetOverviewService } = await import("./asset-overview");
      const overview = await assetOverviewService.getAssetOverview(
        validAsset.symbol,
        validAsset.assetType,
        timeframes,
      );

      res.json({
        ...overview,
        name: validAsset.name, // Use the real name from search results
        symbol: validAsset.symbol, // Ensure consistent symbol casing
      });
    } catch (error) {
      console.error("Asset overview error:", error);
      // Fallback to mock data on error
      const timeframes = req.query.frames
        ? String(req.query.frames).split(",")
        : ["1d"];
      const fallbackOverview = await storage.getAssetOverview(
        String(req.query.symbol),
        String(req.query.assetType),
        timeframes,
      );
      res.json(fallbackOverview);
    }
  });

  app.post("/api/asset/overview/explain", async (req, res) => {
    try {
      const { overviewPayload } = assetOverviewExplainSchema.parse(req.body);
      const summary = await storage.getAssetOverviewSummary(overviewPayload);
      res.json(summary);
    } catch (error) {
      console.error("Asset overview summary error:", error);
      res.status(500).json({ error: "Failed to generate overview summary" });
    }
  });

  // Asset Sheet API (MUST come after specific routes)
  app.get("/api/asset/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { assetType } = assetSheetSchema.parse({
        symbol,
        assetType: req.query.assetType,
      });

      const assetData = await storage.getAssetSheetData(symbol, assetType);
      if (!assetData) {
        return res.status(404).json({ error: "Asset not found" });
      }

      res.json(assetData);
    } catch (error) {
      res.status(400).json({ error: "Invalid asset parameters" });
    }
  });

  // Transaction CRUD APIs
  app.post("/api/transactions", async (req, res) => {
    try {
      console.log(
        "Received transaction data:",
        JSON.stringify(req.body, null, 2),
      );
      const validatedData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(validatedData);

      // Return updated position for the symbol
      const updatedPosition = await storage.getComputedPosition(
        validatedData.portfolioId,
        validatedData.symbol,
      );

      res.json({ transaction, position: updatedPosition });
    } catch (error) {
      console.error("Transaction validation error:", error);
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({ error: "Invalid transaction data", details: error.errors });
      } else {
        res.status(400).json({ error: "Invalid transaction data" });
      }
    }
  });

  app.get("/api/transactions", async (req, res) => {
    try {
      const { portfolioId, symbol } = transactionQuerySchema.parse(req.query);
      const transactions = await storage.getTransactionsByPortfolio(
        portfolioId,
        symbol,
      );
      res.json(transactions);
    } catch (error) {
      res.status(400).json({ error: "Invalid query parameters" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = insertTransactionSchema.partial().parse(req.body);
      const transaction = await storage.updateTransaction(id, updates);

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      res.json(transaction);
    } catch (error) {
      res.status(400).json({ error: "Invalid transaction data" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteTransaction(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete transaction" });
    }
  });

  // Computed Positions API
  app.get("/api/positions", async (req, res) => {
    try {
      const { portfolioId } = req.query;
      if (!portfolioId || typeof portfolioId !== "string") {
        return res.status(400).json({ error: "Portfolio ID required" });
      }

      const positions = await storage.getComputedPositions(portfolioId);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  // Watchlist APIs
  app.post("/api/watchlist", async (req, res) => {
    try {
      const validatedData = insertWatchlistSchema.parse(req.body);
      const item = await storage.addToWatchlist(validatedData);
      res.json(item);
    } catch (error) {
      res.status(400).json({ error: "Invalid watchlist data" });
    }
  });

  app.get("/api/watchlist", async (req, res) => {
    try {
      const watchlist = await storage.getWatchlist();
      res.json(watchlist);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch watchlist" });
    }
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeFromWatchlist(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove from watchlist" });
    }
  });

  // Migration endpoint removed - using transaction-based system from start

  // ===== PHASE 3 API ROUTES =====

  // Enhanced Sentiment Index
  app.get("/api/sentiment/index", async (req, res) => {
    try {
      const { sentimentAnalyzer } = await import("./sentiment");
      const { withFreshness, createLiveFreshness, createFallbackFreshness } =
        await import("./freshness");

      const result = await sentimentAnalyzer.calculateSentimentIndex();

      // Check if we got live data or fallback based on error patterns
      const hasLiveData = !result.drivers.every((d) =>
        d.note.includes("using baseline"),
      );

      const freshness = hasLiveData
        ? createLiveFreshness("Alpha Vantage", 5)
        : createFallbackFreshness("API rate limits reached");

      res.json(withFreshness(result, freshness));
    } catch (error) {
      console.error("Enhanced sentiment error:", error);
      res.status(500).json({ error: "Failed to get sentiment index" });
    }
  });

  app.post("/api/sentiment/explain", async (req, res) => {
    try {
      const { indexPayload, contextNote } = sentimentExplainSchema.parse(
        req.body,
      );
      const narrative = await storage.getSentimentNarrative(
        indexPayload,
        contextNote,
      );
      res.json(narrative);
    } catch (error) {
      console.error("Sentiment narrative error:", error);
      res.status(500).json({ error: "Failed to generate sentiment narrative" });
    }
  });

  // Focus Assets CRUD
  app.get("/api/focus-assets", async (req, res) => {
    try {
      const { portfolioId } = focusAssetQuerySchema.parse(req.query);
      const focusAssets = await storage.getFocusAssets(portfolioId);
      res.json(focusAssets);
    } catch (error) {
      console.error("Get focus assets error:", error);
      res.status(500).json({ error: "Failed to get focus assets" });
    }
  });

  app.post("/api/focus-assets", async (req, res) => {
    try {
      const focusAssetData = insertFocusAssetSchema.parse(req.body);
      const focusAsset = await storage.createFocusAsset(focusAssetData);
      res.json(focusAsset);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Maximum 5 focus assets")
      ) {
        return res
          .status(400)
          .json({ error: "Limit reached — remove one to add another" });
      }
      console.error("Create focus asset error:", error);
      res.status(500).json({ error: "Failed to create focus asset" });
    }
  });

  app.delete("/api/focus-assets/:id", async (req, res) => {
    try {
      await storage.deleteFocusAsset(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete focus asset error:", error);
      res.status(500).json({ error: "Failed to delete focus asset" });
    }
  });

  app.patch("/api/focus-assets/reorder", async (req, res) => {
    try {
      const { items } = focusAssetReorderSchema.parse(req.body);
      await storage.reorderFocusAssets(items);
      res.json({ success: true });
    } catch (error) {
      console.error("Reorder focus assets error:", error);
      res.status(500).json({ error: "Failed to reorder focus assets" });
    }
  });

  // Market Recap (daily)
  app.get("/api/recap/daily", async (req, res) => {
    try {
      // Try real data first
      try {
        const { marketRecapService } = await import("./market-recap");
        const recap = await marketRecapService.getDailyRecap();
        res.json(recap);
      } catch (apiError) {
        console.warn(
          "Market recap API error, falling back to mock data:",
          apiError,
        );
        const recap = await storage.getMarketRecap();
        res.json(recap);
      }
    } catch (error) {
      console.error("Market recap error:", error);
      res.status(500).json({ error: "Failed to get market recap" });
    }
  });

  app.post("/api/recap/summarize", async (req, res) => {
    try {
      const { recapPayload } = recapSummarizeSchema.parse(req.body);
      const summary = await storage.getMarketRecapSummary(recapPayload);
      res.json(summary);
    } catch (error) {
      console.error("Market recap summary error:", error);
      res.status(500).json({ error: "Failed to generate recap summary" });
    }
  });

  // Enhanced Headlines timeline with scope filtering and impact levels
  apapp.get("/api/headlines/timeline", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");

    try {
      const { symbols, scope, limit } = headlinesTimelineSchema.parse(
        req.query,
      );
      let symbolsArray = symbols ? symbols.split(",") : undefined;

      // Handle scope-based filtering
      if (scope === "watchlist" && !symbolsArray) {
        const watchlist = await storage.getWatchlist();
        symbolsArray = watchlist.map((item) => item.symbol);
      }

      // Honor client override: mock=0 => never use mock; mock=1 => force allow
      const mockParam = (req.query.mock as string | undefined) || undefined;
      const useMock =
        mockParam === "1"
          ? true
          : mockParam === "0"
            ? false
            : allowMockByDefault;

      const { headlinesService } = await import("./headlines");
      const { withFreshness, createLiveFreshness, createFallbackFreshness } =
        await import("./freshness");

      try {
        // Attempt real provider; allowMock determines whether service may fallback
        const headlines = await headlinesService.getTimeline({
          tickers: symbolsArray,
          limit: limit || 50,
          allowMock: useMock, // <— critical
        });

        // If we *allowed* mock and still got data, we need to detect if it's fallback.
        // Heuristic: if any url is "", treat as fallback; otherwise live.
        const isFallback = headlines.every((h) => !h.url);

        const enhanced = headlines.map((h) => ({
          ...h,
          impactLevel: calculateImpactLevel(h),
        }));

        const freshness = isFallback
          ? createFallbackFreshness("Alpha Vantage unavail / rate limits")
          : createLiveFreshness("Alpha Vantage", 2);

        return res.json(withFreshness(enhanced, freshness));
      } catch (e) {
        // Service threw because allowMock=false or hard failure
        if (useMock) {
          const fallback = await storage.getHeadlinesTimeline(
            symbolsArray,
            limit,
          );
          const enhancedFallback = fallback.map((h) => ({
            ...h,
            impactLevel: calculateImpactLevel(h),
          }));
          const freshness = createFallbackFreshness("API service error");
          return res.json(withFreshness(enhancedFallback, freshness));
        }
        return res.status(502).json({ error: "upstream_unavailable" });
      }
    } catch (error) {
      console.error("Headlines timeline error:", error);
      res.status(500).json({ error: "Failed to get headlines timeline" });
    }
  });

  app.post("/api/headlines/impact", async (req, res) => {
    try {
      const { title, summary, symbols } = headlineImpactSchema.parse(req.body);
      const impact = await storage.analyzeHeadlineImpact(
        title,
        summary,
        symbols,
      );
      res.json(impact);
    } catch (error) {
      console.error("Headline impact analysis error:", error);
      res.status(500).json({ error: "Failed to analyze headline impact" });
    }
  });

  // Initialize sample data on startup
  await storage.initializeSampleData();

  const httpServer = createServer(app);
  return httpServer;
}
