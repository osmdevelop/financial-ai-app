import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/providers/theme-provider";
import { Settings as SettingsIcon, Key, Database, Palette, Bell, Monitor, Moon, Sun, Target } from "lucide-react";
import { useFocusAssets } from "@/hooks/useFocusAssets";
import { AssetPickerModal } from "@/components/trader-lens/AssetPickerModal";

export default function Settings() {
  const { theme, setTheme, actualTheme } = useTheme();
  const [pickerOpen, setPickerOpen] = useState(false);
  const { focusAssets, maxAssets } = useFocusAssets();

  const getThemeIcon = (themeValue: string) => {
    switch (themeValue) {
      case "light": return <Sun className="h-4 w-4" />;
      case "dark": return <Moon className="h-4 w-4" />;
      case "system": return <Monitor className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = (themeValue: string) => {
    switch (themeValue) {
      case "light": return "Light";
      case "dark": return "Dark";
      case "system": return `System (${actualTheme === "dark" ? "Dark" : "Light"})`;;
      default: return "System";
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Settings" 
        subtitle="Configure your portfolio tracker and API integrations"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Trader Lens Section */}
          <Card data-testid="settings-trader-lens">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Trader Lens
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Focus Assets</h3>
                  <Badge variant="secondary">
                    {focusAssets.length}/{maxAssets}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Personalize your market view by selecting up to {maxAssets} focus assets. 
                  The app will adapt headlines, insights, and daily briefs to prioritize these assets.
                </p>
                {focusAssets.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {focusAssets.map((asset) => (
                      <Badge key={asset.id} variant="outline" data-testid={`settings-asset-${asset.symbol}`}>
                        {asset.symbol}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPickerOpen(true)}
                  data-testid="manage-focus-assets-btn"
                >
                  Manage Focus Assets
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* API Keys Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Integrations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">OpenAI API</h3>
                    <Badge variant="secondary">
                      Configured
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Powers AI insights, market sentiment analysis, and earnings predictions.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Configured
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">NewsAPI</h3>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Fetches live market headlines and news articles.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Configure
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Trading Economics</h3>
                    <Badge variant="outline">Optional</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Provides economic calendar and macro indicators.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Configure
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">Yahoo Finance</h3>
                    <Badge variant="secondary">Built-in</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Free price data for stocks, ETFs, and crypto via yfinance.
                  </p>
                  <Button variant="outline" size="sm" disabled>
                    Active
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Storage Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Data Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Storage Mode</h3>
                  <Badge variant="secondary">In-Memory</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Currently using in-memory storage for demo purposes. Data resets on server restart.
                </p>
                <p className="text-xs text-muted-foreground">
                  PostgreSQL database is configured but not active. Contact your administrator to enable persistent storage.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Theme</h3>
                  <div className="flex items-center gap-2">
                    {getThemeIcon(theme)}
                    <Badge variant="outline">{getThemeLabel(theme)}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Choose your preferred theme or let the system decide automatically.
                </p>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        System
                      </div>
                    </SelectItem>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4" />
                        Light
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="h-4 w-4" />
                        Dark
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">Price Alerts</h3>
                  <Badge variant="outline">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Get notified when your portfolio holdings reach target prices or significant changes occur.
                </p>
                <Button variant="outline" size="sm" disabled>
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                Application Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span>1.0.0-beta</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Build</span>
                  <span>Development</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Environment</span>
                  <span>Replit Workspace</span>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-medium text-sm mb-2">Disclaimer</h4>
                <p className="text-xs text-muted-foreground">
                  This application is for informational purposes only and does not constitute investment advice. 
                  All price data and analysis are provided for educational and research purposes. 
                  Please consult with a qualified financial advisor before making investment decisions.
                </p>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>

      <AssetPickerModal open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}