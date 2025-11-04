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
        <div className="flex justify-between items-start gap-2 p-2 sm:p-3 border-b border-border">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
            <span className={`text-xs sm:text-sm font-bold ${signal.type === "Buy" ? "text-[hsl(var(--buy))]" : "text-[hsl(var(--sell))]"}`}>
              {signal.type.toUpperCase()}
            </span>
            <span className="text-xs sm:text-sm font-bold text-primary">
              {signal.pair}
            </span>
            <span className="text-xs sm:text-sm font-semibold text-foreground">
              {signal.entry}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(signal.created_at), "hh:mm a")}
            </div>
            <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
              {format(new Date(signal.created_at), "dd-MMM")}
            </div>
          </div>
        </div>

        {/* TP/SL Grid */}
        <div className="p-2 sm:p-3 bg-background">
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 uppercase truncate">TP 1</p>
              <p className={`text-xs sm:text-sm font-semibold truncate ${signal.tp1_hit ? 'text-success border border-success rounded px-1 py-0.5' : 'text-foreground'}`}>
                {signal.tp1}
              </p>
            </div>
            
            {signal.tp2 && (
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 uppercase truncate">TP 2</p>
                <p className={`text-xs sm:text-sm font-semibold truncate ${signal.tp2_hit ? 'text-success border border-success rounded px-1 py-0.5' : 'text-foreground'}`}>
                  {signal.tp2}
                </p>
              </div>
            )}
            
            {signal.tp3 && (
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 uppercase truncate">TP 3</p>
                <p className={`text-xs sm:text-sm font-semibold truncate ${signal.tp3_hit ? 'text-success border border-success rounded px-1 py-0.5' : 'text-foreground'}`}>
                  {signal.tp3}
                </p>
              </div>
            )}
            
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 uppercase truncate">SL</p>
              <p className="text-xs sm:text-sm font-semibold text-destructive border border-destructive rounded px-1 py-0.5 truncate">
                {signal.sl}
              </p>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className={`flex justify-between items-center px-2 sm:px-3 py-1.5 sm:py-2 border-t border-border`}>
          <span className={`text-xs sm:text-sm font-medium ${getStatusText() === "All TP Hit" ? "text-success" : getStatusText() === "SL Hit" ? "text-destructive" : "text-foreground"}`}>
            {getStatusText()}
          </span>
          {signal.profit_note && (
            <span className={`text-xs sm:text-sm font-semibold ${signal.profit_note.includes("+") ? "text-success" : "text-destructive"}`}>
              {signal.profit_note}
            </span>
          )}
        </div>

        {/* Note (if exists) */}
        {signal.note && (
          <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-muted/20 border-t border-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground">{signal.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
