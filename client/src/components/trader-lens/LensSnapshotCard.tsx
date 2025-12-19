import { useState } from "react";
import { useTraderLensContext } from "@/hooks/useTraderLensContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Target, Settings2, CircleCheck, CircleAlert, AlertTriangle } from "lucide-react";
import { AssetPickerModal } from "./AssetPickerModal";

function getTradeBadgeStyles(level: "Green" | "Yellow" | "Red") {
  switch (level) {
    case "Green":
      return "bg-green-500/10 text-green-600 border-green-500/30";
    case "Red":
      return "bg-red-500/10 text-red-600 border-red-500/30";
    default:
      return "bg-yellow-500/10 text-yellow-600 border-yellow-500/30";
  }
}

function getTradeBadgeIcon(level: "Green" | "Yellow" | "Red") {
  switch (level) {
    case "Green":
      return <CircleCheck className="h-4 w-4" />;
    case "Red":
      return <CircleAlert className="h-4 w-4" />;
    default:
      return <AlertTriangle className="h-4 w-4" />;
  }
}

export function LensSnapshotCard() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const {
    focusAssets,
    lensSummary,
    shouldTradeToday,
    relevantDrivers,
    isLoading,
    hasFocusAssets,
    meta,
  } = useTraderLensContext();

  if (isLoading) {
    return (
      <Card data-testid="lens-snapshot">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Trader Lens
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="lens-snapshot">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Trader Lens
              {meta.isMock && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30">
                  Mock
                </Badge>
              )}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="h-8"
              data-testid="manage-lens-btn"
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Manage
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasFocusAssets ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Select up to 5 focus assets to personalize your market view.
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={() => setPickerOpen(true)}
                data-testid="add-focus-assets-btn"
              >
                Add Focus Assets
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2" data-testid="focus-asset-chips">
                {focusAssets.map((asset) => (
                  <Badge
                    key={asset.id}
                    variant="secondary"
                    className="px-2 py-1"
                    data-testid={`lens-chip-${asset.symbol}`}
                  >
                    {asset.symbol}
                  </Badge>
                ))}
              </div>

              <div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className={`flex items-center gap-2 w-fit px-3 py-2 text-sm font-medium cursor-help ${getTradeBadgeStyles(shouldTradeToday.level)}`}
                      data-testid="trade-today-badge"
                    >
                      {getTradeBadgeIcon(shouldTradeToday.level)}
                      <span>
                        Should I Trade Today?{" "}
                        <span className="font-bold">{shouldTradeToday.level}</span>
                      </span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">{shouldTradeToday.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      This is informational only, not trading advice.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {relevantDrivers.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Key Drivers:</p>
                  <ul className="text-sm space-y-1" data-testid="lens-drivers">
                    {relevantDrivers.map((driver, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{driver}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-muted-foreground">{lensSummary}</p>
            </>
          )}
        </CardContent>
      </Card>

      <AssetPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
    </>
  );
}
