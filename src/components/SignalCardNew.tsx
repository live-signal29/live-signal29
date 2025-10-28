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
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${signal.type === "Buy" ? "text-success" : "text-destructive"}`}>
              {signal.type.toUpperCase()} {signal.pair}
            </span>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{signal.entry}</div>
            <div className="text-xs text-muted-foreground">
              {format(new Date(signal.created_at), "hh:mm a dd-MMM")}
            </div>
          </div>
        </div>

        {/* TP/SL Table */}
        <div className="p-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center py-2 border-b border-border/40">
              <span className="text-sm text-muted-foreground">TAKE PROFIT 1</span>
              <span className={`text-sm font-mono font-semibold ${signal.tp1_hit ? 'text-success' : ''}`}>
                {signal.tp1}
              </span>
            </div>
            
            {signal.tp2 && (
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-sm text-muted-foreground">TAKE PROFIT 2</span>
                <span className={`text-sm font-mono font-semibold ${signal.tp2_hit ? 'text-success' : ''}`}>
                  {signal.tp2}
                </span>
              </div>
            )}
            
            {signal.tp3 && (
              <div className="flex justify-between items-center py-2 border-b border-border/40">
                <span className="text-sm text-muted-foreground">TAKE PROFIT 3</span>
                <span className={`text-sm font-mono font-semibold ${signal.tp3_hit ? 'text-success' : ''}`}>
                  {signal.tp3}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-muted-foreground">
                SL-{signal.type === "Buy" ? "BELOW" : "ABOVE"}
              </span>
              <span className="text-sm font-mono font-semibold">{signal.sl}</span>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className={`flex justify-between items-center px-4 py-3 ${getStatusColor()}`}>
          <span className="font-semibold">{getStatusText()}</span>
          {signal.profit_note && (
            <span className="font-bold">{signal.profit_note}</span>
          )}
        </div>

        {/* Note (if exists) */}
        {signal.note && (
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <p className="text-xs text-muted-foreground">{signal.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
