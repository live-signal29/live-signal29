import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import Header from "@/components/Header";

interface Row { user_id: string; full_name: string; total_trades: number; wins: number; win_rate: number; total_pnl: number; }

export default function Leaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.rpc("get_leaderboard").then(({ data }) => {
      setRows((data as Row[]) || []);
      setLoading(false);
    });
  }, []);

  const icon = (i: number) => i === 0 ? <Trophy className="w-5 h-5 text-yellow-500" /> : i === 1 ? <Medal className="w-5 h-5 text-gray-400" /> : i === 2 ? <Award className="w-5 h-5 text-amber-700" /> : <span className="w-5 text-center text-sm text-muted-foreground">{i + 1}</span>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2"><Trophy className="text-yellow-500" /> Leaderboard</h1>
        <p className="text-sm text-muted-foreground mb-4">Top traders by profit (based on Trade Journal)</p>
        {loading ? <p>Loading...</p> : rows.length === 0 ? (
          <Card className="p-6 text-center text-muted-foreground">No trader data yet. Log trades in Trade Journal to appear here!</Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <Card key={r.user_id} className="p-4 flex items-center gap-3">
                <div className="w-8 flex justify-center">{icon(i)}</div>
                <div className="flex-1">
                  <div className="font-semibold">{r.full_name}</div>
                  <div className="text-xs text-muted-foreground">{r.total_trades} trades • {r.win_rate}% win rate</div>
                </div>
                <div className={`font-bold ${r.total_pnl >= 0 ? "text-success-deep" : "text-destructive"}`}>
                  {r.total_pnl >= 0 ? "+" : ""}${r.total_pnl.toFixed(2)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
