import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buyShares, fetchCurrentUser, type BuyRequest, type Market } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

interface BuyDialogProps {
  market: Market | null;
  outcome: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BuyDialog({ market, outcome, open, onOpenChange }: BuyDialogProps) {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);

  const mutation = useMutation({
    mutationFn: (request: { marketId: number; data: BuyRequest }) =>
      buyShares(request.marketId, request.data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      // Refresh user data to update balance
      try {
        const updatedUser = await fetchCurrentUser();
        setUser(updatedUser);
      } catch {
        // Silently fail - balance will update on next page load
      }
      onOpenChange(false);
      setAmount("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!market || !amount || !user) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    mutation.mutate({
      marketId: market.id,
      data: {
        user_id: user.id,
        amount: numAmount,
        outcome,
      },
    });
  };

  const outcomeLabel = outcome ? "YES" : "NO";
  const outcomeColor = outcome ? "text-emerald-500" : "text-rose-500";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Buy <span className={outcomeColor}>{outcomeLabel}</span> Shares
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {market?.question}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
              autoFocus
            />
          </div>

          {/* Preview estimation */}
          {market && amount && parseFloat(amount) > 0 && (
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Price:</span>
                <span className="font-medium">
                  {((outcome ? market.prob_yes : market.prob_no) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Est. Shares:</span>
                <span className="font-medium tabular-nums">
                  ~{(parseFloat(amount) / (outcome ? market.prob_yes : market.prob_no)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {mutation.isError && (
            <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Failed to complete trade. Please try again.
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending || !amount}
              className={outcome ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}
            >
              {mutation.isPending ? "Processing..." : `Buy ${outcomeLabel}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
