import { api } from "@/lib/api";
import {
  getLastState,
  saveLastState,
  canTriggerAlert,
  recordTrigger,
  AlertLastState,
} from "@/hooks/useAlerts";
import { addNotificationDirect, NotificationSeverity } from "@/hooks/useNotifications";

const POLL_INTERVAL_MS = 5 * 60 * 1000;

let evaluatorInterval: ReturnType<typeof setInterval> | null = null;

const inFlightAlerts = new Set<string>();

type AlertRule = {
  id: string;
  type: string;
  enabled: boolean;
  threshold?: number;
};

function getStoredAlerts(): AlertRule[] {
  try {
    const stored = localStorage.getItem("alerts_v1");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

async function fetchCurrentState(): Promise<{
  regime?: string;
  isPolicyShock?: boolean;
  trumpZScore?: number;
  fedspeakTone?: string;
  isMock?: boolean;
}> {
  const state: {
    regime?: string;
    isPolicyShock?: boolean;
    trumpZScore?: number;
    fedspeakTone?: string;
    isMock?: boolean;
  } = { isMock: false };

  try {
    const regimeSnapshot = await api.getMarketRegimeSnapshot();
    state.regime = regimeSnapshot?.regime;
    state.isPolicyShock = regimeSnapshot?.regime === "Policy Shock";
    state.isMock = regimeSnapshot?.meta?.isMock || false;
  } catch (e) {
    console.warn("Alert evaluator: regime fetch failed", e);
  }

  try {
    const trumpIndex = await api.getTrumpIndex();
    state.trumpZScore = trumpIndex?.zScore;
  } catch (e) {
    console.warn("Alert evaluator: trump index fetch failed", e);
  }

  try {
    const fedspeak = await api.getFedspeak();
    state.fedspeakTone = fedspeak?.currentTone;
  } catch (e) {
    console.warn("Alert evaluator: fedspeak fetch failed", e);
  }

  return state;
}

function tryCreateNotification(
  ruleId: string,
  title: string,
  message: string,
  severity: NotificationSeverity,
  link: string,
  isMock: boolean
): boolean {
  if (inFlightAlerts.has(ruleId)) {
    return false;
  }
  
  inFlightAlerts.add(ruleId);
  
  try {
    const finalMessage = isMock ? `${message} (Based on partial data)` : message;
    
    const result = addNotificationDirect({
      ruleId,
      title,
      message: finalMessage,
      severity,
      link,
    });
    
    if (result.success) {
      recordTrigger(ruleId);
      return true;
    }
    return false;
  } catch (e) {
    console.error("Failed to create notification for alert:", ruleId, e);
    return false;
  } finally {
    inFlightAlerts.delete(ruleId);
  }
}

async function evaluateAlerts(): Promise<void> {
  const alerts = getStoredAlerts();
  const enabledAlerts = alerts.filter((a) => a.enabled);
  
  if (enabledAlerts.length === 0) {
    const state = getLastState();
    state.lastChecked = new Date().toISOString();
    saveLastState(state);
    return;
  }

  const currentState = await fetchCurrentState();
  const lastState = getLastState();
  
  for (const alert of enabledAlerts) {
    if (!canTriggerAlert(alert.id)) continue;

    switch (alert.type) {
      case "regime_change":
        if (
          lastState.regime !== undefined &&
          currentState.regime !== undefined &&
          lastState.regime !== currentState.regime
        ) {
          tryCreateNotification(
            alert.id,
            "Market Regime Changed",
            `Market regime has shifted from ${lastState.regime} to ${currentState.regime}.`,
            "warning",
            "/daily-brief",
            currentState.isMock || false
          );
        }
        break;

      case "policy_shock":
        if (
          currentState.isPolicyShock &&
          !lastState.isPolicyShock
        ) {
          tryCreateNotification(
            alert.id,
            "Policy Shock Detected",
            "Market has entered a Policy Shock regime. Consider reviewing your positions.",
            "critical",
            "/policy",
            currentState.isMock || false
          );
        }
        break;

      case "trump_z_above":
        const threshold = (alert as any).threshold || 1.5;
        if (
          currentState.trumpZScore !== undefined &&
          lastState.trumpZScore !== undefined &&
          currentState.trumpZScore > threshold &&
          lastState.trumpZScore <= threshold
        ) {
          tryCreateNotification(
            alert.id,
            "Trump Index Alert",
            `Trump Policy Index has crossed above ${threshold}σ (current: ${currentState.trumpZScore.toFixed(2)}σ).`,
            "warning",
            "/policy",
            currentState.isMock || false
          );
        }
        break;

      case "fedspeak_change":
        if (
          lastState.fedspeakTone !== undefined &&
          currentState.fedspeakTone !== undefined &&
          lastState.fedspeakTone !== currentState.fedspeakTone
        ) {
          tryCreateNotification(
            alert.id,
            "Fed Tone Changed",
            `Federal Reserve tone has shifted from ${lastState.fedspeakTone} to ${currentState.fedspeakTone}.`,
            "info",
            "/policy",
            currentState.isMock || false
          );
        }
        break;
    }
  }

  const newLastState: AlertLastState = {
    regime: currentState.regime || lastState.regime,
    isPolicyShock: currentState.isPolicyShock ?? lastState.isPolicyShock,
    trumpZScore: currentState.trumpZScore ?? lastState.trumpZScore,
    fedspeakTone: currentState.fedspeakTone || lastState.fedspeakTone,
    lastChecked: new Date().toISOString(),
  };
  saveLastState(newLastState);
}

export function startAlertEvaluator(): void {
  if (evaluatorInterval) return;
  
  evaluateAlerts();
  
  evaluatorInterval = setInterval(() => {
    evaluateAlerts();
  }, POLL_INTERVAL_MS);
  
  console.log("Alert evaluator started - checking every 5 minutes");
}

export function stopAlertEvaluator(): void {
  if (evaluatorInterval) {
    clearInterval(evaluatorInterval);
    evaluatorInterval = null;
    console.log("Alert evaluator stopped");
  }
}

export function forceEvaluate(): void {
  evaluateAlerts();
}
