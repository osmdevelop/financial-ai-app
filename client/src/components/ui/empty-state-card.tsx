import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, FileX } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: "empty" | "partial" | "error";
  isMock?: boolean;
  missingInputs?: string[];
  icon?: React.ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function EmptyStateCard({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = "empty",
  isMock = false,
  missingInputs = [],
  icon,
  className,
  "data-testid": dataTestId,
}: EmptyStateCardProps) {
  const getIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case "error":
        return <AlertTriangle className="h-10 w-10 text-destructive" />;
      case "partial":
        return <Info className="h-10 w-10 text-warning" />;
      default:
        return <FileX className="h-10 w-10 text-muted-foreground" />;
    }
  };

  const getBorderColor = () => {
    switch (variant) {
      case "error":
        return "border-destructive/30";
      case "partial":
        return "border-warning/30";
      default:
        return "";
    }
  };

  return (
    <Card className={cn("text-center", getBorderColor(), className)} data-testid={dataTestId}>
      <CardContent className="py-8 px-6">
        <div className="flex flex-col items-center gap-4">
          {getIcon()}
          <div className="space-y-2">
            <h3 className="font-medium text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {description}
            </p>
            {isMock && (
              <p className="text-xs text-muted-foreground/70 italic">
                Showing sample data.
              </p>
            )}
            {missingInputs.length > 0 && (
              <p className="text-xs text-muted-foreground/70">
                Missing: {missingInputs.join(", ")}
              </p>
            )}
          </div>
          {(actionLabel || secondaryActionLabel) && (
            <div className="flex flex-wrap gap-2 justify-center">
              {actionLabel && onAction && (
                <Button
                  onClick={onAction}
                  size="sm"
                  data-testid={dataTestId ? `${dataTestId}-action` : undefined}
                >
                  {actionLabel}
                </Button>
              )}
              {secondaryActionLabel && onSecondaryAction && (
                <Button
                  onClick={onSecondaryAction}
                  variant="outline"
                  size="sm"
                  data-testid={dataTestId ? `${dataTestId}-secondary-action` : undefined}
                >
                  {secondaryActionLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
