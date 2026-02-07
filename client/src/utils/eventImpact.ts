/**
 * Client-side event type derivation (mirrors server getEventTypeFromEvent).
 * Used to map economic event names to canonical eventType for impact API.
 */
export function getEventTypeFromEventName(eventName: string, category?: string): string | null {
  const name = (eventName || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  if (name.includes("cpi") || (cat === "inflation" && name.includes("consumer price"))) return "cpi_yoy_us";
  if (name.includes("fomc") || (name.includes("fed") && name.includes("rate"))) return "fomc_decision_us";
  if (name.includes("non-farm") || name.includes("nonfarm") || name.includes("payroll") || cat === "employment") return "nfp_us";
  if (name.includes("ppi") || (cat === "inflation" && name.includes("producer"))) return "ppi_yoy_us";
  return null;
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  cpi_yoy_us: "CPI",
  fomc_decision_us: "FOMC",
  nfp_us: "NFP",
  ppi_yoy_us: "PPI",
};
