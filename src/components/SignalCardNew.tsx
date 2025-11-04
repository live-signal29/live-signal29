import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";

interface SignalCardProps {
  signal: {
    id: string;
    pair: string;
    type: "Buy" | "Sell";
    entry: string;
    tp1: string;
    tp2?: string;
    tp3?: string;
    tp4?: string;
    sl: string;
    tp1_hit: boolean;
    tp2_hit: boolean;
    tp3_hit: boolean;
    tp4_hit: boolean;
    status: string;
    note?: string;
    profit_note?: string;
    created_at: string;
    category: string;
  };
}

const SignalCardNew = ({ signal }: SignalCardProps) => {
  const allTpHit = signal.tp1_hit && 
    (!signal.tp2 || signal.tp2_hit) && 
    (!signal.tp3 || signal.tp3_hit) && 
    (!signal.tp4 || signal.tp4_hit);

  const getStatusText = () => {
    if (allTpHit || signal.status === "All TP Hit") return "All TP Hit";
    if (signal.status === "SL Hit" || signal.status === "Closed") return "SL Hit";
    return "Running";
  };

  const getStatusColor = () => {
    if (allTpHit || signal.status === "All TP Hit") return "bg-success text-success-foreground";
    if (signal.status === "SL Hit" || signal.status === "Closed") return "bg-destructive text-destructive-foreground";
    return "bg-warning text-warning-foreground";
  };

  return (
    <Card className="overflow-hidden bg-card border-border">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex justify-between items-center p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className={`text-base font-bold ${signal.type === "Buy" ? "text-[hsl(var(--buy))]" : "text-[hsl(var(--sell))]"}`}>
              {signal.type.toUpperCase()}
            </span>
            <span className="text-base font-bold text-primary">
              {signal.pair}
            </span>
            <span className="text-base font-semibold text-foreground">
              {signal.entry}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {format(new Date(signal.created_at), "EEE, hh:mm a dd-MMM-yyyy")}
            </div>
          </div>
        </div>

        {/* TP/SL Grid */}
        <div className="p-4 bg-background">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase">Take Profit 1</p>
              <p className={`text-base font-semibold ${signal.tp1_hit ? 'text-success border border-success rounded px-2 py-1' : 'text-foreground'}`}>
                {signal.tp1}
              </p>
            </div>
            
            {signal.tp2 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase">Take Profit 2</p>
                <p className={`text-base font-semibold ${signal.tp2_hit ? 'text-success border border-success rounded px-2 py-1' : 'text-foreground'}`}>
                  {signal.tp2}
                </p>
              </div>
            )}
            
            {signal.tp3 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase">Take Profit 3</p>
                <p className={`text-base font-semibold ${signal.tp3_hit ? 'text-success border border-success rounded px-2 py-1' : 'text-foreground'}`}>
                  {signal.tp3}
                </p>
              </div>
            )}
            
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase">SL-{signal.type === "Buy" ? "Below" : "Above"}</p>
              <p className="text-base font-semibold text-destructive border border-destructive rounded px-2 py-1">
                {signal.sl}
              </p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className={`flex justify-between items-center px-4 py-2 border-t border-border`}>
          <span className={`text-sm font-medium ${getStatusText() === "All TP Hit" ? "text-success" : getStatusText() === "SL Hit" ? "text-destructive" : "text-foreground"}`}>
            {getStatusText()}
          </span>
          {signal.profit_note && (
            <span className={`text-sm font-semibold ${signal.profit_note.includes("+") ? "text-success" : "text-destructive"}`}>
              {signal.profit_note}
            </span>
          )}
        </div>

        {/* Note (if exists) */}
        {signal.note && (
          <div className="px-4 py-2 bg-muted/20 border-t border-border">
            <p className="text-xs text-muted-foreground">{signal.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
