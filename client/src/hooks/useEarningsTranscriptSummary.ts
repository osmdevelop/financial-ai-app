import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetch transcript summary for a symbol (mock/sample until transcript is analyzed).
 */
export function useEarningsTranscriptSummary(symbol: string | undefined) {
  return useQuery({
    queryKey: ["/api/earnings/transcript-summary", symbol ?? null],
    queryFn: () => api.getEarningsTranscriptSummary(symbol!),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}
