import type { CrossAssetRegimeResponse, AssetClassRegime } from "@shared/schema";
import { getRegimeSnapshot } from "./services/regimeService";
import OpenAI from "openai";

function toAssetClassRegime(s: string): AssetClassRegime {
  if (s === "Risk-On" || s === "Risk-Off") return s;
  return "Neutral";
}

/**
 * Cross-asset risk gauge: single view of regime across equities, crypto, bonds.
 * Derives per-asset-class view from existing regime inputs; AI insight when conflicted.
 */
export class CrossAssetRegimeService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async getCrossAssetRegime(): Promise<CrossAssetRegimeResponse> {
    const as_of = new Date().toISOString();

    try {
      const snapshot = await getRegimeSnapshot();
      const sentiment = snapshot.inputs?.sentiment;
      const fed = snapshot.inputs?.fed;
      const policy = snapshot.inputs?.policy;

      const sentimentState = (sentiment?.state as string) || "Neutral";
      const equities: CrossAssetRegimeResponse["equities"] = {
        regime: toAssetClassRegime(sentimentState),
        label: "Equities",
      };

      // Crypto often diverges on policy; tilt from sentiment by policy risk
      let cryptoRegime: AssetClassRegime = toAssetClassRegime(sentimentState);
      const trumpZ = policy?.trumpZ ?? 0;
      if (trumpZ > 0.75 && (cryptoRegime === "Risk-On" || cryptoRegime === "Neutral")) {
        cryptoRegime = "Risk-Off";
      } else if (trumpZ > 0.75 && cryptoRegime === "Risk-Off") {
        cryptoRegime = "Neutral";
      } else if (trumpZ < -0.25 && (cryptoRegime === "Risk-Off" || cryptoRegime === "Neutral")) {
        cryptoRegime = "Risk-On";
      }
      const crypto: CrossAssetRegimeResponse["crypto"] = {
        regime: cryptoRegime,
        label: "Crypto",
      };

      // Bonds: fed tone drives tightening/easing
      const fedTone = fed?.tone ?? "neutral";
      const tightening = fedTone === "hawkish";
      let bondsRegime: AssetClassRegime = tightening ? "Risk-Off" : fedTone === "dovish" ? "Risk-On" : "Neutral";
      const bonds: CrossAssetRegimeResponse["bonds"] = {
        regime: bondsRegime,
        tightening,
        label: tightening ? "Bonds tightening" : fedTone === "dovish" ? "Bonds easing" : "Bonds neutral",
      };

      const conflict =
        equities.regime !== crypto.regime ||
        (equities.regime !== bonds.regime && bonds.regime !== "Neutral") ||
        (crypto.regime !== bonds.regime && bonds.regime !== "Neutral");

      const aiInsight = conflict ? await this.generateInsight(equities, crypto, bonds) : undefined;

      return {
        equities,
        crypto,
        bonds,
        conflict,
        aiInsight,
        as_of,
      };
    } catch (e) {
      console.warn("Cross-asset regime fetch error:", e);
      return {
        equities: { regime: "Neutral", label: "Equities" },
        crypto: { regime: "Neutral", label: "Crypto" },
        bonds: { regime: "Neutral", tightening: false, label: "Bonds neutral" },
        conflict: false,
        as_of,
      };
    }
  }

  private async generateInsight(
    equities: CrossAssetRegimeResponse["equities"],
    crypto: CrossAssetRegimeResponse["crypto"],
    bonds: CrossAssetRegimeResponse["bonds"]
  ): Promise<string | undefined> {
    if (!this.openai || process.env.DATA_MODE === "mock") {
      return "Equities, crypto, and bonds are sending mixed signals — volatility regime likely.";
    }
    try {
      const summary = `Equities: ${equities.regime}. Crypto: ${crypto.regime}. Bonds: ${bonds.label}.`;
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a market strategist. In one short sentence (under 25 words), state what this cross-asset divergence implies (e.g. volatility, rotation, caution). No advice, no predictions—just the implication.",
          },
          {
            role: "user",
            content: summary,
          },
        ],
        temperature: 0.3,
      });
      return response.choices[0]?.message?.content?.trim();
    } catch (e) {
      console.warn("Cross-asset AI insight error:", e);
      return undefined;
    }
  }
}

export const crossAssetRegimeService = new CrossAssetRegimeService();
