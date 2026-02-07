import type { OnChainSignal, OnChainSignalsResponse } from "@shared/schema";
import OpenAI from "openai";

/**
 * Crypto on-chain decision signals — actionable interpretation, not raw metrics.
 * Design: "What should a trader DO with this?"
 * Mock/sample until real chain data (e.g. Glassnode, custom indexer) is connected.
 */

function buildMockSignals(): OnChainSignal[] {
  const as_of = new Date().toISOString();
  return [
    {
      signalType: "exchange_inflow_spike",
      label: "Exchange inflow spike",
      implication: "Large BTC moved to exchanges in the last 24h; historically associated with sell pressure.",
      suggestedAction: "Watch for resistance and consider tightening stops if long.",
      severity: "warning",
      as_of,
    },
    {
      signalType: "dormant_wallet_activation",
      label: "Dormant wallet activation",
      implication: "Long-dormant wallets (2+ years) have moved; can precede distribution or renewed interest.",
      suggestedAction: "Monitor volume and price reaction before adding size.",
      severity: "info",
      as_of,
    },
    {
      signalType: "stablecoin_supply_delta",
      label: "Stablecoin supply rising",
      implication: "USDT/USDC supply increasing; often a risk-on signal (dry powder for crypto).",
      suggestedAction: "Favor risk-on bias unless macro contradicts.",
      severity: "info",
      as_of,
    },
  ];
}

export class OnChainSignalsService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async getSignals(): Promise<OnChainSignalsResponse> {
    const as_of = new Date().toISOString();
    const signals = buildMockSignals();
    const summary = await this.generateSummary(signals);
    return { signals, summary, as_of };
  }

  private async generateSummary(signals: OnChainSignal[]): Promise<string | undefined> {
    if (!this.openai || process.env.DATA_MODE === "mock") {
      return "On-chain signals are decision-oriented; connect a data provider for live signals.";
    }
    try {
      const bullets = signals
        .map((s) => `${s.label}: ${s.suggestedAction}`)
        .join("\n");
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "In one short sentence (under 20 words), summarize what a crypto trader should take away from these on-chain signals. No advice, no predictions—just the takeaway.",
          },
          {
            role: "user",
            content: bullets,
          },
        ],
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content?.trim();
    } catch (e) {
      console.warn("On-chain summary error:", e);
      return undefined;
    }
  }
}

export const onChainSignalsService = new OnChainSignalsService();
