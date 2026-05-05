import { useCurrencyStrength } from "@/hooks/useCurrencyStrength";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

const CurrencyStrengthMeter = () => {
  const { scores, loading } = useCurrencyStrength();

  return (
    <Card className="p-4 glass-card">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="font-bold text-sm">Currency Strength Meter</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Live</span>
      </div>
      {loading && scores.length === 0 ? (
        <div className="text-xs text-muted-foreground py-4 text-center">Loading live data…</div>
      ) : (
        <div className="space-y-2">
          {scores.map((s) => {
            const isPos = s.score >= 0;
            const width = Math.min(100, Math.abs(s.score));
            return (
              <div key={s.currency} className="flex items-center gap-2">
                <span className="w-12 text-xs font-bold">{s.currency}</span>
                <div className="flex-1 h-3 bg-muted rounded-full relative overflow-hidden">
                  <div
                    className={`absolute top-0 h-full rounded-full ${isPos ? "bg-success" : "bg-destructive"}`}
                    style={{
                      left: isPos ? "50%" : `${50 - width / 2}%`,
                      width: `${width / 2}%`,
                    }}
                  />
                  <div className="absolute top-0 left-1/2 w-px h-full bg-border" />
                </div>
                <span className={`w-12 text-xs font-mono text-right flex items-center justify-end gap-0.5 ${isPos ? "text-success" : "text-destructive"}`}>
                  {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {s.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        Strong currencies (green) vs weak (red) — based on live price momentum.
      </p>
    </Card>
  );
};

export default CurrencyStrengthMeter;
