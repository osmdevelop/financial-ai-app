import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceToggleProps {
  enabled: boolean;
  onToggle: () => void;
  className?: string;
}

export function EvidenceToggle({ enabled, onToggle, className }: EvidenceToggleProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Disable evidence mode" : "Enable evidence mode"}
      className={cn(
        "h-7 gap-1.5 text-xs",
        enabled && "bg-primary/10 border-primary/30 text-primary",
        className
      )}
      data-testid="evidence-toggle"
    >
      {enabled ? (
        <Eye className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}
      Evidence
    </Button>
  );
}
