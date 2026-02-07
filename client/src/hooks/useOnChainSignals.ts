import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Fetch crypto on-chain decision signals (exchange inflow, dormant wallet, stablecoin delta, etc.).
 */
export function useOnChainSignals() {
  return useQuery({
    queryKey: ["/api/crypto/onchain-signals"],
    queryFn: () => api.getOnChainSignals(),
    staleTime: 5 * 60 * 1000,
  });
}
