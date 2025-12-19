import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Sparkles,
  Info,
  AlertCircle,
  BarChart3,
  Lightbulb,
  Target,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMarketRegimeSnapshot } from "@/hooks/useMarketRegimeSnapshot";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ScenarioInputs {
  dxy: number;
  treasury10y: number;
  vix: number;
  oil: number;
}

interface AssetImpact {
  asset: string;
  symbol: string;
  direction: "up" | "down" | "neutral";
  impactStrength: "Low" | "Medium" | "High";
  confidence: number;
  explanation: string;
}

interface ScenarioSummary {
  regime: string;
  exposedAssets: string[];
  keyRisks: string[];
  narrative: string;
}

const defaultInputs: ScenarioInputs = {
  dxy: 0,
  treasury10y: 0,
  vix: 0,
  oil: 0,
};

const ASSET_SENSITIVITIES = [
  {
    asset: "S&P 500",
    symbol: "SPY",
    dxySensitivity: -0.3,
    treasurySensitivity: -0.5,
    vixSensitivity: -0.8,
    oilSensitivity: -0.2,
  },
  {
    asset: "Gold",
    symbol: "GLD",
    dxySensitivity: -0.7,
    treasurySensitivity: -0.4,
    vixSensitivity: 0.5,
    oilSensitivity: 0.1,
  },
  {
    asset: "US 20Y+ Treasury",
    symbol: "TLT",
    dxySensitivity: 0.1,
    treasurySensitivity: -0.9,
    vixSensitivity: 0.3,
    oilSensitivity: -0.1,
  },
  {
    asset: "Oil (Crude)",
    symbol: "USO",
    dxySensitivity: -0.5,
    treasurySensitivity: -0.2,
    vixSensitivity: -0.3,
    oilSensitivity: 1.0,
  },
  {
    asset: "US Dollar Index",
    symbol: "UUP",
    dxySensitivity: 1.0,
    treasurySensitivity: 0.4,
    vixSensitivity: 0.2,
    oilSensitivity: 0.1,
  },
  {
    asset: "Emerging Markets",
    symbol: "EEM",
    dxySensitivity: -0.6,
    treasurySensitivity: -0.4,
    vixSensitivity: -0.7,
    oilSensitivity: 0.3,
  },
  {
    asset: "Tech (NASDAQ)",
    symbol: "QQQ",
    dxySensitivity: -0.2,
    treasurySensitivity: -0.6,
    vixSensitivity: -0.9,
    oilSensitivity: -0.1,
  },
  {
    asset: "Real Estate",
    symbol: "VNQ",
    dxySensitivity: -0.2,
    treasurySensitivity: -0.7,
    vixSensitivity: -0.5,
    oilSensitivity: -0.2,
  },
  {
    asset: "Bitcoin",
    symbol: "BTC",
    dxySensitivity: -0.4,
    treasurySensitivity: -0.3,
    vixSensitivity: -0.6,
    oilSensitivity: 0.0,
  },
  {
    asset: "China A-Shares",
    symbol: "ASHR",
    dxySensitivity: -0.5,
    treasurySensitivity: -0.2,
    vixSensitivity: -0.5,
    oilSensitivity: 0.2,
  },
];

function calculateScenarioImpact(inputs: ScenarioInputs): AssetImpact[] {
  return ASSET_SENSITIVITIES.map((asset) => {
    const dxyImpact = asset.dxySensitivity * inputs.dxy;
    const treasuryImpact = asset.treasurySensitivity * (inputs.treasury10y / 25);
    const vixImpact = asset.vixSensitivity * (inputs.vix / 10);
    const oilImpact = asset.oilSensitivity * (inputs.oil / 5);

    const totalImpact = dxyImpact + treasuryImpact + vixImpact + oilImpact;
    const absImpact = Math.abs(totalImpact);

    let direction: "up" | "down" | "neutral";
    if (totalImpact > 0.1) direction = "up";
    else if (totalImpact < -0.1) direction = "down";
    else direction = "neutral";

    let impactStrength: "Low" | "Medium" | "High";
    if (absImpact > 0.5) impactStrength = "High";
    else if (absImpact > 0.2) impactStrength = "Medium";
    else impactStrength = "Low";

    const baseConfidence = 50;
    const inputMagnitude =
      Math.abs(inputs.dxy) +
      Math.abs(inputs.treasury10y) / 25 +
      Math.abs(inputs.vix) / 10 +
      Math.abs(inputs.oil) / 5;
    const confidence = Math.min(
      95,
      Math.max(30, baseConfidence + inputMagnitude * 10 + absImpact * 20)
    );

    const explanation = generateExplanation(asset, inputs, direction, impactStrength);

    return {
      asset: asset.asset,
      symbol: asset.symbol,
      direction,
      impactStrength,
      confidence: Math.round(confidence),
      explanation,
    };
  });
}

