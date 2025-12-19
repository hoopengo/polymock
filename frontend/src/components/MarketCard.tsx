import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Market } from "@/lib/api";

interface MarketCardProps {
  market: Market;
  onBuy: (market: Market, outcome: boolean) => void;
}

export function MarketCard({ market, onBuy }: MarketCardProps) {
  const { question, description, prob_yes, prob_no, is_resolved, outcome, end_date } = market;

  // Format probability as percentage
  const yesPercent = (prob_yes * 100).toFixed(1);
  const noPercent = (prob_no * 100).toFixed(1);

  // Format end date
  const formattedEndDate = new Date(end_date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1">
      <CardHeader>
        <CardTitle className="line-clamp-2 text-lg font-semibold leading-snug">
          {question}
        </CardTitle>
        <CardDescription className="line-clamp-2 mt-1">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Probability Display */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Probability</span>
            <span className="font-medium tabular-nums text-emerald-500">
              {yesPercent}% YES
            </span>
          </div>

          {/* Visual probability bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-rose-500/20">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${yesPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Ends: {formattedEndDate}</span>
            {is_resolved && (
              <span className={`font-medium ${outcome ? "text-emerald-500" : "text-rose-500"}`}>
                Resolved: {outcome ? "YES" : "NO"}
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="gap-3 pt-4">
        <Button
          onClick={() => onBuy(market, true)}
          disabled={is_resolved}
          className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Buy YES
          <span className="ml-1 text-xs opacity-75">{yesPercent}%</span>
        </Button>
        <Button
          onClick={() => onBuy(market, false)}
          disabled={is_resolved}
          variant="outline"
          className="flex-1 border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white font-semibold transition-all"
        >
          Buy NO
          <span className="ml-1 text-xs opacity-75">{noPercent}%</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default MarketCard;
