import { useState, useEffect, useCallback } from "react";

export type AlertRuleType = "regime_change" | "policy_shock" | "trump_z_above" | "fedspeak_change";

export type AlertRule =
  | { id: string; type: "regime_change"; enabled: boolean; createdAt: string }
  | { id: string; type: "policy_shock"; enabled: boolean; createdAt: string }
  | { id: string; type: "trump_z_above"; threshold: number; enabled: boolean; createdAt: string }
  | { id: string; type: "fedspeak_change"; enabled: boolean; createdAt: string };

export type AlertLastState = {
  regime?: string;
  isPolicyShock?: boolean;
  trumpZScore?: number;
  fedspeakTone?: string;
  lastChecked?: string;
};

export type AlertTriggerHistory = {
  [ruleId: string]: string;
};

const ALERTS_KEY = "alerts_v1";
const LAST_STATE_KEY = "alerts_last_state_v1";
const TRIGGER_HISTORY_KEY = "alerts_trigger_history_v1";
const DEBOUNCE_HOURS = 6;

function getStoredAlerts(): AlertRule[] {
  try {
    const stored = localStorage.getItem(ALERTS_KEY);
    if (!stored) {
      return getDefaultAlerts();
    }
    return JSON.parse(stored);
  } catch {
    return getDefaultAlerts();
  }
}

function getDefaultAlerts(): AlertRule[] {
  return [
    { id: "regime_change", type: "regime_change", enabled: false, createdAt: new Date().toISOString() },
    { id: "policy_shock", type: "policy_shock", enabled: false, createdAt: new Date().toISOString() },
    { id: "trump_z_above", type: "trump_z_above", threshold: 1.5, enabled: false, createdAt: new Date().toISOString() },
    { id: "fedspeak_change", type: "fedspeak_change", enabled: false, createdAt: new Date().toISOString() },
  ];
}

function saveAlerts(alerts: AlertRule[]): void {
  try {
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
  } catch (e) {
    console.error("Failed to save alerts:", e);
  }
}

export function getLastState(): AlertLastState {
  try {
    const stored = localStorage.getItem(LAST_STATE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveLastState(state: AlertLastState): void {
  try {
    localStorage.setItem(LAST_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save alert state:", e);
  }
}

export function getTriggerHistory(): AlertTriggerHistory {
  try {
    const stored = localStorage.getItem(TRIGGER_HISTORY_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function saveTriggerHistory(history: AlertTriggerHistory): void {
  try {
    localStorage.setItem(TRIGGER_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error("Failed to save trigger history:", e);
  }
}

export function canTriggerAlert(ruleId: string): boolean {
  const history = getTriggerHistory();
  const lastTriggered = history[ruleId];
  if (!lastTriggered) return true;
  
  const hoursSinceTrigger = (Date.now() - new Date(lastTriggered).getTime()) / (1000 * 60 * 60);
  return hoursSinceTrigger >= DEBOUNCE_HOURS;
}

export function recordTrigger(ruleId: string): void {
  const history = getTriggerHistory();
  history[ruleId] = new Date().toISOString();
  saveTriggerHistory(history);
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertRule[]>(getStoredAlerts);
  const [lastState, setLastState] = useState<AlertLastState>(getLastState);
  const [lastChecked, setLastChecked] = useState<string | null>(lastState.lastChecked || null);

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ALERTS_KEY) {
        setAlerts(getStoredAlerts());
      }
      if (e.key === LAST_STATE_KEY) {
        const state = getLastState();
        setLastState(state);
        setLastChecked(state.lastChecked || null);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const toggleAlert = useCallback((ruleId: string, enabled: boolean): void => {
    const current = getStoredAlerts();
    const updated = current.map((alert) =>
      alert.id === ruleId ? { ...alert, enabled } : alert
    );
    saveAlerts(updated);
    setAlerts(updated);
  }, []);

  const updateThreshold = useCallback((ruleId: string, threshold: number): void => {
    const current = getStoredAlerts();
    const updated = current.map((alert) =>
      alert.id === ruleId && alert.type === "trump_z_above"
        ? { ...alert, threshold }
        : alert
    );
    saveAlerts(updated);
    setAlerts(updated);
  }, []);

  const getAlert = useCallback((ruleId: string): AlertRule | undefined => {
    return alerts.find((a) => a.id === ruleId);
  }, [alerts]);

  const updateLastChecked = useCallback((timestamp: string): void => {
    const state = getLastState();
    state.lastChecked = timestamp;
    saveLastState(state);
    setLastChecked(timestamp);
  }, []);

  return {
    alerts,
    toggleAlert,
    updateThreshold,
    getAlert,
    lastState,
    lastChecked,
    updateLastChecked,
  };
}
