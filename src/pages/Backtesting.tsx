import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { Header } from "@/components/Header";

export default function Backtesting() {
  const [pair, setPair] = useState("XAUUSD");
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    const from = new Date(); from.setDate(from.getDate() - days);
    const { data } = await supabase.from("trade_history").select("result,pips_gained,pair").ilike("pair", `%${pair}%`).gte("closed_at", from.toISOString());
    const rows = data || [];
    const total = rows.length;
    const wins = rows.filter(r => r.result === "win").length;
    const losses = rows.filter(r => r.result === "loss").length;
    const pips = rows.reduce((s, r) => s + Number(r.pips_gained || 0), 0);
    setStats({ total, wins, losses, pips, winRate: total ? ((wins / total) * 100).toFixed(1) : 0 });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-xl space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><History className="text-primary" /> Backtesting</h1>
        <p className="text-sm text-muted-foreground">Simulate a pair's historical performance based on closed signals.</p>

        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-xs">Pair</label><Input value={pair} onChange={e => setPair(e.target.value.toUpperCase())} /></div>
            <div><label className="text-xs">Days back</label><Input type="number" value={days} onChange={e => setDays(+e.target.value)} /></div>
          </div>
          <Button onClick={run} disabled={loading} className="w-full">{loading ? "Running..." : "Run Backtest"}</Button>
        </Card>

        {stats && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Results — {pair} (last {days} days)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs text-muted-foreground">Total signals</div><div className="text-2xl font-bold">{stats.total}</div></div>
              <div><div className="text-xs text-muted-foreground">Win rate</div><div className="text-2xl font-bold text-success-deep">{stats.winRate}%</div></div>
              <div><div className="text-xs text-muted-foreground">Wins</div><div className="text-lg font-semibold text-success-deep">{stats.wins}</div></div>
              <div><div className="text-xs text-muted-foreground">Losses</div><div className="text-lg font-semibold text-destructive">{stats.losses}</div></div>
              <div className="col-span-2"><div className="text-xs text-muted-foreground">Total pips</div><div className={`text-2xl font-bold ${stats.pips >= 0 ? "text-success-deep" : "text-destructive"}`}>{stats.pips >= 0 ? "+" : ""}{stats.pips.toFixed(1)}</div></div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
