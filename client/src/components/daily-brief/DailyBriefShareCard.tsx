import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, Database, Clock } from "lucide-react";
import { format } from "date-fns";

type TradeLevel = "Green" | "Yellow" | "Red";

export interface ShareCardData {
  date: Date;
  marketCall: {
    text: string;
    level: TradeLevel;
  };
  whatChanged: string[];
  lensImpact: { risk: string; asset: string }[];
  focusAssets: string[];
  headlines: { title: string; category: string }[];
  watchNext: { title: string; time: string; impact: string } | null;
  dataStatus: "live" | "mock" | "partial";
  dataTimestamp: string;
}

interface DailyBriefShareCardProps {
  data: ShareCardData;
}

const getTradeLevelBadge = (level: TradeLevel) => {
  const styles = {
    Green: "bg-green-500/20 text-green-700 border-green-500/40",
    Yellow: "bg-yellow-500/20 text-yellow-700 border-yellow-500/40",
    Red: "bg-red-500/20 text-red-700 border-red-500/40",
  };
  return styles[level];
};

const getDataStatusDisplay = (status: "live" | "mock" | "partial") => {
  switch (status) {
    case "live":
      return {
        label: "Live Data",
        icon: <CheckCircle className="h-3 w-3" />,
        className: "bg-green-500/20 text-green-700 border-green-500/40",
      };
    case "mock":
      return {
        label: "Mock Data",
        icon: <Database className="h-3 w-3" />,
        className: "bg-amber-500/20 text-amber-700 border-amber-500/40",
      };
    case "partial":
      return {
        label: "Partial Data",
        icon: <AlertTriangle className="h-3 w-3" />,
        className: "bg-orange-500/20 text-orange-700 border-orange-500/40",
      };
  }
};

export function DailyBriefShareCard({ data }: DailyBriefShareCardProps) {
  const dataStatusConfig = getDataStatusDisplay(data.dataStatus);
  
  return (
    <div 
      className="w-[900px] bg-white text-gray-900 font-sans p-8"
      data-testid="share-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">OSM Fin — Daily Brief</h1>
          <p className="text-sm text-gray-500">
            {format(data.date, "EEEE, MMMM d, yyyy")} at {format(data.date, "h:mm a zzz")}
          </p>
        </div>
      </div>

      {/* Market Call */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Today's Market Call
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="text-lg font-semibold text-gray-900 mb-2">
            {data.marketCall.text}
          </p>
          <Badge 
            variant="outline" 
            className={`text-xs px-2 py-0.5 ${getTradeLevelBadge(data.marketCall.level)}`}
          >
            {data.marketCall.level === "Green" && "Favorable Conditions"}
            {data.marketCall.level === "Yellow" && "Mixed Conditions"}
            {data.marketCall.level === "Red" && "Elevated Caution"}
          </Badge>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* What Changed */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            What Changed
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 min-h-[80px]">
            {data.whatChanged.length === 0 ? (
              <p className="text-sm text-gray-500">No major changes</p>
            ) : (
              <ul className="space-y-1.5">
                {data.whatChanged.slice(0, 3).map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Lens Impact */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
            Lens Impact
          </h2>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 min-h-[80px]">
            {data.focusAssets.length === 0 ? (
              <p className="text-sm text-gray-500">Add focus assets to see lens impact</p>
            ) : data.lensImpact.length === 0 ? (
              <p className="text-sm text-gray-500">No significant exposures</p>
            ) : (
              <ul className="space-y-1.5">
                {data.lensImpact.slice(0, 2).map((impact, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-gray-400 mt-0.5">•</span>
                    <span>{impact.risk} via <span className="font-medium">{impact.asset}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Headlines That Matter */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Headlines That Matter
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          {data.headlines.length === 0 ? (
            <p className="text-sm text-gray-500">No material headlines today</p>
          ) : (
            <ul className="space-y-2">
              {data.headlines.slice(0, 3).map((headline, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <Badge 
                    variant="outline" 
                    className="text-[10px] px-1.5 py-0 bg-white text-gray-600 border-gray-300 shrink-0"
                  >
                    {headline.category}
                  </Badge>
                  <span className="text-gray-700">{headline.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Watch Next */}
      <div className="mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          What to Watch Next
        </h2>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          {!data.watchNext ? (
            <p className="text-sm text-gray-500">No major catalysts on the horizon</p>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{data.watchNext.title}</p>
                <p className="text-xs text-gray-500">
                  {data.watchNext.time} — {data.watchNext.impact} impact expected
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0.5 gap-1 ${dataStatusConfig.className}`}
          >
            {dataStatusConfig.icon}
            {dataStatusConfig.label}
          </Badge>
          <span className="text-xs text-gray-500">
            As of {data.dataTimestamp}
          </span>
        </div>
        <p className="text-[10px] text-gray-400">
          Informational only. Not investment advice.
        </p>
      </div>
    </div>
  );
}

export function generateTextSummary(data: ShareCardData): string {
  const lines: string[] = [];
  
  lines.push(`OSM Fin Daily Brief — ${format(data.date, "MMMM d, yyyy")}`);
  lines.push("");
  lines.push(`MARKET CALL: ${data.marketCall.text}`);
  lines.push(`Status: ${data.marketCall.level === "Green" ? "Favorable" : data.marketCall.level === "Yellow" ? "Mixed" : "Cautious"}`);
  lines.push("");
  
  lines.push("KEY DRIVERS:");
  if (data.whatChanged.length === 0) {
    lines.push("• No major changes today");
  } else {
    data.whatChanged.slice(0, 3).forEach(change => {
      lines.push(`• ${change}`);
    });
  }
  lines.push("");
  
  if (data.watchNext) {
    lines.push(`WATCH NEXT: ${data.watchNext.title} (${data.watchNext.time})`);
    lines.push("");
  }
  
  lines.push(`Data Status: ${data.dataStatus === "live" ? "Live" : data.dataStatus === "mock" ? "Mock" : "Partial"}`);
  lines.push(`As of: ${data.dataTimestamp}`);
  lines.push("");
  lines.push("Informational only. Not investment advice.");
  
  return lines.join("\n");
}
