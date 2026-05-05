import { usePerPairStats } from "@/hooks/usePerPairStats";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const PerPairPerformance = () => {
  const { data, isLoading } = usePerPairStats();

  return (
    <Card className="p-4 glass-card mt-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="font-bold">Performance per Pair</h3>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Loading…</div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">No closed signals yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-2">Pair</th>
                <th className="text-center py-2 px-2">Total</th>
                <th className="text-center py-2 px-2">Wins</th>
                <th className="text-center py-2 px-2">Losses</th>
                <th className="text-right py-2 px-2">Win Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.pair} className="border-b border-border/50">
                  <td className="py-2 px-2 font-bold">{row.pair}</td>
                  <td className="text-center py-2 px-2">{row.total_signals}</td>
                  <td className="text-center py-2 px-2 text-success font-semibold">{row.total_wins}</td>
                  <td className="text-center py-2 px-2 text-destructive font-semibold">{row.total_losses}</td>
                  <td className="text-right py-2 px-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        row.win_rate >= 70
                          ? "bg-success/20 text-success"
                          : row.win_rate >= 50
                          ? "bg-amber-500/20 text-amber-600"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {row.win_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default PerPairPerformance;
