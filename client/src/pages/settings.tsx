import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Key, Database, Palette, Bell } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Settings" 
        subtitle="Configure your portfolio tracker and API integrations"
      />
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          
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
                  <Badge variant="outline">System</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  The application automatically adapts to your system's dark/light mode preference.
                </p>
                <Button variant="outline" size="sm" disabled>
                  Coming Soon
                </Button>
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
    </div>
  );
}