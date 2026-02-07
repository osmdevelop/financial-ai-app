/**
 * Global Data Mode: Live vs Demo.
 * In Live mode, sample/fake content must not render; show empty state instead.
 * In Demo mode, sample datasets and "Sample Market News" are allowed.
 */

const STORAGE_KEY = "mrkt_data_mode_v1";

export type DataMode = "live" | "demo";

export function getDataMode(): DataMode {
  if (typeof window === "undefined") return "live";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "demo" || stored === "live") return stored;
  } catch {
    // ignore
  }
  return "live";
}

export function setDataMode(mode: DataMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
}
