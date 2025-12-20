// History Storage Service - localStorage based daily snapshot persistence

export type TradeLevel = "Green" | "Yellow" | "Red";

export interface DailySnapshot {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO timestamp
  dailyCall: string; // Today's Market Call hero sentence
  shouldTradeToday?: {
    level: TradeLevel;
    reason?: string;
  };
  focusAssets?: Array<{
    symbol: string;
    assetType: string;
    displayName?: string;
  }>;
  regime?: {
    regime: string;
    confidence: number;
    drivers: Array<{ key: string; detail: string }>;
  };
  policy?: {
    trumpZ?: number;
    trumpRisk?: string;
  };
  fed?: {
    tone?: "hawkish" | "dovish" | "neutral";
    score?: number;
  };
  volatility?: {
    state?: string;
    score?: number;
  };
  meta: {
    isMock: boolean;
    missingInputs: string[];
    notes?: string;
  };
}

export interface SnapshotDelta {
  changes: Array<{
    key: string;
    label: string;
    from?: string;
    to?: string;
  }>;
  summary: string;
}

const STORAGE_KEYS = {
  SNAPSHOTS: "history_snapshots_v1",
  LAST_CAPTURE: "history_last_capture_v1",
};

const MAX_SNAPSHOTS = 45;

function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getSnapshots(): DailySnapshot[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SNAPSHOTS);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSnapshots(snapshots: DailySnapshot[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SNAPSHOTS, JSON.stringify(snapshots));
  } catch (e) {
    console.error("Failed to save snapshots:", e);
  }
}

export function getLastCaptureDate(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_CAPTURE);
  } catch {
    return null;
  }
}

export function setLastCaptureDate(date: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CAPTURE, date);
  } catch (e) {
    console.error("Failed to save last capture date:", e);
  }
}

export function getYesterdaySnapshot(): DailySnapshot | null {
  const snapshots = getSnapshots();
  if (snapshots.length === 0) return null;

  const today = getLocalDateString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

  // Find yesterday's snapshot, or the most recent one before today
  const yesterdaySnapshot = snapshots.find((s) => s.date === yesterdayStr);
  if (yesterdaySnapshot) return yesterdaySnapshot;

  // Find most recent before today
  const sorted = [...snapshots]
    .filter((s) => s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));

  return sorted[0] || null;
}

export function getSnapshotByDate(date: string): DailySnapshot | null {
  const snapshots = getSnapshots();
  return snapshots.find((s) => s.date === date) || null;
}

