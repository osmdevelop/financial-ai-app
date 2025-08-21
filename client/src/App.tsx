import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette, CommandPaletteProvider, useCommandPalette } from "@/components/ui/command-palette";
import { AssetSheetModal } from "@/components/ui/asset-sheet-modal";
import { TransactionModal } from "@/components/ui/transaction-modal";
import type { AssetSearchResult } from "@shared/schema";
import Dashboard from "@/pages/dashboard";
import Portfolio from "@/pages/portfolio";
import PortfolioV2 from "@/pages/portfolio-v2";
import Insights from "@/pages/insights";
import Headlines from "@/pages/headlines";
import Earnings from "@/pages/earnings";
import EconomicCalendar from "@/pages/economic-calendar";
import Sentiment from "@/pages/sentiment";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/portfolio" component={PortfolioV2} />
      <Route path="/portfolio-v1" component={Portfolio} />
      <Route path="/insights" component={Insights} />
      <Route path="/headlines" component={Headlines} />
      <Route path="/earnings" component={Earnings} />
      <Route path="/economic-calendar" component={EconomicCalendar} />
      <Route path="/sentiment" component={Sentiment} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [selectedAsset, setSelectedAsset] = useState<AssetSearchResult | null>(null);
  const [showAssetSheet, setShowAssetSheet] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen, currentPortfolioId, setCurrentPortfolioId } = useCommandPalette();

  const handleAssetSelect = (asset: AssetSearchResult) => {
    setSelectedAsset(asset);
    setShowAssetSheet(true);
  };

  const handleAddTransaction = (asset: AssetSearchResult, portfolioId?: string) => {
    setSelectedAsset(asset);
    if (portfolioId) setCurrentPortfolioId(portfolioId);
    setShowTransactionModal(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex flex-1 relative">
        <Sidebar />
        <div className="flex-1 min-w-0">
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
        onAddTransaction={handleAddTransaction}
        portfolioId={currentPortfolioId}
      />
      
      {/* Transaction Modal */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        asset={selectedAsset}
        portfolioId={currentPortfolioId}
        onPortfolioIdChange={setCurrentPortfolioId}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="finance-tracker-theme">
        <TooltipProvider>
          <CommandPaletteProvider>
            <AppContent />
          </CommandPaletteProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
