import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
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
    created_at: string;
    category: string;
  };
}

const SignalCard = ({ signal }: SignalCardProps) => {
  const allTpHit = signal.tp1_hit && 
    (!signal.tp2 || signal.tp2_hit) && 
    (!signal.tp3 || signal.tp3_hit) && 
    (!signal.tp4 || signal.tp4_hit);

  const getStatusColor = () => {
    if (allTpHit || signal.status === "All TP Hit") return "border-l-success bg-success/5";
    if (signal.status === "SL Hit" || signal.status === "Closed") return "border-l-destructive bg-destructive/5";
    return "border-l-warning bg-warning/5";
  };

  const getStatusBadge = () => {
    if (allTpHit || signal.status === "All TP Hit") return "🟢 Profit";
    if (signal.status === "SL Hit" || signal.status === "Closed") return "🔴 Loss";
    return "🟡 Open Trade";
  };

  return (
    <Card className="bg-card/50 border border-border/40 rounded-lg overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${signal.type === "Buy" ? "text-success" : "text-destructive"}`}>
              {signal.type.toUpperCase()}
            </span>
            <span className="text-lg font-bold text-primary">{signal.pair}</span>
            <span className="text-muted-foreground">{signal.entry}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(signal.created_at), "EEE, hh:mm a dd-MMM-yyyy")}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">TAKE PROFIT 1</p>
            <div className={`px-2 py-1 rounded border-2 ${signal.tp1_hit ? 'border-success text-success' : 'border-border text-foreground'}`}>
              <p className="font-mono text-sm">{signal.tp1}</p>
            </div>
          </div>
          {signal.tp2 && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">TAKE PROFIT 2</p>
              <div className={`px-2 py-1 rounded border-2 ${signal.tp2_hit ? 'border-success text-success' : 'border-border text-foreground'}`}>
                <p className="font-mono text-sm">{signal.tp2}</p>
              </div>
            </div>
          )}
          {signal.tp3 && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">TAKE PROFIT 3</p>
              <div className={`px-2 py-1 rounded border-2 ${signal.tp3_hit ? 'border-success text-success' : 'border-border text-foreground'}`}>
                <p className="font-mono text-sm">{signal.tp3}</p>
              </div>
            </div>
          )}
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">SL-{signal.type === "Buy" ? "BELOW" : "ABOVE"}</p>
            <div className="px-2 py-1 rounded border-2 border-border text-foreground">
              <p className="font-mono text-sm">{signal.sl}</p>
            </div>
          </div>
        </div>

        {(signal as any).profit_note && (
          <div className="mt-2 text-center">
            <p className="text-xs text-warning italic">{(signal as any).profit_note}</p>
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-border/40">
          <div className="flex items-center gap-2">
            {allTpHit || signal.status === "All TP Hit" ? (
              <Badge className="bg-success text-success-foreground">🎯 All TP Hit</Badge>
            ) : signal.status === "SL Hit" || signal.status === "Closed" ? (
              <Badge className="bg-destructive text-destructive-foreground">🔴 SL Hit</Badge>
            ) : (
              <Badge className="bg-warning text-warning-foreground">🟢 Running</Badge>
            )}
          </div>
          {signal.tp1_hit && signal.status === "Active" && (
            <span className="text-sm font-semibold text-success">
              {signal.tp1_hit && !signal.tp2_hit && "1ST TP DONE"}
              {signal.tp2_hit && !signal.tp3_hit && "2ND TP DONE"}
              {signal.tp3_hit && !signal.tp4_hit && "3RD TP DONE"}
              {signal.tp4_hit && "4TH TP DONE"}
            </span>
          )}
          {signal.status === "Active" && !signal.tp1_hit && (
            <span className="text-sm font-semibold text-warning flex items-center gap-1">
              <span className="w-2 h-2 bg-warning rounded-full animate-pulse"></span>
              LIVE SIGNAL
            </span>
          )}
        </div>

        {signal.note && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground">{signal.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCard;
