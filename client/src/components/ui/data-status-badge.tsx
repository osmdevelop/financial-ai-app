import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";

export type DataStatus = "live" | "cached" | "mock" | "partial" | "unavailable" | "demo";

interface DataStatusBadgeProps {
  status: DataStatus;
  details?: string;
  className?: string;
  "data-testid"?: string;
}

const statusConfig: Record<
  DataStatus,
  {
    label: string;
    icon: React.ReactNode;
    className: string;
  }
> = {
  live: {
    label: "Live",
    icon: <CheckCircle className="h-3 w-3" />,
    className: "bg-green-500/10 text-green-600 border-green-500/30",
  },
  cached: {
    label: "Cached",
    icon: <Clock className="h-3 w-3" />,
    className: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  },
  mock: {
    label: "Mock",
    icon: <Database className="h-3 w-3" />,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
  partial: {
    label: "Partial",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-orange-500/10 text-orange-600 border-orange-500/30",
  },
  unavailable: {
    label: "Unavailable",
    icon: <AlertTriangle className="h-3 w-3" />,
    className: "bg-red-500/10 text-red-600 border-red-500/30",
  },
  demo: {
    label: "Demo",
    icon: <Database className="h-3 w-3" />,
    className: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  },
};

export function DataStatusBadge({
  status,
  details,
  className,
  "data-testid": dataTestId,
}: DataStatusBadgeProps) {
  const config = statusConfig[status];

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] px-1.5 py-0 h-5 gap-1 font-normal",
        config.className,
        className
      )}
      data-testid={dataTestId}
    >
      {config.icon}
      {config.label}
    </Badge>
  );

  if (details) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs max-w-xs">{details}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
}
