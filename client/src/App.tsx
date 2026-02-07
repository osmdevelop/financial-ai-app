import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DataModeProvider } from "@/components/providers/data-mode-provider";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette, CommandPaletteProvider, useCommandPalette } from "@/components/ui/command-palette";
import { AssetSheetModal } from "@/components/ui/asset-sheet-modal";
import type { AssetSearchResult } from "@shared/schema";
import Dashboard from "@/pages/dashboard";
import Insights from "@/pages/insights";
import NewsStream from "@/pages/news";
import Earnings from "@/pages/earnings";
import Calendar from "@/pages/calendar";
import Sentiment from "@/pages/sentiment";
import AssetOverview from "@/pages/asset-overview";
import MarketRecap from "@/pages/market-recap";
import Policy from "@/pages/policy";
import Scenario from "@/pages/scenario";
import Settings from "@/pages/settings";
import DailyBrief from "@/pages/daily-brief";
import Watchlist from "@/pages/watchlist";
import Alerts from "@/pages/alerts";
import Notifications from "@/pages/notifications";
import History from "@/pages/history";
import Product from "@/pages/product";
import Pricing from "@/pages/pricing";
import NotFound from "@/pages/not-found";
import { startAlertEvaluator } from "@/services/alertEvaluator";

// Redirect legacy routes
function PortfolioRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/dashboard");
  }, [setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={DailyBrief} />
      <Route path="/daily-brief" component={DailyBrief} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/portfolio" component={PortfolioRedirect} />
      <Route path="/portfolio-v1" component={PortfolioRedirect} />
      <Route path="/insights" component={Insights} />
      <Route path="/news" component={NewsStream} />
      <Route path="/headlines" component={NewsStream} />
      <Route path="/earnings" component={Earnings} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/economic-calendar" component={Calendar} />
      <Route path="/events" component={Calendar} />
      <Route path="/sentiment" component={Sentiment} />
      <Route path="/asset-overview" component={AssetOverview} />
      <Route path="/market-recap" component={MarketRecap} />
      <Route path="/policy" component={Policy} />
      <Route path="/scenario" component={Scenario} />
      <Route path="/watchlist" component={Watchlist} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/history" component={History} />
      <Route path="/product" component={Product} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [showAssetSheet, setShowAssetSheet] = useState(false);
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette();

  useEffect(() => {
    startAlertEvaluator();
  }, []);

  const handleAssetSelect = (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setShowAssetSheet(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <div className="flex-1 min-w-0 flex flex-col animate-fade-in">
          <Router />
        </div>
      </div>
      <DisclaimerBanner />
      <Toaster />
      
      {/* Global Command Palette */}
      <CommandPalette 
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onSelectAsset={handleAssetSelect}
      />
      
      {/* Asset Sheet Modal */}
      <AssetSheetModal
        open={showAssetSheet}
        onOpenChange={setShowAssetSheet}
        asset={selectedAsset}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="finance-tracker-theme">
        <DataModeProvider>
          <TooltipProvider>
            <CommandPaletteProvider>
              <AppContent />
            </CommandPaletteProvider>
          </TooltipProvider>
        </DataModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
