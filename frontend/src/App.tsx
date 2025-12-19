import { MarketCard } from "@/components/MarketCard";
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
import { buyShares, fetchMarkets, type BuyRequest, type Market } from "@/lib/api";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// ============================================================
// Query Client
// ============================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: true,
    },
  },
});

// ============================================================
// Buy Dialog Component
// ============================================================

interface BuyDialogProps {
  market: Market | null;
  outcome: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function BuyDialog({ market, outcome, open, onOpenChange }: BuyDialogProps) {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (request: { marketId: number; data: BuyRequest }) =>
      buyShares(request.marketId, request.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      onOpenChange(false);
      setAmount("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!market || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    mutation.mutate({
      marketId: market.id,
      data: {
        user_id: 1, // Hardcoded for demo; replace with actual user context
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

// ============================================================
// Markets Grid Component
// ============================================================

function MarketsGrid() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    market: Market | null;
    outcome: boolean;
  }>({
    open: false,
    market: null,
    outcome: true,
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
  });

  const handleBuy = (market: Market, outcome: boolean) => {
    setDialogState({ open: true, market, outcome });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading markets...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-destructive">Failed to load markets</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {error instanceof Error ? error.message : "Unknown error occurred"}
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  const markets = data?.markets ?? [];

  if (markets.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">No markets yet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Check back later for prediction markets.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {markets.map((market) => (
          <MarketCard key={market.id} market={market} onBuy={handleBuy} />
        ))}
      </div>

      <BuyDialog
        market={dialogState.market}
        outcome={dialogState.outcome}
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((prev) => ({ ...prev, open }))}
      />
    </>
  );
}

// ============================================================
// App Component
// ============================================================

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📈</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                PolyMOCK
              </h1>
            </div>
            <nav className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Prediction Market
              </span>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold tracking-tight">Markets</h2>
            <p className="text-muted-foreground mt-2">
              Trade on the outcomes of real-world events
            </p>
          </div>

          <MarketsGrid />
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 mt-auto">
          <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
            <p>© 2024 PolyMOCK. Prediction Market Demo.</p>
          </div>
        </footer>
      </div>
    </QueryClientProvider>
  );
}

export default App;