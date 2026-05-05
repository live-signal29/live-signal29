import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useState } from "react";
import { useRiskCalculator } from "@/hooks/useRiskCalculator";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Calculator as CalcIcon, TrendingUp, TrendingDown, Target, Shield } from "lucide-react";

const CalculatorPage = () => {
  const { calculation, calculateRisk, resetCalculation } = useRiskCalculator();
  const [accountBalance, setAccountBalance] = useState("1000");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [riskPercentage, setRiskPercentage] = useState("2");

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    calculateRisk({
      accountBalance: parseFloat(accountBalance) || 0,
      entryPrice: parseFloat(entryPrice) || 0,
      stopLoss: parseFloat(stopLoss) || 0,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      riskPercentage: parseFloat(riskPercentage) || 2,
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Pip & Lot Size Calculator - Forex Risk Calculator"
        description="Calculate optimal lot size, pip value, risk and reward for your trades."
      />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-full bg-primary/10 mb-3">
              <CalcIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Risk & Lot Calculator</h1>
            <p className="text-sm text-muted-foreground">Calculate lot size, risk, and reward in seconds</p>
          </div>

          <Card className="p-5 glass-card mb-4">
            <form onSubmit={handleCalculate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="balance" className="text-xs">Account Balance ($)</Label>
                  <Input id="balance" type="number" step="0.01" value={accountBalance} onChange={(e) => setAccountBalance(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="risk" className="text-xs">Risk %</Label>
                  <Input id="risk" type="number" step="0.1" value={riskPercentage} onChange={(e) => setRiskPercentage(e.target.value)} required />
                </div>
              </div>
              <div>
                <Label htmlFor="entry" className="text-xs">Entry Price</Label>
                <Input id="entry" type="number" step="0.0001" placeholder="e.g. 1.0850 or 2350" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="sl" className="text-xs">Stop Loss</Label>
                  <Input id="sl" type="number" step="0.0001" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} required />
                </div>
                <div>
                  <Label htmlFor="tp" className="text-xs">Take Profit (optional)</Label>
                  <Input id="tp" type="number" step="0.0001" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Calculate</Button>
                <Button type="button" variant="outline" onClick={() => { resetCalculation(); setEntryPrice(""); setStopLoss(""); setTakeProfit(""); }}>Reset</Button>
              </div>
            </form>
          </Card>

          {calculation && (
            <Card className="p-5 glass-card animate-fade-in">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Results
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Risk Amount</p>
                  <p className="text-lg font-bold">${calculation.riskAmount}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Recommended Lot</p>
                  <p className="text-lg font-bold text-primary">{calculation.recommendedLot}</p>
                </div>
                <div className="p-3 rounded-lg bg-destructive/10">
                  <p className="text-[10px] text-destructive uppercase flex items-center gap-1"><TrendingDown className="h-3 w-3" /> Potential Loss</p>
                  <p className="text-lg font-bold text-destructive">-${calculation.potentialLoss}</p>
                </div>
                <div className="p-3 rounded-lg bg-success/10">
                  <p className="text-[10px] text-success uppercase flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Potential Profit</p>
                  <p className="text-lg font-bold text-success">+${calculation.potentialProfit}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Shield className="h-3 w-3" /> Risk / Reward Ratio</p>
                  <p className="text-lg font-bold">1 : {calculation.riskRewardRatio}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-4 text-center">
                💡 Pro tip: Aim for at least 1:2 risk-reward and never risk more than 2% per trade.
              </p>
            </Card>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CalculatorPage;
