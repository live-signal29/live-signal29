import { useState } from "react";
import { Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRiskCalculator } from "@/hooks/useRiskCalculator";

interface RiskCalculatorModalProps {
  defaultEntry?: string;
  defaultSL?: string;
  defaultTP?: string;
}

export const RiskCalculatorModal = ({
  defaultEntry = "",
  defaultSL = "",
  defaultTP = "",
}: RiskCalculatorModalProps) => {
  const [open, setOpen] = useState(false);
  const [accountBalance, setAccountBalance] = useState("");
  const [entryPrice, setEntryPrice] = useState(defaultEntry);
  const [stopLoss, setStopLoss] = useState(defaultSL);
  const [takeProfit, setTakeProfit] = useState(defaultTP);
  const [riskPercent, setRiskPercent] = useState("2");
  const [lotSize, setLotSize] = useState("");

  const { calculation, calculateRisk, resetCalculation } = useRiskCalculator();

  const handleCalculate = () => {
    if (!accountBalance || !entryPrice || !stopLoss) return;

    calculateRisk({
      accountBalance: parseFloat(accountBalance),
      entryPrice: parseFloat(entryPrice),
      stopLoss: parseFloat(stopLoss),
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      lotSize: lotSize ? parseFloat(lotSize) : undefined,
      riskPercentage: parseFloat(riskPercent) || 2,
    });
  };

  const handleReset = () => {
    setAccountBalance("");
    setEntryPrice(defaultEntry);
    setStopLoss(defaultSL);
    setTakeProfit(defaultTP);
    setRiskPercent("2");
    setLotSize("");
    resetCalculation();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-card border-border hover:bg-accent"
        >
          <Calculator className="h-4 w-4" />
          <span className="hidden sm:inline">Risk Calculator</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Calculator className="h-5 w-5 text-primary" />
            Risk Calculator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Account Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance" className="text-foreground">Account Balance ($)</Label>
            <Input
              id="balance"
              type="number"
              placeholder="10000"
              value={accountBalance}
              onChange={(e) => setAccountBalance(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Entry Price */}
          <div className="space-y-2">
            <Label htmlFor="entry" className="text-foreground">Entry Price</Label>
            <Input
              id="entry"
              type="number"
              step="0.00001"
              placeholder="1.08500"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Stop Loss */}
          <div className="space-y-2">
            <Label htmlFor="sl" className="text-foreground">Stop Loss</Label>
            <Input
              id="sl"
              type="number"
              step="0.00001"
              placeholder="1.08200"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Take Profit (optional) */}
          <div className="space-y-2">
            <Label htmlFor="tp" className="text-muted-foreground">Take Profit (optional)</Label>
            <Input
              id="tp"
              type="number"
              step="0.00001"
              placeholder="1.09000"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Risk Percentage */}
          <div className="space-y-2">
            <Label htmlFor="risk" className="text-foreground">Risk % per Trade</Label>
            <Input
              id="risk"
              type="number"
              step="0.5"
              placeholder="2"
              value={riskPercent}
              onChange={(e) => setRiskPercent(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Lot Size (optional override) */}
          <div className="space-y-2">
            <Label htmlFor="lot" className="text-muted-foreground">Lot Size (optional)</Label>
            <Input
              id="lot"
              type="number"
              step="0.01"
              placeholder="Auto-calculated"
              value={lotSize}
              onChange={(e) => setLotSize(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          {/* Calculate Button */}
          <div className="flex gap-2">
            <Button onClick={handleCalculate} className="flex-1">
              Calculate
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>

          {/* Results */}
          {calculation && (
            <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-3">
              <h4 className="font-semibold text-primary">Results</h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-2 rounded bg-background/50">
                  <p className="text-muted-foreground text-xs">Recommended Lot</p>
                  <p className="font-bold text-lg text-foreground">{calculation.recommendedLot}</p>
                </div>
                
                <div className="p-2 rounded bg-background/50">
                  <p className="text-muted-foreground text-xs">Risk Amount</p>
                  <p className="font-bold text-lg text-foreground">${calculation.riskAmount}</p>
                </div>
                
                <div className="p-2 rounded bg-background/50">
                  <p className="text-muted-foreground text-xs">Potential Loss</p>
                  <p className="font-bold text-destructive">${calculation.potentialLoss}</p>
                </div>
                
                <div className="p-2 rounded bg-background/50">
                  <p className="text-muted-foreground text-xs">Potential Profit</p>
                  <p className="font-bold text-green-500">${calculation.potentialProfit}</p>
                </div>
                
                <div className="p-2 rounded bg-background/50 col-span-2">
                  <p className="text-muted-foreground text-xs">Risk/Reward Ratio</p>
                  <p className="font-bold text-lg text-foreground">
                    1 : {calculation.riskRewardRatio}
                    {calculation.riskRewardRatio >= 2 && (
                      <span className="ml-2 text-xs text-green-500">✓ Good</span>
                    )}
                    {calculation.riskRewardRatio < 1 && (
                      <span className="ml-2 text-xs text-destructive">⚠ Low</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
