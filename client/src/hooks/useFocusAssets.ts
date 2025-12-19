import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { FocusAsset, InsertFocusAsset } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useFocusAssets() {
  const { toast } = useToast();

  const query = useQuery<{ items: FocusAsset[]; max: number }, Error>({
    queryKey: ["/api/focus-assets"],
    queryFn: () => api.getFocusAssets(),
    staleTime: 30 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (data: InsertFocusAsset) => api.addFocusAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-assets"] });
      toast({
        title: "Asset added",
        description: "Asset added to your focus list.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add asset",
        description: error?.message || "Could not add asset to focus list.",
        variant: "destructive",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (symbol: string) => api.removeFocusAsset(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/focus-assets"] });
      toast({
        title: "Asset removed",
        description: "Asset removed from your focus list.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove asset",
        description: "Could not remove asset from focus list.",
        variant: "destructive",
      });
    },
  });

  return {
    focusAssets: query.data?.items ?? [],
    maxAssets: query.data?.max ?? 5,
    isLoading: query.isLoading,
    error: query.error,
    addAsset: addMutation.mutate,
    removeAsset: removeMutation.mutate,
    isAdding: addMutation.isPending,
    isRemoving: removeMutation.isPending,
    refetch: query.refetch,
  };
}
