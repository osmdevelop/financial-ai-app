import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetch cross-asset risk gauge: equities, crypto, bonds regime + AI insight when conflicted.
 */
export function useCrossAssetRegime() {
  return useQuery({
    queryKey: ["/api/regime/cross-asset"],
    queryFn: () => api.getCrossAssetRegime(),
    staleTime: 5 * 60 * 1000,
  });
}
