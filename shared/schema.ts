import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").notNull().default("USD"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").notNull().references(() => portfolios.id, { onDelete: "cascade" }),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(), // "equity" | "etf" | "crypto"
  quantity: decimal("quantity").notNull(),
  avgCost: decimal("avg_cost").notNull(),
});

export const prices = pgTable("prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: text("symbol").notNull(),
  assetType: text("asset_type").notNull(),
  date: timestamp("date").notNull(),
  close: decimal("close").notNull(),
  source: text("source").notNull(),
});

// Insert schemas
export const insertPortfolioSchema = createInsertSchema(portfolios).pick({
  name: true,
  baseCurrency: true,
});

export const insertPositionSchema = createInsertSchema(positions).pick({
  portfolioId: true,
  symbol: true,
  assetType: true,
  quantity: true,
  avgCost: true,
});

export const insertPriceSchema = createInsertSchema(prices).pick({
  symbol: true,
  assetType: true,
  date: true,
  close: true,
  source: true,
});

// Types
export type Portfolio = typeof portfolios.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Price = typeof prices.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type InsertPrice = z.infer<typeof insertPriceSchema>;

// Extended types for API responses
export type PositionWithPrice = Position & {
  lastPrice?: number;
  pnlAmount?: number;
  pnlPercent?: number;
};

export type PortfolioSummary = {
  totalValue: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  topMover: {
    symbol: string;
    change: number;
    changePercent: number;
  } | null;
};

export type PriceData = {
  symbol: string;
  assetType: string;
  close: number;
  date: string;
  source: string;
};

export type AIInsightResponse = {
  summary: string;
  whyThisMatters: string[];
};
