import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataStatusBadge } from "@/components/ui/data-status-badge";
import { useAlerts } from "@/hooks/useAlerts";
import { forceEvaluate } from "@/services/alertEvaluator";
import {
  Bell,
  AlertTriangle,
  Activity,
  TrendingUp,
  MessageSquare,
  RefreshCw,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Alerts() {
  const { alerts, toggleAlert, updateThreshold, lastChecked } = useAlerts();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const regimeAlert = alerts.find((a) => a.type === "regime_change");
  const policyShockAlert = alerts.find((a) => a.type === "policy_shock");
  const trumpAlert = alerts.find((a) => a.type === "trump_z_above");
  const fedspeakAlert = alerts.find((a) => a.type === "fedspeak_change");

  const handleForceCheck = async () => {
    setIsChecking(true);
    try {
      forceEvaluate();
      toast({
        title: "Alerts checked",
        description: "Alert conditions have been evaluated.",
      });
    } catch (e) {
      toast({
        title: "Check failed",
        description: "Could not evaluate alert conditions.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsChecking(false), 1000);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden" data-testid="alerts-page">
      <Header
        title="Alerts"
        subtitle="Configure in-app notifications for market changes"
      />

      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Alert Presets
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Enable alerts to receive in-app notifications when conditions are met.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {lastChecked && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last checked: {formatDistanceToNow(new Date(lastChecked), { addSuffix: true })}
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceCheck}
                    disabled={isChecking}
                    data-testid="button-check-now"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isChecking ? "animate-spin" : ""}`} />
                    Check Now
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertPresetRow
                id="regime_change"
                icon={<Activity className="h-5 w-5 text-blue-500" />}
                title="Market Regime Change"
                description="Notify me when the market regime changes (e.g., Risk-On to Risk-Off)"
                enabled={regimeAlert?.enabled ?? false}
                onToggle={(enabled) => toggleAlert("regime_change", enabled)}
              />

              <AlertPresetRow
                id="policy_shock"
                icon={<AlertTriangle className="h-5 w-5 text-red-500" />}
                title="Policy Shock"
                description="Notify me when a Policy Shock regime is triggered"
                enabled={policyShockAlert?.enabled ?? false}
                onToggle={(enabled) => toggleAlert("policy_shock", enabled)}
                badge={<Badge variant="destructive" className="text-xs">High Priority</Badge>}
              />

              <AlertPresetRowWithThreshold
                id="trump_z_above"
                icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
                title="Trump Index Threshold"
                description="Notify me when the Trump Policy Index exceeds a Z-score threshold"
                enabled={trumpAlert?.enabled ?? false}
                onToggle={(enabled) => toggleAlert("trump_z_above", enabled)}
                threshold={(trumpAlert as any)?.threshold ?? 1.5}
                onThresholdChange={(value) => updateThreshold("trump_z_above", value)}
              />

              <AlertPresetRow
                id="fedspeak_change"
                icon={<MessageSquare className="h-5 w-5 text-green-500" />}
                title="Fed Tone Change"
                description="Notify me when the Federal Reserve's communication tone changes"
                enabled={fedspeakAlert?.enabled ?? false}
                onToggle={(enabled) => toggleAlert("fedspeak_change", enabled)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Data Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DataStatusBadge status="live" details="Alerts use live API data when available" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Alerts are evaluated every 5 minutes while the app is open. Each alert type has a 6-hour 
                debounce period to prevent repeated notifications for the same condition.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

interface AlertPresetRowProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  badge?: React.ReactNode;
}

function AlertPresetRow({ id, icon, title, description, enabled, onToggle, badge }: AlertPresetRowProps) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor={id} className="font-medium cursor-pointer">
              {title}
            </Label>
            {badge}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <Switch
        id={id}
        checked={enabled}
        onCheckedChange={onToggle}
        data-testid={`alert-toggle-${id.replace("_", "")}`}
      />
    </div>
  );
}

interface AlertPresetRowWithThresholdProps extends AlertPresetRowProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
}

function AlertPresetRowWithThreshold({
  id,
  icon,
  title,
  description,
  enabled,
  onToggle,
  threshold,
  onThresholdChange,
}: AlertPresetRowWithThresholdProps) {
  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <Label htmlFor={id} className="font-medium cursor-pointer">
              {title}
            </Label>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <Switch
          id={id}
          checked={enabled}
          onCheckedChange={onToggle}
          data-testid={`alert-toggle-${id.replace("_", "")}`}
        />
      </div>
      {enabled && (
        <div className="flex items-center gap-2 ml-8">
          <Label htmlFor={`${id}-threshold`} className="text-sm whitespace-nowrap">
            Threshold (σ):
          </Label>
          <Input
            id={`${id}-threshold`}
            type="number"
            step="0.1"
            min="0.5"
            max="3"
            value={threshold}
            onChange={(e) => onThresholdChange(parseFloat(e.target.value) || 1.5)}
            className="w-20"
            data-testid="alert-threshold-trump"
          />
          <span className="text-xs text-muted-foreground">
            Currently set to {threshold}σ
          </span>
        </div>
      )}
    </div>
  );
}
