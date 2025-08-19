import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="bg-warning/10 border-b border-warning/20 px-4 py-2">
      <div className="max-w-7xl mx-auto">
        <p className="text-warning-foreground text-sm text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            <strong>Disclaimer:</strong> Informational purposes only. Not investment advice. No brokerage services.
          </span>
        </p>
      </div>
    </div>
  );
}
