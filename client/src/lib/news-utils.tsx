import { useState, useEffect } from "react";
import { format, formatDistance, parseISO, isValid } from "date-fns";
import { TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

export const toDate = (v: unknown): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v);
  if (typeof v === "string") {
    const num = Number(v);
    if (!Number.isNaN(num)) return new Date(num < 1e12 ? num * 1000 : num);
    const d = parseISO(v);
    return isValid(d) ? d : null;
  }
  return null;
};

export const safeFormat = (v: unknown, fmt: string, fallback = "—") => {
  const d = toDate(v);
  return d && isValid(d) ? format(d, fmt) : fallback;
};

export const formatTimelineDate = (dateLike: unknown) => {
  const d = toDate(dateLike);
  if (!d) return "Unknown Date";
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yest = new Date();
  yest.setDate(yest.getDate() - 1);
  const yestStr = format(yest, "yyyy-MM-dd");
  const dStr = format(d, "yyyy-MM-dd");
  if (dStr === todayStr) return "Today";
  if (dStr === yestStr) return "Yesterday";
  return format(d, "MMMM d, yyyy");
};

export const getImpactColor = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case "high":
      return "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20";
    case "medium":
      return "text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20";
    case "low":
      return "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20";
    default:
      return "text-muted-foreground bg-muted";
  }
};

export const getImpactIcon = (impact: string) => {
  switch (impact?.toLowerCase()) {
    case "high":
      return <TrendingDown className="h-3 w-3" />;
    case "medium":
      return <AlertTriangle className="h-3 w-3" />;
    case "low":
      return <TrendingUp className="h-3 w-3" />;
    default:
      return <TrendingUp className="h-3 w-3" />;
  }
};

export function TimeAgo({ date }: { date: unknown }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  const d = toDate(date);
  if (!d || !isValid(d))
    return <span className="text-xs text-muted-foreground">—</span>;
  return <>{formatDistance(d, new Date(), { addSuffix: true })}</>;
}
