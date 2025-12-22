import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "evidence_mode_v1";

export function useEvidenceMode() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
    } catch {
      // Ignore storage errors
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => !prev);
  }, []);

  return {
    enabled,
    toggle,
    setEnabled,
  };
}
