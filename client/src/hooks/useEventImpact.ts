import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetch event impact stats for a canonical event type (e.g. cpi_yoy_us, fomc_decision_us).
 */
export function useEventImpact(eventType: string | undefined, horizon: number = 48) {
  return useQuery({
    queryKey: ["/api/events/impact", eventType ?? null, horizon],
    queryFn: () => api.getEventImpact(eventType, horizon),
    enabled: !!eventType,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetch events that historically move a given asset, sorted by impact magnitude.
 */
export function useEventImpactForAsset(symbol: string | undefined, horizon: number = 48) {
  return useQuery({
    queryKey: ["/api/events/impact/for-asset", symbol ?? null, horizon],
    queryFn: () => api.getEventImpactForAsset(symbol!, horizon),
    enabled: !!symbol,
    staleTime: 10 * 60 * 1000,
  });
}
