import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetch options signal lite for a symbol (OI, IV, put/call, unusual + AI explanation).
 */
export function useOptionsSignals(symbol: string | undefined) {
  return useQuery({
    queryKey: ["/api/options/signals", symbol ?? null],
    queryFn: () => api.getOptionsSignals(symbol!),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}
