import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataStatusBadge } from "@/components/ui/data-status-badge";
import { cn } from "@/lib/utils";
import type { EvidenceItem, EvidenceMeta } from "./types";

interface EvidencePanelProps {
  title: string;
  items: EvidenceItem[];
  meta?: EvidenceMeta;
  defaultOpen?: boolean;
  className?: string;
  "data-testid"?: string;
}

export function EvidencePanel({
  title,
  items,
  meta,
  defaultOpen = false,
  className,
  "data-testid": testId,
}: EvidencePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const inputItems = items.filter((item) => item.kind === "input");
  const hasInputs = inputItems.length > 0;

  const handleCopyInputs = async () => {
    const inputText = inputItems
      .map((item) => `${item.label}: ${item.value}`)
      .join("\n");
    
    try {
      await navigator.clipboard.writeText(inputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy inputs:", error);
    }
  };

  const getDataStatus = (): "live" | "mock" | "partial" | "unavailable" | "demo" => {
    if (!meta) return "live";
    if (meta.dataStatus === "demo" || meta.dataStatus === "unavailable") return meta.dataStatus;
    if (meta.dataStatus === "cached" || meta.dataStatus === "partial") return meta.dataStatus;
    if (meta.isMock) return "mock";
    if (meta.missingInputs && meta.missingInputs.length > 0) return "partial";
    return "live";
  };

  const formatCacheAge = (ms?: number): string => {
    if (!ms) return "";
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={cn(
        "border rounded-lg bg-muted/30 overflow-hidden",
        className
      )}
      data-testid={testId || "evidence-panel"}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">{title}</span>
          {meta && (
            <DataStatusBadge 
              status={getDataStatus()} 
              details={meta.missingInputs?.length ? `Missing: ${meta.missingInputs.join(", ")}` : undefined}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {meta?.asOf && (
            <span className="text-[10px] text-muted-foreground">
              As of {meta.asOf}
            </span>
          )}
          {meta?.cacheAgeMs && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
              {formatCacheAge(meta.cacheAgeMs)}
            </Badge>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="px-3 pb-3 space-y-2">
          {/* Items List */}
          <div className="space-y-1.5">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground min-w-[80px] shrink-0">
                  {item.label}:
                </span>
                <span className={cn(
                  "text-foreground break-words",
                  item.kind === "note" && "text-muted-foreground italic"
                )}>
                  {item.kind === "source" && item.href ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {item.value}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    item.value
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Missing Inputs Warning */}
          {meta?.missingInputs && meta.missingInputs.length > 0 && (
            <div className="text-xs text-warning bg-warning/10 rounded px-2 py-1">
              Missing inputs: {meta.missingInputs.join(", ")}
            </div>
          )}

          {/* Mock Data Warning */}
          {meta?.isMock && (
            <div className="text-xs text-amber-600 bg-amber-500/10 rounded px-2 py-1">
              Mock data used for this section
            </div>
          )}

          {/* Copy Inputs Button */}
          {hasInputs && (
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyInputs}
                className="h-6 text-[10px] gap-1"
                data-testid="evidence-copy"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copy inputs
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
