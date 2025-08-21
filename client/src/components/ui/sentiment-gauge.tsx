import { cn } from "@/lib/utils";

interface SentimentGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function SentimentGauge({ score, size = "md", className }: SentimentGaugeProps) {
  const radius = size === "sm" ? 40 : size === "md" ? 60 : 80;
  const strokeWidth = size === "sm" ? 6 : size === "md" ? 8 : 10;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  
  // Convert score (0-100) to angle (0-180 degrees for half circle)
  const angle = (score / 100) * 180;
  const strokeDasharray = `${circumference * 0.5} ${circumference}`;
  const strokeDashoffset = circumference * 0.5 - (circumference * 0.5 * score) / 100;
  
  // Determine color based on score
  const getColor = (score: number) => {
    if (score >= 70) return "text-success";
    if (score >= 40) return "text-warning";
    return "text-danger";
  };
  
  const getSentimentLabel = (score: number) => {
    if (score >= 70) return "Bullish";
    if (score >= 40) return "Neutral";
    return "Bearish";
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative">
        <svg
          height={radius + strokeWidth}
          width={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          {/* Background arc */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference * 0.5} ${circumference}`}
            r={normalizedRadius}
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            className="text-muted"
            opacity={0.2}
          />
          {/* Progress arc */}
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            r={normalizedRadius}
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            className={cn(getColor(score), "transition-all duration-500 ease-out")}
          />
        </svg>
        
        {/* Score display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn(
            "font-bold",
            size === "sm" ? "text-lg" : size === "md" ? "text-2xl" : "text-3xl",
            getColor(score)
          )}>
            {score}
          </span>
          <span className={cn(
            "text-muted-foreground font-medium",
            size === "sm" ? "text-xs" : "text-sm"
          )}>
            {getSentimentLabel(score)}
          </span>
        </div>
      </div>
    </div>
  );
}