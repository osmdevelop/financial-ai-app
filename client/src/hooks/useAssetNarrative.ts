import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetch per-asset "why it moved" narrative (summary + drivers + citations).
 * Optional priceContext improves the narrative when overview is loaded.
 */
export function useAssetNarrative(
  symbol: string | undefined,
  days: number = 7,
  priceContext?: { changePct: number; period: string }
) {
  return useQuery({
    queryKey: ["/api/asset/narrative", symbol ?? null, days, priceContext?.changePct, priceContext?.period],
    queryFn: () =>
      api.getAssetNarrative(symbol!, days, priceContext ? { changePct: priceContext.changePct, period: priceContext.period } : undefined),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
}
