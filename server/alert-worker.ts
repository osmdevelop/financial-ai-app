import cron from 'node-cron';
import { storage } from './storage';
import { spawn } from 'child_process';
import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || "" 
});

interface AlertCheckContext {
  portfolioId: string;
  priceData: Map<string, { price: number; change24h?: number }>;
  sentimentScore?: number;
  upcomingEarnings: string[];
}

export class AlertWorker {
  private isRunning = false;

  start() {
    console.log('🚨 Alert worker starting...');
    
    // Run every 5 minutes in development (every 1 minute in production could be more frequent)
    cron.schedule('*/5 * * * *', async () => {
      if (this.isRunning) {
        console.log('⏰ Alert check already running, skipping...');
        return;
      }
      
      this.isRunning = true;
      try {
        await this.checkAlerts();
      } catch (error) {
        console.error('❌ Alert check failed:', error);
      } finally {
        this.isRunning = false;
      }
    });

    console.log('✅ Alert worker scheduled (every 5 minutes)');
  }

  private async checkAlerts() {
    console.log('🔍 Checking alerts...');
    
    try {
      const activeAlerts = await storage.getActiveAlerts();
      if (activeAlerts.length === 0) {
        console.log('📭 No active alerts to check');
        return;
      }

      console.log(`📋 Checking ${activeAlerts.length} active alerts`);

      // Group alerts by portfolio for context building
      const alertsByPortfolio = new Map<string, typeof activeAlerts>();
      for (const alert of activeAlerts) {
        if (!alertsByPortfolio.has(alert.portfolioId)) {
          alertsByPortfolio.set(alert.portfolioId, []);
        }
        alertsByPortfolio.get(alert.portfolioId)!.push(alert);
      }

      // Process each portfolio's alerts
      for (const [portfolioId, portfolioAlerts] of Array.from(alertsByPortfolio.entries())) {
        const context = await this.buildAlertContext(portfolioId, portfolioAlerts);
        
        for (const alert of portfolioAlerts) {
          await this.processAlert(alert, context);
        }
      }

    } catch (error) {
      console.error('💥 Error in checkAlerts:', error);
    }
  }

