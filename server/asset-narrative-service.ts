import type { AssetNarrativeResponse, AssetNarrativeCitation } from "@shared/schema";
import OpenAI from "openai";

export type NarrativeInputHeadline = { title: string; summary?: string; source?: string };

export class AssetNarrativeService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Generate per-asset "why it moved" narrative from headlines and optional price context.
   */
  async generateNarrative(
    symbol: string,
    headlines: NarrativeInputHeadline[],
    priceContext?: { changePct: number; period: string }
  ): Promise<AssetNarrativeResponse> {
    const as_of = new Date().toISOString();

    if (!this.openai || process.env.DATA_MODE === "mock") {
      return this.getMockNarrative(symbol, priceContext, as_of);
    }

    try {
      const priceLine =
        priceContext != null
          ? `Price context: ${symbol} is ${priceContext.changePct >= 0 ? "up" : "down"} ${Math.abs(priceContext.changePct).toFixed(1)}% over ${priceContext.period}.`
          : `No specific price move provided for ${symbol}.`;

      const headlinesBlock =
        headlines.length > 0
          ? headlines
              .slice(0, 10)
              .map((h, i) => `[${i + 1}] ${h.title}${h.source ? ` (${h.source})` : ""}`)
              .join("\n")
          : "No recent headlines available for this symbol.";

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a financial analyst explaining WHY a stock or asset moved — not just what happened, but the narrative drivers. Be concise and evidence-based. Use the provided headlines as evidence; cite them by number [1], [2], etc. in your summary. Return JSON only: { "summary": string (1-3 sentences: why it moved), "drivers": string[] (2-4 short driver bullets), "citations": [{ "source": string, "label": string, "value": string }] (headline titles you used as evidence, up to 5) }.`,
          },
          {
            role: "user",
            content: `${priceLine}\n\nRecent headlines for ${symbol}:\n${headlinesBlock}\n\nGenerate a brief "why it moved" narrative and drivers with evidence citations.`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) return this.getMockNarrative(symbol, priceContext, as_of);

      const parsed = JSON.parse(raw) as {
        summary?: string;
        drivers?: string[];
        citations?: { source: string; label: string; value?: string }[];
      };

      const summary =
        typeof parsed.summary === "string"
          ? parsed.summary
          : "No narrative available for this period.";
      const drivers = Array.isArray(parsed.drivers)
        ? parsed.drivers.slice(0, 4).filter((d) => typeof d === "string")
        : [];
      const citations: AssetNarrativeCitation[] = Array.isArray(parsed.citations)
        ? parsed.citations
            .slice(0, 5)
            .filter(
              (c): c is AssetNarrativeCitation =>
                c != null && typeof c.source === "string" && typeof c.label === "string"
            )
        : [];

      return {
        summary,
        drivers,
        citations: citations.length > 0 ? citations : undefined,
        priceContext,
        as_of,
      };
    } catch (error) {
      console.error("Asset narrative generation error:", error);
      return this.getMockNarrative(symbol, priceContext, as_of);
    }
  }

  private getMockNarrative(
    symbol: string,
    priceContext?: { changePct: number; period: string },
    as_of?: string
  ): AssetNarrativeResponse {
    const period = priceContext?.period ?? "the past week";
    const dir = (priceContext?.changePct ?? 0) >= 0 ? "up" : "down";
    const pct = Math.abs(priceContext?.changePct ?? 0).toFixed(1);
    return {
      summary: `${symbol} is ${dir} ${pct}% over ${period}. Narrative is generated from recent headlines and optional price context; enable OpenAI for a full "why it moved" explanation.`,
      drivers: [
        "Recent headlines and market sentiment",
        "Sector and macro context",
        "Earnings or catalysts when available",
      ],
      citations: [],
      priceContext,
      as_of: as_of ?? new Date().toISOString(),
    };
  }
}

export const assetNarrativeService = new AssetNarrativeService();
