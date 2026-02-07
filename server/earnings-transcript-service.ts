import type { EarningsTranscriptSummary } from "@shared/schema";
import OpenAI from "openai";

const RISK_PATTERNS = [
  "uncertain",
  "uncertainty",
  "challenging",
  "challenges",
  "headwinds",
  "headwind",
  "volatility",
  "macro headwinds",
  "cautious",
  "pressure",
  "pressures",
  "softness",
  "weakness",
  "slower",
  "decline",
  "declining",
  "risk",
  "risks",
  "concern",
  "concerns",
  "difficult",
  "uncertain environment",
];

export class EarningsTranscriptService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Analyze transcript: summary, exec tone (1–10), risk language detection.
   */
  async analyzeTranscript(
    transcriptText: string,
    symbol?: string,
    date?: string
  ): Promise<EarningsTranscriptSummary> {
    const as_of = new Date().toISOString();

    if (!this.openai || process.env.DATA_MODE === "mock") {
      return this.getMockSummary(symbol ?? "UNKNOWN", date, as_of);
    }

    try {
      const truncated = transcriptText.slice(0, 12000);
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an analyst summarizing earnings call transcripts. Return JSON only:
{ "summary": string (2-4 sentences: key takeaways), "toneScore": number (1-10, 1=very cautious, 10=very confident), "riskPhrases": string[] (exact phrases from the transcript that signal risk/uncertainty, e.g. "macro headwinds", "challenging environment", up to 10) }.`,
          },
          {
            role: "user",
            content: `Analyze this earnings call transcript${symbol ? ` for ${symbol}` : ""}:\n\n${truncated}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      });

      const raw = response.choices[0]?.message?.content;
      if (!raw) return this.getMockSummary(symbol ?? "UNKNOWN", date, as_of);

      const parsed = JSON.parse(raw) as {
        summary?: string;
        toneScore?: number;
        riskPhrases?: string[];
      };

      const toneScore = Math.min(10, Math.max(1, Number(parsed.toneScore) || 5));
      const toneLabel =
        toneScore <= 3 ? "cautious" : toneScore >= 7 ? "confident" : "neutral";
      const riskPhrases = Array.isArray(parsed.riskPhrases)
        ? parsed.riskPhrases.slice(0, 10).filter((p) => typeof p === "string")
        : this.detectRiskPhrases(transcriptText);
      const riskLevel = this.riskLevelFromPhrases(riskPhrases);

      return {
        symbol: symbol ?? "UNKNOWN",
        date,
        summary: typeof parsed.summary === "string" ? parsed.summary : "Summary unavailable.",
        toneScore,
        toneLabel,
        riskPhrases,
        riskLevel,
        previousToneScore: undefined,
        as_of,
      };
    } catch (error) {
      console.error("Earnings transcript analysis error:", error);
      return this.getMockSummary(symbol ?? "UNKNOWN", date, as_of);
    }
  }

  private detectRiskPhrases(text: string): string[] {
    const lower = text.toLowerCase();
    const found: string[] = [];
    for (const phrase of RISK_PATTERNS) {
      if (lower.includes(phrase) && !found.includes(phrase)) found.push(phrase);
    }
    return found.slice(0, 10);
  }

  private riskLevelFromPhrases(phrases: string[]): "low" | "medium" | "high" {
    const n = phrases.length;
    if (n >= 6) return "high";
    if (n >= 2) return "medium";
    return "low";
  }

  getMockSummary(symbol: string, date?: string, as_of?: string): EarningsTranscriptSummary {
    return {
      symbol,
      date,
      summary: `Earnings call summary for ${symbol}. Enable OpenAI and paste a transcript to get an AI-generated summary, exec tone score (1–10), and risk language detection ("uncertain", "challenging", etc.).`,
      toneScore: 5,
      toneLabel: "neutral",
      riskPhrases: ["challenging environment", "macro headwinds"],
      riskLevel: "medium",
      previousToneScore: 4,
      as_of: as_of ?? new Date().toISOString(),
    };
  }
}

export const earningsTranscriptService = new EarningsTranscriptService();