export function getSnapshotsInRange(days: number): DailySnapshot[] {
  const snapshots = getSnapshots();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, "0")}-${String(cutoff.getDate()).padStart(2, "0")}`;

  return snapshots
    .filter((s) => s.date >= cutoffStr)
    .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
}

function pruneSnapshots(snapshots: DailySnapshot[]): DailySnapshot[] {
  if (snapshots.length <= MAX_SNAPSHOTS) return snapshots;
  // Sort by date descending and keep most recent
  return [...snapshots]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_SNAPSHOTS);
}

export interface CaptureContext {
  dailyCall: string;
  shouldTradeToday?: {
    level: TradeLevel;
    reason?: string;
  };
  focusAssets?: Array<{
    symbol: string;
    assetType: string;
    displayName?: string;
  }>;
  regime?: {
    regime: string;
    confidence: number;
    drivers?: Array<{ label?: string; key?: string; detail?: string; strength?: string; direction?: string }>;
  };
  policy?: {
    zScore?: number;
    trumpZ?: number;
    risk?: string;
    trumpRisk?: string;
  };
  fed?: {
    currentTone?: string;
    tone?: "hawkish" | "dovish" | "neutral";
    toneScore?: number;
    score?: number;
  };
  sentiment?: {
    score?: number;
    regime?: string;
  };
  meta: {
    isMock: boolean;
    missingInputs: string[];
  };
}

export function captureDailySnapshot(context: CaptureContext, force = false): boolean {
  const today = getLocalDateString();
  const lastCapture = getLastCaptureDate();

  // Don't capture twice on the same day unless forced
  if (!force && lastCapture === today) {
    return false;
  }

  // Don't capture if there's no meaningful data
  if (!context.dailyCall) {
    return false;
  }

  const snapshot: DailySnapshot = {
    id: today,
    date: today,
    createdAt: new Date().toISOString(),
    dailyCall: context.dailyCall,
    shouldTradeToday: context.shouldTradeToday,
    focusAssets: context.focusAssets,
    regime: context.regime
      ? {
          regime: context.regime.regime,
          confidence: context.regime.confidence,
          drivers: (context.regime.drivers || []).slice(0, 3).map((d) => ({
            key: d.label || d.key || "driver",
            detail: d.detail || `${d.direction || ""} (${d.strength || ""})`.trim(),
          })),
        }
      : undefined,
    policy: context.policy
      ? {
          trumpZ: context.policy.zScore ?? context.policy.trumpZ,
          trumpRisk: context.policy.risk ?? context.policy.trumpRisk,
        }
      : undefined,
    fed: context.fed
      ? {
          tone: (context.fed.currentTone?.toLowerCase() ?? context.fed.tone) as
            | "hawkish"
            | "dovish"
            | "neutral"
            | undefined,
          score: context.fed.toneScore ?? context.fed.score,
        }
      : undefined,
    volatility: context.sentiment
      ? {
          state:
            context.sentiment.score !== undefined
              ? context.sentiment.score > 60
                ? "low"
                : context.sentiment.score > 40
                  ? "normal"
                  : "elevated"
              : undefined,
          score: context.sentiment.score,
        }
      : undefined,
    meta: {
      isMock: context.meta.isMock,
      missingInputs: context.meta.missingInputs,
    },
  };

  const snapshots = getSnapshots();
  // Remove existing snapshot for today if forcing
  const filtered = snapshots.filter((s) => s.date !== today);
  filtered.push(snapshot);

  const pruned = pruneSnapshots(filtered);
  saveSnapshots(pruned);
  setLastCaptureDate(today);

  return true;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.SNAPSHOTS);
    localStorage.removeItem(STORAGE_KEYS.LAST_CAPTURE);
  } catch (e) {
    console.error("Failed to clear history:", e);
  }
}

export function exportHistory(): string {
  const snapshots = getSnapshots();
  return JSON.stringify(snapshots, null, 2);
}

export function compareSnapshots(
  prev: DailySnapshot | null,
  curr: DailySnapshot | null
): SnapshotDelta {
  const changes: SnapshotDelta["changes"] = [];

  if (!prev || !curr) {
    return {
      changes: [],
      summary: prev
        ? "Current snapshot not available."
        : "No previous snapshot available for comparison.",
    };
  }

  // Regime change
  const prevRegime = prev.regime?.regime;
  const currRegime = curr.regime?.regime;
  if (prevRegime && currRegime && prevRegime !== currRegime) {
    changes.push({
      key: "regime",
      label: "Market regime changed",
      from: prevRegime,
      to: currRegime,
    });
  }

  // Fed tone change
  const prevTone = prev.fed?.tone;
  const currTone = curr.fed?.tone;
  if (prevTone && currTone && prevTone !== currTone) {
    changes.push({
      key: "fed",
      label: "Fed tone changed",
      from: prevTone,
      to: currTone,
    });
  }

  // Policy risk change
  const prevRisk = prev.policy?.trumpRisk;
  const currRisk = curr.policy?.trumpRisk;
  if (prevRisk && currRisk && prevRisk !== currRisk) {
    changes.push({
      key: "policy",
      label: "Policy risk changed",
      from: prevRisk,
      to: currRisk,
    });
  }

  // Volatility state change
  const prevVol = prev.volatility?.state;
  const currVol = curr.volatility?.state;
  if (prevVol && currVol && prevVol !== currVol) {
    changes.push({
      key: "volatility",
      label: "Volatility state changed",
      from: prevVol,
      to: currVol,
    });
  }

  // ShouldTradeToday level change
  const prevLevel = prev.shouldTradeToday?.level;
  const currLevel = curr.shouldTradeToday?.level;
  if (prevLevel && currLevel && prevLevel !== currLevel) {
    changes.push({
      key: "tradeLevel",
      label: "Trade conditions changed",
      from: prevLevel,
      to: currLevel,
    });
  }

  // Generate summary
  let summary: string;
  if (changes.length === 0) {
    summary = "No major changes versus yesterday.";
  } else if (changes.length <= 2) {
    summary = `Key change${changes.length > 1 ? "s" : ""}: ${changes.map((c) => `${c.label} (${c.from} → ${c.to})`).join("; ")}.`;
  } else {
    summary = "Multiple drivers shifted versus yesterday.";
  }

  return { changes, summary };
}

export function hasCapturedToday(): boolean {
  const today = getLocalDateString();
  const lastCapture = getLastCaptureDate();
  return lastCapture === today;
}

// Aliases for backwards compatibility
export const getAllSnapshots = getSnapshots;
export const clearAllSnapshots = clearHistory;
