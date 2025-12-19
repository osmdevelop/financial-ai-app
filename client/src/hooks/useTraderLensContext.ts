import { useMemo } from "react";
import { useFocusAssets } from "./useFocusAssets";
import { useMarketRegimeSnapshot } from "./useMarketRegimeSnapshot";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Headline, FocusAsset } from "@shared/schema";

export type TradeTodayLevel = "Green" | "Yellow" | "Red";

export interface ShouldTradeToday {
  level: TradeTodayLevel;
  reason: string;
  meta: {
    regime?: string;
    volatility?: string;
    policyRisk?: string;
  };
}

export interface TraderLensContext {
  focusAssets: FocusAsset[];
  lensSummary: string;
  shouldTradeToday: ShouldTradeToday;
  relevantDrivers: string[];
  relevantHeadlines: Headline[];
  asOf: string;
  meta: {
    isMock: boolean;
    missing: string[];
  };
}

export function useTraderLensContext() {
  const { focusAssets, isLoading: assetsLoading } = useFocusAssets();
  const { snapshot: regimeSnapshot, isMock: regimeIsMock, isLoading: regimeLoading } = useMarketRegimeSnapshot();

  const { data: trumpIndex, isLoading: policyLoading } = useQuery({
    queryKey: ["/api/policy/trump-index"],
    queryFn: () => api.getTrumpIndex(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: fedspeak, isLoading: fedLoading } = useQuery({
    queryKey: ["/api/policy/fedspeak"],
    queryFn: () => api.getFedspeak(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const focusSymbols = focusAssets.map(a => a.symbol);

  const { data: headlines, isLoading: headlinesLoading } = useQuery({
    queryKey: ["/api/headlines/timeline", "lens", focusSymbols.join(",")],
    queryFn: () => api.getHeadlinesTimeline(focusSymbols, "all", 50),
    enabled: focusSymbols.length > 0,
    staleTime: 60 * 1000,
    retry: 1,
  });

  const context = useMemo<TraderLensContext>(() => {
    const missing: string[] = [];
    
    if (!regimeSnapshot) missing.push("regime");
    if (!trumpIndex) missing.push("policy");
    if (!fedspeak) missing.push("fedspeak");

    const regime = regimeSnapshot?.regime ?? "Unknown";
    const confidence = regimeSnapshot?.confidence ?? 0;

    let shouldTradeToday: ShouldTradeToday = {
      level: "Yellow",
      reason: "Market conditions are mixed.",
      meta: { regime },
    };

    if (regime === "Risk-Off" || regime === "Policy Shock") {
      shouldTradeToday = {
        level: "Red",
        reason: `Caution advised: ${regime} conditions detected. Higher uncertainty.`,
        meta: { regime, volatility: "elevated" },
      };
    } else if (regime === "Risk-On" && confidence >= 60) {
      const policyRisk = trumpIndex?.zScore && trumpIndex.zScore > 1 ? "elevated" : "normal";
      if (policyRisk === "normal") {
        shouldTradeToday = {
          level: "Green",
          reason: "Market conditions appear constructive for positioning.",
          meta: { regime, volatility: "low", policyRisk },
        };
      } else {
        shouldTradeToday = {
          level: "Yellow",
          reason: "Risk-On but elevated policy uncertainty.",
          meta: { regime, policyRisk },
        };
      }
    } else if (missing.length > 0) {
      shouldTradeToday = {
        level: "Yellow",
        reason: `Some data sources unavailable: ${missing.join(", ")}`,
        meta: { regime },
      };
    }

    const relevantDrivers: string[] = [];
    if (regimeSnapshot?.drivers) {
      regimeSnapshot.drivers.slice(0, 3).forEach(d => {
        const direction = d.direction === "up" ? "↑" : d.direction === "down" ? "↓" : "→";
        relevantDrivers.push(`${d.label} ${direction} (${d.strength})`);
      });
    }
    if (fedspeak?.currentTone) {
      relevantDrivers.push(`Fed tone: ${fedspeak.currentTone}`);
    }
    if (trumpIndex?.zScore !== undefined) {
      const level = trumpIndex.zScore > 1.5 ? "high" : trumpIndex.zScore > 0.5 ? "moderate" : "low";
      relevantDrivers.push(`Policy risk: ${level}`);
    }

    const relevantHeadlines = (headlines || []).filter((h: Headline) => {
      if (!h.symbols || !focusSymbols.length) return false;
      return h.symbols.some(s => 
        focusSymbols.some(fs => 
          s.toLowerCase().includes(fs.toLowerCase()) || 
          fs.toLowerCase().includes(s.toLowerCase())
        )
      );
    }).slice(0, 5);

    const lensSummary = focusAssets.length > 0
      ? `Tracking ${focusAssets.map(a => a.symbol).join(", ")} in ${regime} regime.`
      : "No focus assets selected.";

    return {
      focusAssets,
      lensSummary,
      shouldTradeToday,
      relevantDrivers: relevantDrivers.slice(0, 3),
      relevantHeadlines,
      asOf: new Date().toISOString(),
      meta: {
        isMock: regimeIsMock,
        missing,
      },
    };
  }, [focusAssets, regimeSnapshot, trumpIndex, fedspeak, headlines, regimeIsMock]);

  return {
    ...context,
    isLoading: assetsLoading || regimeLoading || policyLoading || fedLoading || headlinesLoading,
    hasFocusAssets: focusAssets.length > 0,
  };
}
