import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Download, Upload, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { formatCurrency, formatPercent, formatNumber, ASSET_TYPE_COLORS, ASSET_TYPE_LABELS } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";

const createPortfolioSchema = z.object({
  name: z.string().min(1, "Portfolio name is required"),
  baseCurrency: z.string().default("USD"),
});

const csvUploadSchema = z.object({
  file: z.instanceof(FileList).refine((files) => files.length > 0, "Please select a CSV file"),
});

export default function Portfolio() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { toast } = useToast();

  const { data: portfolios, isLoading: portfoliosLoading } = useQuery({
    queryKey: ["/api/portfolios"],
    queryFn: () => api.getPortfolios(),
  });

  const { data: portfolioData, isLoading: portfolioLoading } = useQuery({
    queryKey: ["/api/portfolios", selectedPortfolioId],
    queryFn: () => api.getPortfolioDetails(selectedPortfolioId),
    enabled: !!selectedPortfolioId,
  });

  // Auto-select first portfolio if available
  if (!selectedPortfolioId && portfolios && portfolios.length > 0) {
    setSelectedPortfolioId(portfolios[0].id);
  }

  const createPortfolioForm = useForm({
    resolver: zodResolver(createPortfolioSchema),
    defaultValues: {
      name: "",
      baseCurrency: "USD",
    },
  });

  const uploadForm = useForm({
    resolver: zodResolver(csvUploadSchema),
  });

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

  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File }) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const csv = e.target?.result as string;
            const lines = csv.split('\n').filter(line => line.trim());
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            
            const positions = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim());
              const position: any = {};
              
              headers.forEach((header, index) => {
                position[header] = values[index];
              });
              
              return {
                symbol: position.symbol?.toUpperCase() || "",
                quantity: position.quantity || "0",
                avgCost: position.avgcost || position.avg_cost || "0",
                assetType: position.assettype || position.asset_type || "equity",
              };
            }).filter(p => p.symbol && p.quantity && p.avgCost);

            const result = await api.uploadPositions(selectedPortfolioId, positions);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = reject;
        reader.readAsText(data.file);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios", selectedPortfolioId] });
      setIsUploadModalOpen(false);
      uploadForm.reset();
      toast({
        title: "Positions uploaded",
        description: "Your positions have been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to upload positions",
        description: "Please check your CSV format and try again.",
        variant: "destructive",
      });
    },
  });

  const downloadTemplate = () => {
    const template = `symbol,quantity,avgCost,assetType
AAPL,10,180.00,equity
SPY,5,500.00,etf
BTC-USD,0.05,60000.00,crypto`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'portfolio-template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const positions = portfolioData?.positions || [];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header 
        title="Portfolio Management" 
        subtitle="Manage your positions and upload new data"
        portfolioId={selectedPortfolioId}
      />
      
      <main className="flex-1 overflow-y-auto p-6">
        {/* Portfolio Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Portfolio Management</h3>
              <p className="text-sm text-muted-foreground">Manage your positions and upload new data</p>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
              <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!selectedPortfolioId}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upload CSV File</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={uploadForm.handleSubmit((data) => uploadMutation.mutate({ file: data.file[0] }))}>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="csv-file">CSV File</Label>
                        <Input
                          id="csv-file"
                          type="file"
                          accept=".csv"
                          {...uploadForm.register("file")}
                        />
                        {uploadForm.formState.errors.file && (
                          <p className="text-sm text-danger mt-1">
                            {uploadForm.formState.errors.file.message?.toString()}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expected columns: symbol, quantity, avgCost, assetType
                      </p>
                      <Button type="submit" disabled={uploadMutation.isPending} className="w-full">
                        {uploadMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Portfolio Selector */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Label htmlFor="portfolio-select" className="text-sm font-medium text-foreground">
                    Select Portfolio:
                  </Label>
                  <Select value={selectedPortfolioId} onValueChange={setSelectedPortfolioId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Choose portfolio" />
                    </SelectTrigger>
                    <SelectContent>
                      {portfolios?.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="bg-success text-success-foreground hover:bg-success/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Portfolio
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
                            placeholder="Enter portfolio name"
                          />
                          {createPortfolioForm.formState.errors.name && (
                            <p className="text-sm text-danger mt-1">
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
            </CardContent>
          </Card>
        </div>

        {/* Positions Table */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-foreground">Current Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Symbol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Avg Cost
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Last Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      P&L ($)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      P&L (%)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {portfolioLoading ? (
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRowSkeleton key={index} />
                    ))
                  ) : positions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                        No positions found. Upload a CSV file to get started.
                      </td>
                    </tr>
                  ) : (
                    positions.map((position) => (
                      <tr key={position.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-foreground">{position.symbol}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={ASSET_TYPE_COLORS[position.assetType as keyof typeof ASSET_TYPE_COLORS]}>
                            {ASSET_TYPE_LABELS[position.assetType as keyof typeof ASSET_TYPE_LABELS]}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                          {formatNumber(parseFloat(position.quantity), position.assetType === "crypto" ? 6 : 2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                          {formatCurrency(parseFloat(position.avgCost))}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-foreground">
                          {position.lastPrice ? formatCurrency(position.lastPrice) : "N/A"}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          (position.pnlAmount || 0) >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {position.pnlAmount ? (
                            `${position.pnlAmount >= 0 ? '+' : ''}${formatCurrency(position.pnlAmount)}`
                          ) : "N/A"}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          (position.pnlPercent || 0) >= 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {position.pnlPercent ? (
                            `${position.pnlPercent >= 0 ? '+' : ''}${formatPercent(position.pnlPercent)}`
                          ) : "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
