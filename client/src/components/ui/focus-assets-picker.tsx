import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CommandPalette } from "@/components/ui/command-palette";
import { Plus, X, GripVertical, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { FocusAssetWithDetails, AssetSearchResult } from "@shared/schema";

interface FocusAssetsPickerProps {
  portfolioId: string;
  className?: string;
}

export function FocusAssetsPicker({ portfolioId, className }: FocusAssetsPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current focus assets
  const { data: focusAssets = [], isLoading } = useQuery({
    queryKey: ["/api/focus-assets", portfolioId],
    queryFn: () => api.getFocusAssets(portfolioId),
    enabled: !!portfolioId,
  });

  // Search for assets to add
  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/search", searchTerm],
    queryFn: () => api.searchAssets(searchTerm, undefined, 10),
    enabled: searchTerm.length >= 2,
  });

  // Create focus asset mutation
  const createMutation = useMutation({
    mutationFn: api.createFocusAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-assets", portfolioId] });
      toast({
        title: "Focus asset added",
        description: "Asset added to your focus list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add asset",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  // Delete focus asset mutation
  const deleteMutation = useMutation({
    mutationFn: api.deleteFocusAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-assets", portfolioId] });
      toast({
        title: "Focus asset removed",
        description: "Asset removed from your focus list",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove asset",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Reorder focus assets mutation
  const reorderMutation = useMutation({
    mutationFn: api.reorderFocusAssets,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-assets", portfolioId] });
    },
  });

  const handleAddAsset = async (asset: AssetSearchResult) => {
    if (focusAssets.length >= 5) {
      toast({
        title: "Limit reached",
        description: "Remove one to add another (max 5)",
        variant: "destructive",
      });
      return;
    }

    await createMutation.mutateAsync({
      portfolioId,
      symbol: asset.symbol,
      assetType: asset.assetType,
      order: focusAssets.length,
    });

    setSearchTerm("");
  };

  const handleRemoveAsset = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId) return;

    const draggedIndex = focusAssets.findIndex(item => item.id === draggedItem);
    const targetIndex = focusAssets.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create reordered array
    const newOrder = [...focusAssets];
    const [draggedAsset] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedAsset);

    // Update order values
    const reorderItems = newOrder.map((asset, index) => ({
      id: asset.id,
      order: index
    }));

    reorderMutation.mutate(reorderItems);
    setDraggedItem(null);
  };

  const getPriceChangeIcon = (change: number | undefined) => {
    if (!change) return <Minus className="h-3 w-3 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    return <TrendingDown className="h-3 w-3 text-red-500" />;
  };

  const getPriceChangeColor = (change: number | undefined) => {
    if (!change) return "text-muted-foreground";
    return change > 0 ? "text-green-500" : "text-red-500";
  };

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Focus Assets</h3>
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 w-20 rounded bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Focus Assets</h3>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Focus Asset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
              
              {searchTerm.length >= 2 && (
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {searchResults.map((asset) => (
                    <Card
                      key={asset.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleAddAsset(asset)}
                    >
                      <CardContent className="p-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold">{asset.symbol}</div>
                            <div className="text-sm text-muted-foreground">{asset.name}</div>
                          </div>
                          <Badge variant="secondary">{asset.assetType}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {searchResults.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      No assets found
                    </div>
                  )}
                </div>
              )}
              
              {searchTerm.length < 2 && (
                <div className="text-center text-muted-foreground py-4">
                  Type at least 2 characters to search
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {focusAssets.length === 0 ? (
        <div className="text-center text-muted-foreground py-6 border-2 border-dashed rounded-lg">
          <div className="text-sm">No focus assets selected</div>
          <div className="text-xs mt-1">Add up to 5 assets to track</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {focusAssets
            .sort((a, b) => a.order - b.order)
            .map((asset) => (
              <Card
                key={asset.id}
                className="relative cursor-move hover:shadow-md transition-shadow"
                draggable
                onDragStart={(e) => handleDragStart(e, asset.id)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, asset.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        <span className="font-semibold text-sm truncate">{asset.symbol}</span>
                      </div>
                      
                      {asset.lastPrice && (
                        <div className="mt-1 text-sm text-muted-foreground">
                          ${asset.lastPrice.toFixed(2)}
                        </div>
                      )}
                      
                      {asset.changePercent24h !== undefined && (
                        <div className={`flex items-center gap-1 mt-1 text-xs ${getPriceChangeColor(asset.changePercent24h)}`}>
                          {getPriceChangeIcon(asset.changePercent24h)}
                          {asset.changePercent24h > 0 ? '+' : ''}{asset.changePercent24h.toFixed(1)}%
                        </div>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveAsset(asset.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {focusAssets.length}/5 focus assets selected
      </div>
    </div>
  );
}