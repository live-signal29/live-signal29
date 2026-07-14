import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TrendingUp } from "lucide-react";
import Header from "@/components/Header";

export default function CompoundCalculator() {
  const [start, setStart] = useState(1000);
  const [monthly, setMonthly] = useState(10);
  const [months, setMonths] = useState(12);

  const rows = useMemo(() => {
    let bal = start;
    const arr = [];
    for (let m = 1; m <= months; m++) {
      bal = bal * (1 + monthly / 100);
      arr.push({ month: m, balance: bal, profit: bal - start });
    }
    return arr;
  }, [start, monthly, months]);

  const final = rows[rows.length - 1]?.balance || start;
  const totalProfit = final - start;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-xl space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="text-primary" /> Compound Calculator</h1>

        <Card className="p-4 space-y-3">
          <div><label className="text-xs">Starting balance ($)</label><Input type="number" value={start} onChange={e => setStart(+e.target.value)} /></div>
          <div><label className="text-xs">Monthly return (%)</label><Input type="number" value={monthly} onChange={e => setMonthly(+e.target.value)} /></div>
          <div><label className="text-xs">Months</label><Input type="number" value={months} onChange={e => setMonths(+e.target.value)} /></div>
        </Card>

        <Card className="p-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div><div className="text-xs text-muted-foreground">Final balance</div><div className="text-2xl font-bold text-success-deep">${final.toFixed(2)}</div></div>
            <div><div className="text-xs text-muted-foreground">Total profit</div><div className="text-2xl font-bold">+${totalProfit.toFixed(2)}</div></div>
          </div>
          <div className="max-h-64 overflow-auto text-sm">
            <table className="w-full">
              <thead className="text-xs text-muted-foreground"><tr><th className="text-left py-1">Month</th><th className="text-right">Balance</th><th className="text-right">Profit</th></tr></thead>
              <tbody>{rows.map(r => (<tr key={r.month} className="border-t border-border/40"><td className="py-1">M{r.month}</td><td className="text-right">${r.balance.toFixed(2)}</td><td className="text-right text-success-deep">+${r.profit.toFixed(2)}</td></tr>))}</tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
