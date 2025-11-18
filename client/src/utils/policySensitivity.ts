import type { PolicySensitivity } from "@shared/schema";

/**
 * Classify policy sensitivity based on correlation and rolling impact metrics
 */
export function classifyPolicySensitivity(
  correlation: number,
  rollingImpact: number
): PolicySensitivity {
  const corr = Math.abs(correlation);
  
  // Simple rule-of-thumb thresholds
  if (corr >= 0.6 || Math.abs(rollingImpact) >= 1.5) return "High";
  if (corr >= 0.3 || Math.abs(rollingImpact) >= 0.5) return "Moderate";
  if (corr > 0.1) return "Low";
  return "None";
}

/**
 * Get color styling for policy sensitivity badge
 */
export function getSensitivityColor(sensitivity: PolicySensitivity): string {
  switch (sensitivity) {
    case "High":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "Moderate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "Low":
      return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400";
    case "None":
      return "bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-500";
  }
}

/**
 * Get tooltip text for policy sensitivity
 */
export function getSensitivityTooltip(sensitivity: PolicySensitivity): string {
  switch (sensitivity) {
    case "High":
      return "Historically reacts strongly to policy headlines";
    case "Moderate":
      return "Shows moderate sensitivity to policy changes";
    case "Low":
      return "Limited sensitivity to policy developments";
    case "None":
      return "No significant policy sensitivity detected";
  }
}
