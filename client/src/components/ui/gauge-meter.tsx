import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export interface GaugeMeterProps {
  value: number;
  min?: number;
  max?: number;
  size?: number | "sm" | "md" | "lg";
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  colorScale?: "sentiment" | "policy" | "neutral";
  isLoading?: boolean;
  isError?: boolean;
  className?: string;
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function getColorClass(value: number, max: number, colorScale: string): string {
  const ratio = value / max;
  
  switch (colorScale) {
    case "sentiment":
      if (ratio >= 0.67) return "text-green-500";
      if (ratio >= 0.34) return "text-yellow-500";
      return "text-red-500";
    case "policy":
      if (ratio >= 0.67) return "text-red-500";
      if (ratio >= 0.34) return "text-yellow-500";
      return "text-green-500";
    case "neutral":
    default:
      return "text-primary";
  }
}

function getLabel(value: number, max: number, colorScale: string): string {
  const ratio = value / max;
  
  switch (colorScale) {
    case "sentiment":
      if (ratio >= 0.67) return "Bullish";
      if (ratio >= 0.34) return "Neutral";
      return "Bearish";
    case "policy":
      if (ratio >= 0.67) return "High";
      if (ratio >= 0.34) return "Moderate";
      return "Low";
    default:
      return "";
  }
}

function getSizeValue(size: number | "sm" | "md" | "lg"): number {
  if (typeof size === "number") return size;
  switch (size) {
    case "sm": return 64;
    case "md": return 88;
    case "lg": return 120;
    default: return 88;
  }
}

function getStrokeWidth(size: number | "sm" | "md" | "lg"): number {
  if (typeof size === "number") return Math.max(6, size / 10);
  switch (size) {
    case "sm": return 6;
    case "md": return 8;
    case "lg": return 10;
    default: return 8;
  }
}

export function GaugeMeter({
  value,
  min = 0,
  max = 100,
  size = "md",
  strokeWidth,
  showValue = true,
  label,
  colorScale = "sentiment",
  isLoading = false,
  isError = false,
  className,
}: GaugeMeterProps) {
  const sizeValue = getSizeValue(size);
  const stroke = strokeWidth ?? getStrokeWidth(size);
  const clampedValue = clamp(value, min, max);
  const normalizedValue = ((clampedValue - min) / (max - min)) * 100;
  
  const center = sizeValue / 2;
  const radius = center - stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalizedValue / 100);
  
  const colorClass = getColorClass(normalizedValue, 100, colorScale);
  const autoLabel = label ?? getLabel(normalizedValue, 100, colorScale);

  if (isLoading) {
    return (
      <div
        className={cn("flex items-center justify-center", className)}
        style={{ width: sizeValue, height: sizeValue }}
        data-testid="gauge-loading"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-xs text-danger",
          className
        )}
        style={{ width: sizeValue, height: sizeValue }}
        data-testid="gauge-error"
      >
        Error
      </div>
    );
  }

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: sizeValue, height: sizeValue }}
      aria-label={`Score ${Math.round(clampedValue)} out of ${max}`}
      data-testid="gauge-meter"
    >
      <svg viewBox={`0 0 ${sizeValue} ${sizeValue}`} className={colorClass}>
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted-foreground) / 0.2)"
          strokeWidth={stroke}
        />
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          shapeRendering="geometricPrecision"
          style={{ transition: "stroke-dashoffset 500ms ease" }}
        />
      </svg>

      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={cn(
              "font-semibold tabular-nums text-foreground leading-none",
              typeof size === "number"
                ? "text-sm"
                : size === "sm"
                  ? "text-sm"
                  : size === "md"
                    ? "text-base"
                    : "text-xl"
            )}
          >
            {Math.round(clampedValue)}
          </div>
          {autoLabel && (
            <div
              className={cn(
                "mt-0.5 text-muted-foreground leading-none",
                typeof size === "number"
                  ? "text-[10px]"
                  : size === "sm"
                    ? "text-[9px]"
                    : size === "md"
                      ? "text-[10px]"
                      : "text-xs"
              )}
            >
              {autoLabel}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