  private async buildAlertContext(portfolioId: string, alerts: any[]): Promise<AlertCheckContext> {
    const context: AlertCheckContext = {
      portfolioId,
      priceData: new Map(),
      upcomingEarnings: []
    };

    // Get unique symbols from alerts
    const symbols = Array.from(new Set(alerts.filter(a => a.symbol).map(a => a.symbol)));
    
    // Fetch price data for symbols
    if (symbols.length > 0) {
      try {
        await this.fetchPriceData(symbols, context);
      } catch (error) {
        console.error('⚠️ Failed to fetch price data:', error);
      }
    }

    // Get sentiment score if needed
    const hasSentimentAlerts = alerts.some(a => a.type === 'sentiment');
    if (hasSentimentAlerts) {
      try {
        const sentiment = await storage.getEnhancedSentimentIndex();
        context.sentimentScore = sentiment.score;
      } catch (error) {
        console.error('⚠️ Failed to fetch sentiment:', error);
      }
    }

    // Get upcoming earnings if needed
    const hasEarningsAlerts = alerts.some(a => a.type === 'earnings');
    if (hasEarningsAlerts) {
      try {
        const earnings = await storage.getUpcomingEarnings(50);
        context.upcomingEarnings = earnings
          .filter(e => {
            const daysUntil = (new Date(e.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
            return daysUntil >= 0 && daysUntil <= 7; // Next 7 days
          })
          .map(e => e.symbol);
      } catch (error) {
        console.error('⚠️ Failed to fetch earnings:', error);
      }
    }

    return context;
  }

  private async fetchPriceData(symbols: string[], context: AlertCheckContext) {
    const cryptoSymbols = symbols.filter(s => s.includes('-USD') || ['BTC', 'ETH', 'ADA', 'SOL'].includes(s));
    const equitySymbols = symbols.filter(s => !cryptoSymbols.includes(s));

    // For demo purposes, we'll use mock data since Alpha Vantage is rate limited
    // In production, you'd fetch real data from CoinGecko and Alpha Vantage
    
    // Mock price data with consistent values based on symbol
    for (const symbol of symbols) {
      const hash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const basePrice = (hash % 1000) + 50; // Price between $50-$1050
      const change = ((hash % 200) - 100) / 10; // Change between -10% to +10%
      
      context.priceData.set(symbol, {
        price: parseFloat(basePrice.toFixed(2)),
        change24h: parseFloat(change.toFixed(2))
      });
    }
  }

  private async processAlert(alert: any, context: AlertCheckContext) {
    try {
      const now = new Date();
      const windowMinutes = alert.windowMin || 60;
      
      // Check if alert is within debounce window
      if (alert.lastTriggered) {
        const timeSinceLastTrigger = now.getTime() - new Date(alert.lastTriggered).getTime();
        const windowMs = windowMinutes * 60 * 1000;
        
        if (timeSinceLastTrigger < windowMs) {
          return; // Still in debounce window
        }
      }

      let triggered = false;
      let notificationTitle = '';
      let notificationBody = '';

      switch (alert.type) {
        case 'price':
          triggered = await this.checkPriceAlert(alert, context);
          if (triggered) {
            const priceData = context.priceData.get(alert.symbol);
            notificationTitle = `💰 Price Alert: ${alert.symbol}`;
            notificationBody = `${alert.symbol} is now ${alert.direction} $${alert.threshold} (Current: $${priceData?.price || 'N/A'})`;
          }
          break;

        case 'pct':
          triggered = await this.checkPercentAlert(alert, context);
          if (triggered) {
            const priceData = context.priceData.get(alert.symbol);
            notificationTitle = `📈 Percent Alert: ${alert.symbol}`;
            notificationBody = `${alert.symbol} moved ${alert.direction} ${alert.threshold}% (Current: ${priceData?.change24h || 'N/A'}%)`;
          }
          break;

        case 'sentiment':
          triggered = await this.checkSentimentAlert(alert, context);
          if (triggered) {
            notificationTitle = `🌡️ Sentiment Alert`;
            notificationBody = `Market sentiment is ${alert.direction} ${alert.threshold} (Current: ${context.sentimentScore || 'N/A'})`;
          }
          break;

        case 'earnings':
          triggered = await this.checkEarningsAlert(alert, context);
          if (triggered) {
            notificationTitle = `📊 Earnings Alert: ${alert.symbol}`;
            notificationBody = `${alert.symbol} has earnings coming up within 7 days`;
          }
          break;
      }

      if (triggered) {
        console.log(`🔔 Alert triggered: ${alert.id} - ${notificationTitle}`);
        
        // Update last triggered time
        await storage.updateAlertLastTriggered(alert.id);
        
        // Add notification
        await storage.addNotification({
          title: notificationTitle,
          body: notificationBody,
          timestamp: now.toISOString(),
          alertId: alert.id
        });
      }

    } catch (error) {
      console.error(`💥 Error processing alert ${alert.id}:`, error);
    }
  }

  private async checkPriceAlert(alert: any, context: AlertCheckContext): Promise<boolean> {
    const priceData = context.priceData.get(alert.symbol);
    if (!priceData || !alert.threshold) return false;

    const threshold = parseFloat(alert.threshold);
    const currentPrice = priceData.price;

    if (alert.direction === 'above') {
      return currentPrice >= threshold;
    } else if (alert.direction === 'below') {
      return currentPrice <= threshold;
    }

    return false;
  }

  private async checkPercentAlert(alert: any, context: AlertCheckContext): Promise<boolean> {
    const priceData = context.priceData.get(alert.symbol);
    if (!priceData || !alert.threshold || priceData.change24h === undefined) return false;

    const threshold = parseFloat(alert.threshold);
    const currentChange = Math.abs(priceData.change24h);

    if (alert.direction === 'above') {
      return currentChange >= threshold;
    } else if (alert.direction === 'below') {
      return currentChange <= threshold;
    }

    return false;
  }

  private async checkSentimentAlert(alert: any, context: AlertCheckContext): Promise<boolean> {
    if (!context.sentimentScore || !alert.threshold) return false;

    const threshold = parseFloat(alert.threshold);

    if (alert.direction === 'above') {
      return context.sentimentScore >= threshold;
    } else if (alert.direction === 'below') {
      return context.sentimentScore <= threshold;
    }

    return false;
  }

  private async checkEarningsAlert(alert: any, context: AlertCheckContext): Promise<boolean> {
    if (!alert.symbol) return false;
    return context.upcomingEarnings.includes(alert.symbol);
  }
}

// Export singleton instance
export const alertWorker = new AlertWorker();