import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { insertTransactionSchema, type AssetSearchResult, type TransactionSide } from "@shared/schema";
import { z } from "zod";

const transactionFormSchema = insertTransactionSchema.extend({
  occurredAt: z.date(),
  price: z.string().optional().transform(val => val || undefined),
  fee: z.string().optional().transform(val => val || undefined),
});

type TransactionFormData = z.infer<typeof transactionFormSchema>;

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetSearchResult | null;
  portfolioId: string;
}

const TRANSACTION_SIDES: { value: TransactionSide; label: string; description: string }[] = [
  { value: "buy", label: "Buy", description: "Purchase shares/tokens" },
  { value: "sell", label: "Sell", description: "Sell shares/tokens" },
  { value: "transfer_in", label: "Transfer In", description: "Receive from external account" },
  { value: "transfer_out", label: "Transfer Out", description: "Send to external account" },
  { value: "airdrop", label: "Airdrop", description: "Free tokens received" },
  { value: "fee", label: "Fee", description: "Transaction or management fee" },
  { value: "dividend", label: "Dividend", description: "Dividend payment received" },
];

export function TransactionModal({ open, onOpenChange, asset, portfolioId }: TransactionModalProps) {
  const [date, setDate] = useState<Date>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      portfolioId,
      side: "buy",
      occurredAt: new Date(),
      quantity: "",
      price: "",
      fee: "",
      note: "",
    },
  });

  const side = watch("side");
  const quantity = watch("quantity");
  const price = watch("price");
  const fee = watch("fee");

  // Calculate totals
  const subtotal = quantity && price ? parseFloat(quantity) * parseFloat(price) : 0;
  const feeAmount = fee ? parseFloat(fee) : 0;
  const total = subtotal + (side === "buy" ? feeAmount : -feeAmount);

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: (data: TransactionFormData) => {
      const payload = {
        ...data,
        portfolioId,
        symbol: asset?.symbol || "",
        assetType: asset?.assetType || "equity",
        occurredAt: data.occurredAt.toISOString(),
        price: data.price || null,
        fee: data.fee || null,
        note: data.note || null,
      };
      return api.createTransaction(payload as any);
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolios"] });
      
      toast({
        title: "Transaction added",
        description: `${side} transaction for ${asset?.symbol} has been recorded.`,
      });
      
      onOpenChange(false);
      reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    createTransactionMutation.mutate(data);
  };

  // Reset form when modal closes
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      reset();
      setDate(undefined);
    }
  };

  // Update form when asset changes
  useEffect(() => {
    if (asset && open) {
      setValue("symbol", asset.symbol);
      setValue("assetType", asset.assetType as any);
      if (asset.lastPrice) {
        setValue("price", asset.lastPrice.toString());
      }
    }
  }, [asset, open, setValue]);

  const getAssetTypeColor = (assetType: string) => {
    switch (assetType) {
      case "equity": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "etf": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "crypto": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
              {asset.symbol.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span>{asset.symbol}</span>
                <Badge 
                  variant="secondary" 
                  className={`text-xs ${getAssetTypeColor(asset.assetType)}`}
                >
                  {asset.assetType.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-normal">
                Add Transaction
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="side">Transaction Type</Label>
            <Select 
              value={side} 
              onValueChange={(value) => setValue("side", value as TransactionSide)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_SIDES.map((sideOption) => (
                  <SelectItem key={sideOption.value} value={sideOption.value}>
                    <div>
                      <div className="font-medium">{sideOption.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {sideOption.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              step="any"
              placeholder="0.00"
              {...register("quantity")}
            />
            {errors.quantity && (
              <p className="text-sm text-red-600">{errors.quantity.message}</p>
            )}
          </div>

          {/* Price (conditional) */}
          {side !== "airdrop" && (
            <div className="space-y-2">
              <Label htmlFor="price">Price per Share/Token (USD)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="price"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  className="pl-9"
                  {...register("price")}
                />
              </div>
              {errors.price && (
                <p className="text-sm text-red-600">{errors.price.message}</p>
              )}
            </div>
          )}

          {/* Fee */}
          <div className="space-y-2">
            <Label htmlFor="fee">Fee (USD) - Optional</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="fee"
                type="number"
                step="any"
                placeholder="0.00"
                className="pl-9"
                {...register("fee")}
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(newDate) => {
                    setDate(newDate);
                    if (newDate) {
                      setValue("occurredAt", newDate);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note - Optional</Label>
            <Textarea
              id="note"
              placeholder="Add a note about this transaction..."
              className="resize-none"
              rows={2}
              {...register("note")}
            />
          </div>

          {/* Transaction Summary */}
          {subtotal > 0 && (
            <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {feeAmount > 0 && (
                <div className="flex justify-between">
                  <span>Fee:</span>
                  <span>${feeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={createTransactionMutation.isPending}
          >
            {createTransactionMutation.isPending ? "Adding..." : "Add Transaction"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}