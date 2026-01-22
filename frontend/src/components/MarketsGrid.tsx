import { MarketCard } from "@/components/MarketCard";
import { Button } from "@/components/ui/button";
import { fetchMarkets, type Market } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BuyDialog } from "./BuyDialog";

export function MarketsGrid() {
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
