import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Upload, 
  Eye, 
  EyeOff, 
  MoreHorizontal, 
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency, formatPercent, formatNumber, ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/ui/loading-skeleton";
import { useCommandPalette } from "@/components/ui/command-palette";
import type { ComputedPosition, Portfolio, Transaction } from "@shared/schema";

const createPortfolioSchema = z.object({
  name: z.string().min(1, "Portfolio name is required"),
  baseCurrency: z.string().default("USD"),
});

export default function PortfolioV2() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("holdings");
  const [showHidden, setShowHidden] = useState(false);
  const { toast } = useToast();
  const { setOpen: openCommandPalette, setCurrentPortfolioId } = useCommandPalette();

  // Fetch portfolios
  const { data: portfolios, isLoading: portfoliosLoading } = useQuery({
    queryKey: ["/api/portfolios"],
    queryFn: () => api.getPortfolios(),
  });

  // Auto-select first portfolio if available
  useEffect(() => {
    if (!selectedPortfolioId && portfolios && portfolios.length > 0) {
      setSelectedPortfolioId(portfolios[0].id);
    }
  }, [portfolios, selectedPortfolioId]);

  // Update global portfolio context when portfolio changes
  useEffect(() => {
    if (selectedPortfolioId) {
      setCurrentPortfolioId(selectedPortfolioId);
    }
  }, [selectedPortfolioId, setCurrentPortfolioId]);

  // Fetch computed positions
  const { data: positions = [], isLoading: positionsLoading } = useQuery({
    queryKey: ["/api/positions", selectedPortfolioId, showHidden],
    queryFn: () => api.getComputedPositions(selectedPortfolioId),
    enabled: !!selectedPortfolioId,
  });

  // Fetch transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", selectedPortfolioId],
    queryFn: () => api.getTransactions(selectedPortfolioId),
    enabled: !!selectedPortfolioId,
  });

  const createPortfolioForm = useForm({
    resolver: zodResolver(createPortfolioSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD",
    },
  });

  // Import/Export handlers
  const handleUploadCSV = () => {
    toast({
      title: "Feature Coming Soon",
      description: "CSV import functionality will be available in a future update.",
    });
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Date,Symbol,Side,Quantity,Price,Fee,Note\n2025-01-20,AAPL,buy,10,150.00,9.99,Example transaction";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'portfolio_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportTransactions = () => {
    if (!selectedPortfolioId) {
      toast({
        title: "No Portfolio Selected",
        description: "Please select a portfolio to export transactions.",
        variant: "destructive",
      });
      return;
    }
    
    const csvContent = transactions.length > 0 
      ? "Date,Symbol,Side,Quantity,Price,Fee,Note\n" + 
        transactions.map(t => 
          `${t.occurredAt},${t.symbol},${t.side},${t.quantity},${t.price || ''},${t.fee || ''},${t.note || ''}`
        ).join('\n')
      : "Date,Symbol,Side,Quantity,Price,Fee,Note\nNo transactions to export";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${selectedPortfolio?.name || 'portfolio'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${transactions.length} transactions.`,
    });
  };

  const handleExportPositions = () => {
    if (!selectedPortfolioId) {
      toast({
        title: "No Portfolio Selected",
        description: "Please select a portfolio to export positions.",
        variant: "destructive",
      });
      return;
    }
    
    const csvContent = positions.length > 0
      ? "Symbol,Asset Type,Quantity,Avg Cost,Last Price,Value,Unrealized P&L,Realized P&L\n" +
        positions.map(p => 
          `${p.symbol},${p.assetType},${p.quantity},${p.avgCost || ''},${p.lastPrice || ''},${p.value || ''},${p.unrealizedPnl || ''},${p.realizedPnl || ''}`
        ).join('\n')
      : "Symbol,Asset Type,Quantity,Avg Cost,Last Price,Value,Unrealized P&L,Realized P&L\nNo positions to export";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `positions_${selectedPortfolio?.name || 'portfolio'}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Export Complete",
      description: `Exported ${positions.length} positions.`,
    });
  };

  const createPortfolioMutation = useMutation({
    mutationFn: api.createPortfolio,
    onSuccess: (portfolio) => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      setSelectedPortfolioId(portfolio.id);
      setIsCreateModalOpen(false);
      createPortfolioForm.reset();
      toast({
        title: "Portfolio created",
        description: `${portfolio.name} has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create portfolio",
        description: "Please try again later.",
        variant: "destructive",
      });
    },
  });

  // Calculate portfolio summary
  const portfolioSummary = positions.reduce(
    (acc, position) => {
      const value = position.value || 0;
      const unrealizedPnl = position.unrealizedPnl || 0;
      const realizedPnl = position.realizedPnl || 0;
      
      acc.totalValue += value;
      acc.totalUnrealized += unrealizedPnl;
      acc.totalRealized += realizedPnl;
      acc.positionCount += 1;
      
      return acc;
    },
    { totalValue: 0, totalUnrealized: 0, totalRealized: 0, positionCount: 0 }
  );

  const selectedPortfolio = portfolios?.find(p => p.id === selectedPortfolioId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Portfolio 2.0" 
        subtitle="Full asset management with transaction-based tracking"
        portfolioId={selectedPortfolioId}
      />
      
      <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6">
        {/* Portfolio Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select Portfolio" />
                </SelectTrigger>
                <SelectContent>
                  {portfolios?.map((portfolio) => (
                    <SelectItem key={portfolio.id} value={portfolio.id}>
                      {portfolio.name} ({portfolio.baseCurrency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    New Portfolio
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Portfolio</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={createPortfolioForm.handleSubmit((data) => createPortfolioMutation.mutate(data))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Portfolio Name</Label>
                        <Input
                          id="name"
                          {...createPortfolioForm.register("name")}
                          placeholder="My Investment Portfolio"
                        />
                        {createPortfolioForm.formState.errors.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {createPortfolioForm.formState.errors.name.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="baseCurrency">Base Currency</Label>
                        <Select
                          value={createPortfolioForm.watch("baseCurrency")}
                          onValueChange={(value) => createPortfolioForm.setValue("baseCurrency", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button type="submit" disabled={createPortfolioMutation.isPending} className="w-full">
                        {createPortfolioMutation.isPending ? "Creating..." : "Create Portfolio"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Button onClick={() => openCommandPalette(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>

          {/* Portfolio KPIs */}
          {selectedPortfolio && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Value</p>
                      <p className="text-lg font-semibold">{formatCurrency(portfolioSummary.totalValue)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    {portfolioSummary.totalUnrealized >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                      <p className={`text-lg font-semibold ${portfolioSummary.totalUnrealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {portfolioSummary.totalUnrealized >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalUnrealized)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Realized P&L</p>
                      <p className={`text-lg font-semibold ${portfolioSummary.totalRealized >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {portfolioSummary.totalRealized >= 0 ? '+' : ''}{formatCurrency(portfolioSummary.totalRealized)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Positions</p>
                      <p className="text-lg font-semibold">{portfolioSummary.positionCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="import-export">Import/Export</TabsTrigger>
          </TabsList>

          {/* Holdings Tab */}
          <TabsContent value="holdings" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle>Holdings</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowHidden(!showHidden)}
                    >
                      {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showHidden ? "Hide Archived" : "Show Archived"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Asset
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                          Avg Cost
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          Last Price
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Value
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Unrealized P&L
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Realized P&L
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {positionsLoading ? (
                        Array.from({ length: 3 }).map((_, index) => (
                          <TableRowSkeleton key={index} />
                        ))
                      ) : positions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 sm:px-6 py-8 text-center text-muted-foreground">
                            No positions found. Use the "Add Asset" button to get started.
                          </td>
                        </tr>
                      ) : (
                        positions.map((position) => (
                          <tr key={position.symbol} className="hover:bg-muted/50">
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center text-xs sm:text-sm font-bold">
                                  {position.symbol.charAt(0)}
                                </div>
                                <div>
                                  <div className="text-sm font-medium text-foreground">{position.symbol}</div>
                                  <Badge className={`text-xs ${ASSET_TYPE_COLORS[position.assetType as keyof typeof ASSET_TYPE_COLORS]}`}>
                                    {ASSET_TYPE_LABELS[position.assetType as keyof typeof ASSET_TYPE_LABELS]}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                              <div className="sm:hidden text-xs text-muted-foreground">Qty</div>
                              {formatNumber(position.quantity, position.assetType === "crypto" ? 6 : 2)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-foreground hidden sm:table-cell">
                              {formatCurrency(position.avgCost)}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-foreground hidden md:table-cell">
                              {position.lastPrice ? formatCurrency(position.lastPrice) : "N/A"}
                            </td>
                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-foreground">
                              <div className="sm:hidden text-xs text-muted-foreground">Value</div>
                              {position.value ? formatCurrency(position.value) : "N/A"}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                              (position.unrealizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {position.unrealizedPnl !== undefined ? (
                                <>
                                  {position.unrealizedPnl >= 0 ? '+' : ''}{formatCurrency(position.unrealizedPnl)}
                                  {position.unrealizedPnlPercent !== undefined && (
                                    <div className="text-xs">
                                      ({position.unrealizedPnlPercent >= 0 ? '+' : ''}{formatPercent(position.unrealizedPnlPercent)})
                                    </div>
                                  )}
                                </>
                              ) : "N/A"}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                              (position.realizedPnl || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {position.realizedPnl !== undefined ? (
                                `${position.realizedPnl >= 0 ? '+' : ''}${formatCurrency(position.realizedPnl)}`
                              ) : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                                <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                                  Buy
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs px-2 py-1">
                                  Sell
                                </Button>
                                <Button size="sm" variant="ghost" className="p-1">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle>Transaction History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                          Date
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Asset
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Side
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                          Quantity
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                          Price
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-3 sm:px-6 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {transactionsLoading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                          <TableRowSkeleton key={index} />
                        ))
                      ) : transactions.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 sm:px-6 py-8 text-center text-muted-foreground">
                            No transactions found.
                          </td>
                        </tr>
                      ) : (
                        transactions.map((transaction) => {
                          const total = transaction.price && transaction.quantity ? 
                            parseFloat(transaction.price) * parseFloat(transaction.quantity) + (parseFloat(transaction.fee || "0")) : 0;
                          
                          return (
                            <tr key={transaction.id} className="hover:bg-muted/50">
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-foreground hidden sm:table-cell">
                                {new Date(transaction.occurredAt).toLocaleDateString()}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                  <span className="text-sm font-medium">{transaction.symbol}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge className={`text-xs ${ASSET_TYPE_COLORS[transaction.assetType as keyof typeof ASSET_TYPE_COLORS]}`}>
                                      {ASSET_TYPE_LABELS[transaction.assetType as keyof typeof ASSET_TYPE_LABELS]}
                                    </Badge>
                                    <span className="sm:hidden text-xs text-muted-foreground">
                                      {new Date(transaction.occurredAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                <Badge variant={transaction.side === 'buy' ? 'default' : 'secondary'} className="text-xs">
                                  {transaction.side.toUpperCase()}
                                </Badge>
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-foreground hidden md:table-cell">
                                {formatNumber(parseFloat(transaction.quantity), transaction.assetType === "crypto" ? 6 : 2)}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-foreground hidden lg:table-cell">
                                {transaction.price ? formatCurrency(parseFloat(transaction.price)) : "N/A"}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                                <div className="md:hidden text-xs text-muted-foreground mb-1">Total</div>
                                {total > 0 ? formatCurrency(total) : "N/A"}
                              </td>
                              <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center">
                                <Button size="sm" variant="ghost" className="p-1">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Import/Export Tab */}
          <TabsContent value="import-export" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Import Transactions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with transaction data to bulk import into your portfolio.
                  </p>
                  <Button className="w-full" onClick={handleUploadCSV}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleDownloadTemplate}>
                    <Download className="mr-2 h-4 w-4" />
                    Download Template
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Export Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Export your transaction history and current positions for backup or analysis.
                  </p>
                  <Button className="w-full" onClick={handleExportTransactions}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Transactions
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleExportPositions}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Positions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}