function generateExplanation(
  asset: (typeof ASSET_SENSITIVITIES)[0],
  inputs: ScenarioInputs,
  direction: "up" | "down" | "neutral",
  strength: "Low" | "Medium" | "High"
): string {
  const drivers: string[] = [];

  if (Math.abs(inputs.dxy) >= 1 && Math.abs(asset.dxySensitivity) >= 0.3) {
    const dxyDir = inputs.dxy > 0 ? "stronger" : "weaker";
    const impact = asset.dxySensitivity * inputs.dxy > 0 ? "supports" : "pressures";
    drivers.push(`A ${dxyDir} dollar ${impact} this asset`);
  }

  if (Math.abs(inputs.treasury10y) >= 25 && Math.abs(asset.treasurySensitivity) >= 0.3) {
    const yieldDir = inputs.treasury10y > 0 ? "higher" : "lower";
    const impact = asset.treasurySensitivity * inputs.treasury10y > 0 ? "benefits from" : "struggles with";
    drivers.push(`${yieldDir} yields ${impact} this sector`);
  }

  if (Math.abs(inputs.vix) >= 10 && Math.abs(asset.vixSensitivity) >= 0.3) {
    const volDir = inputs.vix > 0 ? "elevated" : "subdued";
    const impact = asset.vixSensitivity * inputs.vix > 0 ? "favors" : "weighs on";
    drivers.push(`${volDir} volatility ${impact} positioning`);
  }

  if (Math.abs(inputs.oil) >= 5 && Math.abs(asset.oilSensitivity) >= 0.3) {
    const oilDir = inputs.oil > 0 ? "higher" : "lower";
    const impact = asset.oilSensitivity * inputs.oil > 0 ? "boosts" : "drags on";
    drivers.push(`${oilDir} oil prices ${impact} performance`);
  }

  if (drivers.length === 0) {
    if (direction === "neutral") {
      return "Limited sensitivity to current macro scenario inputs.";
    }
    return `${strength} exposure to combined macro factors in this scenario.`;
  }

  return drivers.slice(0, 2).join(". ") + ".";
}

