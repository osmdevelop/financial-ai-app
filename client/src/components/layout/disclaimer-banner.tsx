import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="bg-muted/80 dark:bg-muted/40 border-t border-border px-4 py-2 shrink-0">
      <div className="max-w-7xl mx-auto">
        <p className="text-muted-foreground text-xs text-center flex items-center justify-center gap-2 flex-wrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>
            MRKT is a market intelligence platform. We are not a brokerage, investment advisor, or financial institution.
            All analysis is for informational purposes only. Not investment advice. No brokerage services.
          </span>
        </p>
      </div>
    </div>
  );
}
