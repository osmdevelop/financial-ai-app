import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { MarketRegimeSnapshot } from "@shared/schema";

export interface UseMarketRegimeSnapshotOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
}

export function useMarketRegimeSnapshot(options: UseMarketRegimeSnapshotOptions = {}) {
  const { enabled = true, refetchOnMount = true } = options;

  const query = useQuery<MarketRegimeSnapshot, Error>({
    queryKey: ["/api/regime/snapshot"],
    queryFn: () => api.getMarketRegimeSnapshot(),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnMount,
    retry: 1,
  });

  const generateSummary = (snapshot: MarketRegimeSnapshot | undefined): string => {
    if (!snapshot) return "";
    
    const { regime, drivers, confidence } = snapshot;
    const topDrivers = drivers.slice(0, 2);
    
    if (topDrivers.length === 0) {
      return `Market regime is ${regime} with ${confidence}% confidence.`;
    }
    
    const driverSummaries = topDrivers.map(d => {
      const directionText = d.direction === "up" ? "rising" : d.direction === "down" ? "falling" : "stable";
      return `${d.label} ${directionText}`;
    });
    
    return `Market is in ${regime} mode (${confidence}% confidence) driven by ${driverSummaries.join(" and ")}.`;
  };

  return {
    ...query,
    snapshot: query.data,
    isMock: query.data?.meta?.isMock ?? false,
    missingInputs: query.data?.meta?.missingInputs ?? [],
    summary: generateSummary(query.data),
  };
}
