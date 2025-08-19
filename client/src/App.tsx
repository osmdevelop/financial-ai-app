import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { DisclaimerBanner } from "@/components/layout/disclaimer-banner";
import { Sidebar } from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Portfolio from "@/pages/portfolio";
import Insights from "@/pages/insights";
import Headlines from "@/pages/headlines";
import Earnings from "@/pages/earnings";
import EconomicCalendar from "@/pages/economic-calendar";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/insights" component={Insights} />
      <Route path="/headlines" component={Headlines} />
      <Route path="/earnings" component={Earnings} />
      <Route path="/economic-calendar" component={EconomicCalendar} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="finance-tracker-theme">
        <TooltipProvider>
        <div className="min-h-screen bg-background">
          <DisclaimerBanner />
          <div className="flex h-[calc(100vh-3rem)] relative">
            <Sidebar />
            <div className="flex-1 min-w-0">
              <Router />
            </div>
          </div>
        </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
