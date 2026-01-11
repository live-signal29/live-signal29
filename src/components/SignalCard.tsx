import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, TrendingDown, AlertCircle, Target, Shield } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
    sl_hit?: boolean;
    status: string;
    note?: string;
    created_at: string;
    category: string;
    risk_level?: string;
    profit_note?: string;
    tag?: string;
  };
}

const SignalCard = ({ signal }: SignalCardProps) => {
  const allTpHit = signal.tp1_hit && 
    (!signal.tp2 || signal.tp2_hit) && 
    (!signal.tp3 || signal.tp3_hit) && 
    (!signal.tp4 || signal.tp4_hit);

  const isActive = signal.status === "Active" && !signal.sl_hit && !allTpHit;
  const isProfit = allTpHit || signal.status === "All TP Hit";
  const isLoss = signal.sl_hit || signal.status === "SL Hit" || signal.status === "Closed";

  const getRiskColor = (risk?: string) => {
    switch (risk?.toLowerCase()) {
      case 'low': return 'risk-low';
      case 'medium': return 'risk-medium';
      case 'high': return 'risk-high';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const tpCount = [signal.tp1, signal.tp2, signal.tp3, signal.tp4].filter(Boolean).length;
  const hitCount = [signal.tp1_hit, signal.tp2_hit, signal.tp3_hit, signal.tp4_hit].filter(Boolean).length;

  return (
    <div className="signal-card touch-feedback">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* Signal Type Badge */}
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm",
            signal.type === "Buy" 
              ? "bg-success/15 text-success" 
              : "bg-destructive/15 text-destructive"
          )}>
            {signal.type === "Buy" ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {signal.type.toUpperCase()}
          </div>
          
          {/* Asset Name */}
          <span className="text-lg font-bold text-foreground tracking-tight">
            {signal.pair}
          </span>
        </div>

        {/* Live Indicator */}
        {isActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
            </span>
            <span className="text-xs font-semibold text-success">LIVE</span>
          </div>
        )}
      </div>

      {/* Entry & Risk Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Entry</p>
              {signal.tag && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/40 border text-[9px] px-1.5 py-0 font-semibold">
                  📰 {signal.tag}
                </Badge>
              )}
            </div>
            <p className="font-mono font-bold text-base text-foreground">{signal.entry}</p>
          </div>
        </div>
        
        {signal.risk_level && (
          <div className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
            getRiskColor(signal.risk_level)
          )}>
            <Shield className="h-3 w-3" />
            {signal.risk_level}
          </div>
        )}
      </div>

      {/* TP/SL Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Take Profits */}
        <div className="space-y-2">
          {signal.tp1 && (
            <div className={cn("tp-badge", signal.tp1_hit ? "tp-hit" : "tp-pending")}>
              <Target className="h-3 w-3" />
              <span>TP1:</span>
              <span className="font-mono">{signal.tp1}</span>
              {signal.tp1_hit && <CheckCircle2 className="h-3 w-3 ml-auto" />}
            </div>
          )}
          {signal.tp2 && (
            <div className={cn("tp-badge", signal.tp2_hit ? "tp-hit" : "tp-pending")}>
              <Target className="h-3 w-3" />
              <span>TP2:</span>
              <span className="font-mono">{signal.tp2}</span>
              {signal.tp2_hit && <CheckCircle2 className="h-3 w-3 ml-auto" />}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {signal.tp3 && (
            <div className={cn("tp-badge", signal.tp3_hit ? "tp-hit" : "tp-pending")}>
              <Target className="h-3 w-3" />
              <span>TP3:</span>
              <span className="font-mono">{signal.tp3}</span>
              {signal.tp3_hit && <CheckCircle2 className="h-3 w-3 ml-auto" />}
            </div>
          )}
          
          {/* Stop Loss */}
          <div className={cn("sl-badge", signal.sl_hit && "!bg-destructive/20")}>
            <AlertCircle className="h-3 w-3" />
            <span>SL:</span>
            <span className="font-mono">{signal.sl}</span>
            {signal.sl_hit && <span className="ml-auto text-[10px]">HIT</span>}
          </div>
        </div>
      </div>

      {/* Progress bar for TP hits */}
      {tpCount > 1 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{hitCount}/{tpCount} TP</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-success to-primary transition-all duration-500 rounded-full"
              style={{ width: `${(hitCount / tpCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Profit Note */}
      {signal.profit_note && (
        <div className="mb-3 p-2 rounded-lg bg-warning/10 border border-warning/20">
          <p className="text-xs text-warning font-medium">{signal.profit_note}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/30">
        {/* Status Badge */}
        <Badge className={cn(
          "font-semibold",
          isProfit && "bg-success/15 text-success hover:bg-success/20",
          isLoss && "bg-destructive/15 text-destructive hover:bg-destructive/20",
          isActive && "bg-primary/15 text-primary hover:bg-primary/20"
        )}>
          {isProfit && "🎯 All TP Hit"}
          {isLoss && "🔴 SL Hit"}
          {isActive && (
            <>
              {hitCount > 0 ? `✓ ${hitCount} TP Done` : "📊 Running"}
            </>
          )}
        </Badge>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground">
          {format(new Date(signal.created_at), "dd MMM, HH:mm")}
        </span>
      </div>

      {/* Note */}
      {signal.note && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground leading-relaxed">{signal.note}</p>
        </div>
      )}
    </div>
  );
};

export default SignalCard;