function getDirectionIcon(direction: "up" | "down" | "neutral") {
  switch (direction) {
    case "up":
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case "down":
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
}

function getDirectionColor(direction: "up" | "down" | "neutral") {
  switch (direction) {
    case "up":
      return "text-green-600 dark:text-green-400";
    case "down":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-gray-600 dark:text-gray-400";
  }
}

function getStrengthBadgeColor(strength: "Low" | "Medium" | "High") {
  switch (strength) {
    case "High":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "Medium":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
    default:
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  }
}

function getConfidenceColor(confidence: number) {
  if (confidence >= 70) return "text-green-600 dark:text-green-400";
  if (confidence >= 50) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

export default function Scenario() {
  const [inputs, setInputs] = useState<ScenarioInputs>(defaultInputs);
  const [results, setResults] = useState<AssetImpact[]>([]);
  const [hasCalculated, setHasCalculated] = useState(false);

  const { focusAssets } = useFocusAssets();
  const focusSymbols = focusAssets.map(a => a.symbol);

  const {
    snapshot: regimeSnapshot,
    isLoading: regimeLoading,
    error: regimeError,
    isMock: regimeIsMock,
    refetch: refetchRegime,
  } = useMarketRegimeSnapshot();

  const summarizeMutation = useMutation({
    mutationFn: async (data: { inputs: ScenarioInputs; results: AssetImpact[] }) => {
      const response = await apiRequest("POST", "/api/scenario/summarize", data);
      return response.json();
    },
  });

  const handleCalculate = () => {
    const impacts = calculateScenarioImpact(inputs);
    setResults(impacts);
    setHasCalculated(true);
  };

  const handleReset = () => {
    setInputs(defaultInputs);
    setResults([]);
    setHasCalculated(false);
    summarizeMutation.reset();
  };

  const handleSummarize = () => {
    summarizeMutation.mutate({ inputs, results });
  };

  const hasNonZeroInputs =
    inputs.dxy !== 0 ||
    inputs.treasury10y !== 0 ||
    inputs.vix !== 0 ||
    inputs.oil !== 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header
        title="Scenario Studio"
        subtitle="Explore hypothetical macro scenarios and asset impacts"
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Lens Tip - Show when no focus assets */}
        {focusSymbols.length === 0 && (
          <Card className="bg-primary/5 border-primary/20" data-testid="scenario-lens-tip">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">Personalize your scenario analysis</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Add focus assets to see how macro scenarios specifically impact your portfolio positions.
                  </p>
                  <Link href="/settings">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Target className="h-3 w-3" />
                      Add Focus Assets
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Disclaimer Banner */}
        <div
          className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3"
          data-testid="scenario-disclaimer"
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Hypothetical Scenario Analysis
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              These results are based on historical correlations and simplified models.
              They do not constitute investment advice or price forecasts. Past relationships
              may not hold in future market conditions.
            </p>
          </div>
        </div>

        {/* Baseline Regime Section */}
        <Card data-testid="baseline-regime">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Current Baseline Regime
            </CardTitle>
            <CardDescription>
              Reference point for scenario analysis (informational only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {regimeLoading && !regimeSnapshot ? (
              <div className="flex items-center gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : regimeError && !regimeSnapshot ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Failed to load baseline regime</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchRegime()}
                  data-testid="button-retry-baseline-regime"
                >
                  Retry
                </Button>
              </div>
            ) : regimeSnapshot ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={
                      regimeSnapshot.regime === "Risk-On"
                        ? "default"
                        : regimeSnapshot.regime === "Risk-Off"
                          ? "destructive"
                          : regimeSnapshot.regime === "Policy Shock"
                            ? "secondary"
                            : "outline"
                    }
                    className="font-semibold text-sm px-3 py-1"
                  >
                    {regimeSnapshot.regime}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {regimeSnapshot.confidence}% confidence
                  </span>
                  {regimeIsMock && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 text-muted-foreground border-muted-foreground/30"
                    >
                      Mock
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {regimeSnapshot.drivers.slice(0, 4).map((driver, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      <span
                        className={
                          driver.direction === "up"
                            ? "text-green-500 mr-1"
                            : driver.direction === "down"
                              ? "text-red-500 mr-1"
                              : "text-muted-foreground mr-1"
                        }
                      >
                        {driver.direction === "up"
                          ? "↑"
                          : driver.direction === "down"
                            ? "↓"
                            : "→"}
                      </span>
                      {driver.label} ({driver.strength})
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Scenario Inputs */}
        <Card data-testid="scenario-inputs-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Macro Scenario Inputs
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Adjust sliders to model hypothetical changes in key macro indicators.
                    These are directional inputs, not price predictions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Set hypothetical changes to key macro indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* DXY Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">USD Index (DXY)</label>
                <span
                  className={`text-sm font-mono ${inputs.dxy > 0 ? "text-green-600" : inputs.dxy < 0 ? "text-red-600" : "text-muted-foreground"}`}
                  data-testid="dxy-value"
                >
                  {inputs.dxy > 0 ? "+" : ""}
                  {inputs.dxy.toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[inputs.dxy]}
                min={-2}
                max={2}
                step={0.1}
                onValueChange={(value) => setInputs({ ...inputs, dxy: value[0] })}
                data-testid="slider-dxy"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-2%</span>
                <span>0%</span>
                <span>+2%</span>
              </div>
            </div>

            {/* Treasury 10Y Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">10Y Treasury Yield</label>
                <span
                  className={`text-sm font-mono ${inputs.treasury10y > 0 ? "text-green-600" : inputs.treasury10y < 0 ? "text-red-600" : "text-muted-foreground"}`}
                  data-testid="treasury-value"
                >
                  {inputs.treasury10y > 0 ? "+" : ""}
                  {inputs.treasury10y}bps
                </span>
              </div>
              <Slider
                value={[inputs.treasury10y]}
                min={-50}
                max={50}
                step={5}
                onValueChange={(value) =>
                  setInputs({ ...inputs, treasury10y: value[0] })
                }
                data-testid="slider-treasury"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50bps</span>
                <span>0bps</span>
                <span>+50bps</span>
              </div>
            </div>

            {/* VIX Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">VIX (Volatility)</label>
                <span
                  className={`text-sm font-mono ${inputs.vix > 0 ? "text-green-600" : inputs.vix < 0 ? "text-red-600" : "text-muted-foreground"}`}
                  data-testid="vix-value"
                >
                  {inputs.vix > 0 ? "+" : ""}
                  {inputs.vix}%
                </span>
              </div>
              <Slider
                value={[inputs.vix]}
                min={-20}
                max={20}
                step={1}
                onValueChange={(value) => setInputs({ ...inputs, vix: value[0] })}
                data-testid="slider-vix"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-20%</span>
                <span>0%</span>
                <span>+20%</span>
              </div>
            </div>

            {/* Oil Slider */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Oil (WTI)</label>
                <span
                  className={`text-sm font-mono ${inputs.oil > 0 ? "text-green-600" : inputs.oil < 0 ? "text-red-600" : "text-muted-foreground"}`}
                  data-testid="oil-value"
                >
                  {inputs.oil > 0 ? "+" : ""}
                  {inputs.oil}%
                </span>
              </div>
              <Slider
                value={[inputs.oil]}
                min={-10}
                max={10}
                step={1}
                onValueChange={(value) => setInputs({ ...inputs, oil: value[0] })}
                data-testid="slider-oil"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-10%</span>
                <span>0%</span>
                <span>+10%</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleCalculate}
                disabled={!hasNonZeroInputs}
                data-testid="button-calculate"
              >
                Calculate Impact
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        {hasCalculated && (
          <Card data-testid="scenario-results-card">
            <CardHeader>
              <CardTitle>Scenario Impact Results</CardTitle>
              <CardDescription>
                Estimated directional impact based on historical sensitivities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Impact Strength</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead className="min-w-[200px]">Explanation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow
                        key={result.symbol}
                        data-testid={`result-row-${result.symbol}`}
                      >
                        <TableCell className="font-medium">
                          <div>
                            <div>{result.asset}</div>
                            <div className="text-xs text-muted-foreground">
                              {result.symbol}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`flex items-center gap-2 ${getDirectionColor(result.direction)}`}
                          >
                            {getDirectionIcon(result.direction)}
                            <span className="capitalize">{result.direction}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStrengthBadgeColor(result.impactStrength)}>
                            {result.impactStrength}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={getConfidenceColor(result.confidence)}>
                            {result.confidence}%
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {result.explanation}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* AI Summary Button */}
              <div className="mt-6">
                <Button
                  onClick={handleSummarize}
                  disabled={summarizeMutation.isPending}
                  variant="outline"
                  className="w-full sm:w-auto"
                  data-testid="button-summarize"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {summarizeMutation.isPending
                    ? "Generating Summary..."
                    : "Summarize Scenario"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Summary */}
        {summarizeMutation.isPending && (
          <Card data-testid="scenario-summary-loading">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Scenario Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        )}

        {summarizeMutation.isError && (
          <Card className="border-destructive" data-testid="scenario-summary-error">
            <CardContent className="p-6">
              <p className="text-destructive mb-4">
                Unable to generate AI summary. Please try again.
              </p>
              <Button onClick={handleSummarize} variant="outline" size="sm">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {summarizeMutation.isSuccess && summarizeMutation.data && (
          <Card data-testid="scenario-summary-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Scenario Analysis
              </CardTitle>
              <CardDescription>
                Informational analysis based on the configured scenario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Regime */}
              <div>
                <h4 className="text-sm font-medium mb-2">Historical Regime Resemblance</h4>
                <p className="text-sm text-muted-foreground" data-testid="summary-regime">
                  {summarizeMutation.data.regime}
                </p>
              </div>

              {/* Narrative */}
              <div>
                <h4 className="text-sm font-medium mb-2">Scenario Narrative</h4>
                <p className="text-sm text-muted-foreground" data-testid="summary-narrative">
                  {summarizeMutation.data.narrative}
                </p>
              </div>

              {/* Exposed Assets */}
              <div>
                <h4 className="text-sm font-medium mb-2">Most Exposed Assets</h4>
                <div className="flex flex-wrap gap-2" data-testid="summary-exposed-assets">
                  {summarizeMutation.data.exposedAssets?.map((asset: string, i: number) => (
                    <Badge key={i} variant="secondary">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Key Risks */}
              <div>
                <h4 className="text-sm font-medium mb-2">Key Risks</h4>
                <ul
                  className="list-disc list-inside space-y-1 text-sm text-muted-foreground"
                  data-testid="summary-risks"
                >
                  {summarizeMutation.data.keyRisks?.map((risk: string, i: number) => (
                    <li key={i}>{risk}</li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="text-xs text-muted-foreground border-t pt-4">
                This analysis is for informational purposes only and does not constitute
                investment advice. Historical patterns may not repeat.
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
