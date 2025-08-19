import { Button } from "@/components/ui/button";
import { RefreshCw, User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle: string;
  portfolioId?: string;
}

export function Header({ title, subtitle, portfolioId }: HeaderProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefreshPrices = async () => {
    if (!portfolioId) {
      toast({
        title: "No portfolio selected",
        description: "Please select a portfolio to refresh prices.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await api.refreshPrices(portfolioId);
      
      // Invalidate cache to refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      
      toast({
        title: "Prices refreshed",
        description: `Updated ${result.pricesUpdated} prices successfully.`,
      });
    } catch (error) {
      toast({
        title: "Failed to refresh prices",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <header className="bg-card shadow-sm border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 md:flex-none">
          <h2 className="text-xl md:text-2xl font-bold text-foreground truncate">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 hidden sm:block">{subtitle}</p>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          {portfolioId && (
            <Button 
              onClick={handleRefreshPrices}
              disabled={isRefreshing}
              size={"sm"}
              className="bg-primary text-primary-foreground hover:bg-primary/90 hidden sm:flex"
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              <span className="hidden md:inline">{isRefreshing ? "Refreshing..." : "Refresh Prices"}</span>
              <span className="md:hidden">Refresh</span>
            </Button>
          )}
          {portfolioId && (
            <Button 
              onClick={handleRefreshPrices}
              disabled={isRefreshing}
              size={"icon"}
              variant="outline"
              className="sm:hidden"
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="text-muted-foreground text-sm" />
            </div>
            <span className="text-sm text-foreground font-medium hidden sm:inline">Demo User</span>
          </div>
        </div>
      </div>
    </header>
  );
}
