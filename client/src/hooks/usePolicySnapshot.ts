import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type PolicySnapshot = {
  trumpZScore: number;
  trumpRegime: string;
  trumpAsOf: string;
  trumpDelta7d: number;
  fedspeakTone: string;
  fedspeakScore: number;
  fedspeakAsOf: string;
  topSensitiveAssets: Array<{
    symbol: string;
    name: string;
    sensitivity: string;
    lastChangePct: number;
  }>;
  highlightClusterSummary?: string;
};

export function usePolicySnapshot() {
  return useQuery({
    queryKey: ["/api/policy/snapshot"],
    queryFn: async (): Promise<PolicySnapshot> => {
      const [trumpData, fedspeakData] = await Promise.all([
        api.getTrumpIndex(),
        api.getFedspeak(),
      ]);

      const trumpRegime =
        trumpData.zScore > 0.75
          ? "High Risk"
          : trumpData.zScore < -0.75
            ? "Low Risk"
            : "Normal";

      const topSensitiveAssets = [...trumpData.sensitiveAssets]
        .filter((a) => a.sensitivity && a.sensitivity !== "None")
        .sort((a, b) => {
          const sensOrder = { High: 3, Moderate: 2, Low: 1, None: 0 };
          const aOrder = sensOrder[a.sensitivity || "None"];
          const bOrder = sensOrder[b.sensitivity || "None"];
          if (aOrder !== bOrder) return bOrder - aOrder;
          return Math.abs(b.correlation) - Math.abs(a.correlation);
        })
        .slice(0, 3)
        .map((a) => ({
          symbol: a.symbol,
          name: a.name,
          sensitivity: a.sensitivity || "Low",
          lastChangePct: a.changePct,
        }));

      const highlightClusterSummary =
        trumpData.clusters && trumpData.clusters.length > 0
          ? trumpData.clusters[0].summary
          : undefined;

      return {
        trumpZScore: trumpData.zScore,
        trumpRegime,
        trumpAsOf: trumpData.lastUpdated,
        trumpDelta7d: trumpData.change7d,
        fedspeakTone: fedspeakData.currentTone,
        fedspeakScore: fedspeakData.toneScore,
        fedspeakAsOf: fedspeakData.lastUpdated,
        topSensitiveAssets,
        highlightClusterSummary,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}
