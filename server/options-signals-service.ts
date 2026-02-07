import type { OptionsSignalLite, OptionsSignalsResponse } from "@shared/schema";
import OpenAI from "openai";

/**
 * Options signal lite: large OI changes, IV spikes, put/call regime shifts, "unusual for ticker" flag.
 * Mock/sample data until real options feed; pairs with AI explanation for differentiation.
 */

function mockSignalsForSymbol(symbol: string): OptionsSignalLite[] {
  const as_of = new Date().toISOString();
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [
    {
      symbol,
      signalType: "iv_spike",
      label: "IV vs 30d avg",
      value: 12 + (seed % 15),
      unit: "%",
      percentileOrFlag: "elevated",
      as_of,
    },
    {
      symbol,
      signalType: "put_call_shift",
      label: "Put/Call ratio",
      value: 0.9 + (seed % 40) / 100,
      percentileOrFlag: "shifted vs 5d",
      as_of,
    },
    {
      symbol,
      signalType: "oi_change",
      label: "Open interest change",
      value: 8 + (seed % 12),
      unit: "%",
      percentileOrFlag: "large for ticker",
      as_of,
    },
    ...(seed % 3 === 0
      ? [
          {
            symbol,
            signalType: "unusual" as const,
            label: "Unusual for this ticker",
            value: 1,
            percentileOrFlag: "unusual",
            as_of,
          },
        ]
      : []),
  ];
}

export class OptionsSignalsService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async getSignals(symbol: string): Promise<OptionsSignalsResponse> {
    const as_of = new Date().toISOString();
    const signals = mockSignalsForSymbol(symbol);
    const explanation = await this.generateExplanation(symbol, signals);
    return { symbol, signals, explanation, as_of };
  }

  private async generateExplanation(
    symbol: string,
    signals: OptionsSignalLite[]
  ): Promise<string | undefined> {
    if (!this.openai || process.env.DATA_MODE === "mock") {
      return `Options signals for ${symbol}: IV elevated, put/call shift, and ${signals.some((s) => s.signalType === "unusual") ? "unusual" : "elevated"} OI. Enable OpenAI for an AI interpretation.`;
    }
    try {
      const summary = signals
        .map((s) => `${s.signalType}: ${s.label} ${s.value}${s.unit ?? ""} ${s.percentileOrFlag ?? ""}`)
        .join("; ");
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a concise options analyst. In one short sentence (under 25 words), interpret what these options signals might mean for the stock. No advice, no predictions—just interpretation.",
          },
          {
            role: "user",
            content: `${symbol} options: ${summary}. One-sentence interpretation?`,
          },
        ],
        temperature: 0.4,
      });
      return response.choices[0]?.message?.content?.trim();
    } catch (e) {
      console.warn("Options explanation error:", e);
      return undefined;
    }
  }
}

export const optionsSignalsService = new OptionsSignalsService();
