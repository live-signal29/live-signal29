import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    signal_status?: string;
    note?: string;
    profit_note?: string;
    pips_result?: string;
    created_at: string;
    category: string;
    is_premium?: boolean;
  };
  hasAccess?: boolean;
}

const SignalCard = ({ signal, hasAccess = false }: SignalCardProps) => {
  const navigate = useNavigate();
  const isLocked = signal.is_premium && !hasAccess;

  const allTpHit = signal.tp1_hit && 
    (!signal.tp2 || signal.tp2_hit) && 
    (!signal.tp3 || signal.tp3_hit) && 
    (!signal.tp4 || signal.tp4_hit);

  const getStatusText = () => {
    if (signal.signal_status === "CLOSE") return "CLOSE";
    if (signal.signal_status === "LIVE") return "LIVE SIGNAL";
    return "Open";
  };

  const getStatusIndicator = () => {
    if (signal.signal_status === "LIVE" || (!signal.tp1_hit && signal.status === "Active")) {
      return (
        <span className="text-sm font-semibold text-warning flex items-center gap-1">
          <span className="w-2 h-2 bg-warning rounded-full animate-pulse"></span>
          LIVE SIGNAL
        </span>
      );
    }
    if (signal.tp1_hit && !allTpHit) {
      const tpCount = signal.tp4_hit ? "4TH" : signal.tp3_hit ? "3RD" : signal.tp2_hit ? "2ND" : "1ST";
      return (
        <span className="text-sm font-semibold text-success">
          {tpCount} TP DONE {signal.pips_result && `(${signal.pips_result})`}
        </span>
      );
    }
    return null;
  };

  return (
    <Card className="bg-card/50 border border-border/40 rounded-lg overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Header - Always visible */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2 flex-wrap">
            {signal.is_premium && (
              <Crown className="h-4 w-4 text-yellow-500 flex-shrink-0" />
            )}
            <span className="text-lg font-bold text-primary">{signal.pair}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(signal.created_at), "EEE, hh:mm a dd-MMM-yyyy")}
          </span>
        </div>

        {/* Premium Lock Section */}
        {isLocked ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Lock className="h-5 w-5" />
              <span className="text-base font-medium">BUY premium to see signal</span>
            </div>
          </div>
        ) : (
          <>
            {/* Signal Type & Entry - Only shown when unlocked */}
            <div className="flex items-center gap-2">
              <span className={`text-lg font-bold ${signal.type === "Buy" ? "text-success" : "text-destructive"}`}>
                {signal.type.toUpperCase()}
              </span>
              <span className="text-muted-foreground">{signal.entry}</span>
            </div>

            {/* TP/SL Grid */}
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

            {signal.profit_note && (
              <div className="mt-2 text-center">
                <p className="text-xs text-success font-semibold">{signal.profit_note}</p>
              </div>
            )}
          </>
        )}

        {/* Bottom Status - Always visible */}
        <div className="flex justify-between items-center pt-2 border-t border-border/40">
          <span className="text-sm text-muted-foreground">{getStatusText()}</span>
          {!isLocked && getStatusIndicator()}
          {isLocked && (
            <Button
              size="sm"
              onClick={() => navigate("/premium")}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white text-xs"
            >
              <Crown className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          )}
        </div>

        {!isLocked && signal.note && (
          <div className="pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground">{signal.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCard;