import { storage } from "./storage";
import { policyService } from "./policy";
import type { Alert } from "@shared/schema";

// Alert evaluator that checks for triggered alerts
export class AlertEvaluator {
  private lastPolicyData: {
    trumpZScore: number;
    fedspeakTone: string;
  } | null = null;

  async evaluateAlerts(): Promise<void> {
    const alerts = await storage.getEnabledAlerts();
    
    for (const alert of alerts) {
      try {
        if (alert.type === "policy_index") {
          await this.evaluatePolicyIndexAlert(alert);
        } else if (alert.type === "fedspeak_regime") {
          await this.evaluateFedspeakRegimeAlert(alert);
        }
      } catch (error) {
        console.error(`Error evaluating alert ${alert.id}:`, error);
      }
    }
  }

  private async evaluatePolicyIndexAlert(alert: Alert): Promise<void> {
    if (!alert.threshold || !alert.direction) return;

    // Fetch current Trump Index
    const trumpData = await policyService.getTrumpIndex();
    const currentZScore = trumpData.zScore;

    // Check debounce: if triggered within last 60 minutes, skip
    if (alert.lastTriggered) {
      const lastTriggeredTime = new Date(alert.lastTriggered).getTime();
      const now = Date.now();
      const hourInMs = 60 * 60 * 1000;
      if (now - lastTriggeredTime < hourInMs) {
        return;
      }
    }

    let shouldTrigger = false;
    let message = "";

    if (alert.direction === "above" && currentZScore >= alert.threshold) {
      shouldTrigger = true;
      message = `Trump Index moved above ${alert.threshold.toFixed(2)}σ (current: ${currentZScore.toFixed(2)}σ)`;
    } else if (alert.direction === "below" && currentZScore <= alert.threshold) {
      shouldTrigger = true;
      message = `Trump Index moved below ${alert.threshold.toFixed(2)}σ (current: ${currentZScore.toFixed(2)}σ)`;
    } else if (alert.direction === "crosses") {
      // Check if we have previous data to compare
      if (this.lastPolicyData && this.lastPolicyData.trumpZScore !== currentZScore) {
        const prevZScore = this.lastPolicyData.trumpZScore;
        const crossed =
          (prevZScore < alert.threshold && currentZScore >= alert.threshold) ||
          (prevZScore > alert.threshold && currentZScore <= alert.threshold);
        
        if (crossed) {
          shouldTrigger = true;
          const direction = currentZScore > alert.threshold ? "above" : "below";
          message = `Trump Index crossed ${alert.threshold.toFixed(2)}σ threshold (now ${direction} at ${currentZScore.toFixed(2)}σ)`;
        }
      }
    }

    if (shouldTrigger) {
      console.log(`🚨 ALERT TRIGGERED: ${message}`);
      await storage.updateAlert(alert.id, {
        lastTriggered: new Date().toISOString(),
        meta: { ...alert.meta, lastZScore: currentZScore },
      });
    }

    // Update last policy data for next evaluation
    this.lastPolicyData = { ...this.lastPolicyData, trumpZScore: currentZScore };
  }

  private async evaluateFedspeakRegimeAlert(alert: Alert): Promise<void> {
    // Fetch current Fedspeak data
    const fedspeakData = await policyService.getFedspeak();
    const currentTone = fedspeakData.currentTone;

    // Get previous regime from meta
    const previousRegime = alert.meta?.previousRegime as string | undefined;

    // Check if regime has changed
    if (previousRegime && previousRegime !== currentTone) {
      // Check debounce
      if (alert.lastTriggered) {
        const lastTriggeredTime = new Date(alert.lastTriggered).getTime();
        const now = Date.now();
        const hourInMs = 60 * 60 * 1000;
        if (now - lastTriggeredTime < hourInMs) {
          return;
        }
      }

      const message = `Fedspeak tone shifted from ${previousRegime} to ${currentTone}`;
      console.log(`🚨 ALERT TRIGGERED: ${message}`);
      
      await storage.updateAlert(alert.id, {
        lastTriggered: new Date().toISOString(),
        meta: { ...alert.meta, previousRegime: currentTone },
      });
    } else if (!previousRegime) {
      // Initialize previousRegime if this is the first evaluation
      await storage.updateAlert(alert.id, {
        meta: { ...alert.meta, previousRegime: currentTone },
      });
    }

    // Update last policy data
    this.lastPolicyData = { ...this.lastPolicyData, fedspeakTone: currentTone };
  }

  async startEvaluationLoop(intervalMinutes: number = 5): Promise<void> {
    console.log(`Starting alert evaluator (checking every ${intervalMinutes} minutes)`);
    
    // Initial evaluation
    await this.evaluateAlerts();

    // Schedule periodic evaluations
    setInterval(async () => {
      await this.evaluateAlerts();
    }, intervalMinutes * 60 * 1000);
  }
}

export const alertEvaluator = new AlertEvaluator();
