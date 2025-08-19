import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-200 dark:border-yellow-800 px-4 py-2">
      <div className="max-w-7xl mx-auto">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            <strong>Disclaimer:</strong> Informational purposes only. Not investment advice. No brokerage services.
          </span>
        </p>
      </div>
    </div>
  );
}
