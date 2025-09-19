import { AssetBriefResponse, AssetOverviewResponse, FreshnessMetadata } from "@shared/schema.js";
import OpenAI from "openai";

export class AssetBriefService {
  private openai?: OpenAI;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    } else {
      console.warn("OPENAI_API_KEY not set - Asset brief will use fallback responses");
    }
  }

  /**
   * Generate AI-powered bull/bear case analysis for an asset
   */
  async generateAIBrief(overviewPayload: AssetOverviewResponse): Promise<AssetBriefResponse> {
    try {
      if (!this.openai || process.env.DATA_MODE === "mock") {
        return this.generateMockBrief(overviewPayload);
      }

      const analysisPrompt = this.buildAnalysisPrompt(overviewPayload);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-5", // Latest OpenAI model
        messages: [
          {
            role: "system",
            content: this.getSystemPrompt()
          },
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      });

      const aiResponse = JSON.parse(response.choices[0].message.content || "{}");
      
      return {
        bullCase: this.validateAndSanitizeBullets(aiResponse.bullCase || []),
        bearCase: this.validateAndSanitizeBullets(aiResponse.bearCase || []),
        risks: this.validateAndSanitizeBullets(aiResponse.risks || []),
        confidence: Math.min(100, Math.max(0, aiResponse.confidence || 70)),
        freshness: this.createFreshnessMetadata()
      };
    } catch (error) {
      console.error("AI brief generation error:", error);
      return this.generateMockBrief(overviewPayload);
    }
  }

  /**
   * System prompt for the AI analysis
   */
  private getSystemPrompt(): string {
    return `You are a professional financial analyst providing objective investment analysis. 

Your task is to analyze the provided asset data and generate:
1. Bull Case: 3 concise points supporting why the asset might perform well
2. Bear Case: 3 concise points explaining potential risks or downsides  
3. Risks: 3 key risk factors investors should consider
4. Confidence: A score 0-100 representing your confidence in the analysis

Guidelines:
- Keep each bullet point to 1-2 sentences maximum
- Be objective and balanced - avoid extreme language
- Focus on data-driven insights from the provided metrics
- Consider technical indicators, market position, and fundamental factors
- Include appropriate disclaimers about investment risks
- Return response in JSON format: {"bullCase": [...], "bearCase": [...], "risks": [...], "confidence": number}

Remember: This is for informational purposes only and not investment advice.`;
  }

  /**
   * Build the analysis prompt with asset data
   */
  private buildAnalysisPrompt(overview: AssetOverviewResponse): string {
    const { symbol, assetType, currentPrice, changePct, indicators, stats, supportResistance, catalysts } = overview;
    
    // Build technical analysis summary
    const technicalSummary = this.buildTechnicalSummary(indicators, currentPrice);
    
    // Build risk metrics summary
    const riskSummary = this.buildRiskSummary(stats);
    
    // Build support/resistance summary
    const levelsSummary = this.buildLevelsSummary(supportResistance, currentPrice);
    
    // Build catalysts summary
    const catalystsSummary = catalysts.length > 0 
      ? `Recent Catalysts: ${catalysts.map(c => `${c.title} (${c.impact} impact)`).join('; ')}`
      : "No significant recent catalysts identified.";

    return `
Analyze ${symbol} (${assetType}):

CURRENT STATE:
- Price: $${currentPrice} (${changePct > 0 ? '+' : ''}${changePct}%)
- Asset Type: ${assetType.toUpperCase()}

TECHNICAL ANALYSIS:
${technicalSummary}

RISK METRICS:
${riskSummary}

SUPPORT/RESISTANCE:
${levelsSummary}

MARKET CATALYSTS:
${catalystsSummary}

Please provide a balanced analysis considering all these factors. Focus on what the data tells us about potential opportunities and risks.
`.trim();
  }

  /**
   * Build technical indicators summary
   */
  private buildTechnicalSummary(indicators: any, currentPrice: number): string {
    const lines = [];
    
    if (indicators.ma10 && indicators.ma30 && indicators.ma50) {
      const maPosition = currentPrice > indicators.ma10 ? "above" : "below";
      lines.push(`- Price is ${maPosition} short-term moving averages`);
      
      if (indicators.ma10 > indicators.ma50) {
        lines.push(`- Moving averages show bullish alignment (10MA > 50MA)`);
      } else {
        lines.push(`- Moving averages show bearish alignment (10MA < 50MA)`);
      }
    }
    
    if (indicators.rsi14) {
      if (indicators.rsi14 > 70) {
        lines.push(`- RSI at ${indicators.rsi14} suggests potentially overbought conditions`);
      } else if (indicators.rsi14 < 30) {
        lines.push(`- RSI at ${indicators.rsi14} suggests potentially oversold conditions`);
      } else {
        lines.push(`- RSI at ${indicators.rsi14} indicates neutral momentum`);
      }
    }
    
    if (indicators.atr14) {
      const atrPercent = (indicators.atr14 / currentPrice * 100).toFixed(1);
      lines.push(`- Average True Range: ${atrPercent}% indicating ${parseFloat(atrPercent) > 3 ? 'high' : 'moderate'} volatility`);
    }
    
    return lines.length > 0 ? lines.join('\n') : "Limited technical data available.";
  }

  /**
   * Build risk metrics summary
   */
  private buildRiskSummary(stats: any): string {
    const lines = [];
    
    if (stats.var95) {
      lines.push(`- Value at Risk (95%): ${stats.var95}% potential daily loss`);
    }
    
    if (stats.odds1d) {
      lines.push(`- 1-day directional odds: ${stats.odds1d.up}% up, ${stats.odds1d.down}% down`);
    }
    
    if (stats.upside3pct) {
      lines.push(`- Probability of +3% gain: ${stats.upside3pct.in30days}% in 30 days`);
    }
    
    return lines.length > 0 ? lines.join('\n') : "Limited risk metrics available.";
  }

  /**
   * Build support/resistance summary
   */
  private buildLevelsSummary(levels: any, currentPrice: number): string {
    const lines = [];
    
    if (levels.support && levels.support.length > 0) {
      const nearestSupport = levels.support[0];
      const distance = ((currentPrice - nearestSupport.level) / currentPrice * 100).toFixed(1);
      lines.push(`- Nearest support: $${nearestSupport.level} (${distance}% below current)`);
    }
    
    if (levels.resistance && levels.resistance.length > 0) {
      const nearestResistance = levels.resistance[0];
      const distance = ((nearestResistance.level - currentPrice) / currentPrice * 100).toFixed(1);
      lines.push(`- Nearest resistance: $${nearestResistance.level} (${distance}% above current)`);
    }
    
    return lines.length > 0 ? lines.join('\n') : "No significant support/resistance levels identified.";
  }

  /**
   * Validate and sanitize bullet points
   */
  private validateAndSanitizeBullets(bullets: any[]): string[] {
    if (!Array.isArray(bullets)) return [];
    
    return bullets
      .filter(bullet => typeof bullet === 'string' && bullet.trim().length > 0)
      .slice(0, 3) // Ensure exactly 3 bullets
      .map(bullet => bullet.trim())
      .map(bullet => bullet.length > 200 ? bullet.substring(0, 197) + '...' : bullet);
  }

  /**
   * Generate mock brief for fallback
   */
  private generateMockBrief(overview: AssetOverviewResponse): AssetBriefResponse {
    const { symbol, assetType, changePct, indicators } = overview;
    
    // Generate contextual mock data based on actual metrics
    const isPositive = changePct > 0;
    const rsiLevel = indicators.rsi14 || 50;
    const isOverbought = rsiLevel > 70;
    const isOversold = rsiLevel < 30;
    
    const bullCase = [
      isPositive 
        ? `${symbol} shows recent positive momentum with ${changePct.toFixed(1)}% gains`
        : `Current pullback may present attractive entry opportunity for ${symbol}`,
      
      !isOverbought 
        ? `Technical indicators suggest room for upward movement` 
        : `Strong recent performance demonstrates market confidence`,
        
      assetType === "etf" 
        ? `ETF structure provides diversified exposure with professional management`
        : `Individual stock positioning allows for targeted investment exposure`
    ];
    
    const bearCase = [
      isOverbought 
        ? `RSI levels suggest potential for near-term consolidation or pullback`
        : `Market volatility could impact ${symbol} performance in current environment`,
        
      `Broader market conditions may create headwinds for asset performance`,
      
      assetType === "crypto" 
        ? `Cryptocurrency assets face regulatory uncertainty and high volatility`
        : `Economic factors could pressure valuations across financial markets`
    ];
    
    const risks = [
      `Market volatility could lead to significant price swings affecting ${symbol}`,
      `Economic or sector-specific events may impact underlying asset value`,
      `Past performance does not guarantee future results - all investments carry risk`
    ];
    
    return {
      bullCase,
      bearCase,
      risks,
      confidence: 65, // Moderate confidence for mock analysis
      freshness: this.createMockFreshnessMetadata()
    };
  }

  /**
   * Create freshness metadata for AI-generated content
   */
  private createFreshnessMetadata(): FreshnessMetadata {
    return {
      lastUpdated: new Date().toISOString(),
      dataSource: "live",
      sourceName: "OpenAI GPT-5",
      freshness: "realtime",
      disclaimer: "AI-generated analysis for informational purposes only. Not investment advice."
    };
  }

  /**
   * Create mock freshness metadata
   */
  private createMockFreshnessMetadata(): FreshnessMetadata {
    return {
      lastUpdated: new Date().toISOString(),
      dataSource: "mock",
      sourceName: "Mock Analysis Engine",
      freshness: "recent",
      disclaimer: "Mock analysis for demonstration purposes only. Not investment advice."
    };
  }
}