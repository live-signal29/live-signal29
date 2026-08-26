import React from "react";
import { format } from "date-fns";
import { Lock, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SignalCardNewProps {
  signal: any;
  hasAccess: boolean;
  subscriptionStatus?: string;
  livePrice?: number;
}

export const SignalCardNew: React.FC<SignalCardNewProps> = ({
  signal,
  hasAccess,
  subscriptionStatus,
  livePrice,
}) => {
  // Database column fallbacks handle kar diye hain
  const pairName = signal?.pair || signal?.symbol || "XAU/USD";
  const actionType = String(signal?.action || signal?.type || "BUY").toUpperCase();
  const isBuy = actionType.includes("BUY");

  const entryVal = Number(signal?.entry_price ?? signal?.entry ?? 0);
  const stopLossVal = signal?.stop_loss ?? signal?.sl ?? "--";
  const tp1Val = signal?.take_profit1 ?? signal?.tp1 ?? "--";
  const tp2Val = signal?.take_profit2 ?? signal?.tp2 ?? "--";
  const tp3Val = signal?.take_profit3 ?? signal?.tp3 ?? "--";

  const currentVal = livePrice !== undefined && !isNaN(livePrice) ? Number(livePrice) : entryVal;
  const isProfit = isBuy ? currentVal >= entryVal : currentVal <= entryVal;
  const statusStr = String(signal?.signal_status || signal?.status || "OPEN").toUpperCase();
  const isClosed = statusStr === "CLOSE" || statusStr === "CLOSED";

  const formattedTime = signal?.created_at
    ? format(new Date(signal.created_at), "hh:mm a")
    : "";

  return (
    <Card className="relative overflow-hidden border border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl">
      <CardContent className="p-3 sm:p-4">
        
        {/* Top Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base sm:text-lg text-foreground tracking-tight">
              {pairName}
            </span>
            {formattedTime && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" />
                {formattedTime}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant={isClosed ? "secondary" : "default"}
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                isClosed
                  ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                  : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
              )}
            >
              • {statusStr}
            </Badge>

            <Badge
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                isBuy ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
              )}
            >
              {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {actionType}
            </Badge>
          </div>
        </div>

        {/* Access Restriction */}
        {!hasAccess ? (
          <div className="relative my-2 p-6 rounded-xl bg-muted/40 border border-dashed border-border flex flex-col items-center justify-center text-center backdrop-blur-sm">
            <Lock className="w-6 h-6 text-muted-foreground mb-1 animate-bounce" />
            <p className="text-xs font-semibold text-foreground">VIP Signal Locked</p>
            <p className="text-[11px] text-muted-foreground">Subscribe to view Entry, SL & TP targets</p>
          </div>
        ) : (
          <>
            {/* Entry & Current Price Grid */}
            <div className="bg-muted/30 rounded-xl p-2.5 sm:p-3 grid grid-cols-2 gap-2 mb-3 border border-border/40">
              <div>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">ENTRY</p>
                <p className="font-extrabold text-foreground text-sm sm:text-base">
                  {entryVal ? entryVal.toFixed(2) : "--"}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">CURRENT</p>
                  {!isClosed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  )}
                </div>
                <p
                  className={cn(
                    "font-extrabold text-sm sm:text-base transition-colors duration-300",
                    isClosed
                      ? "text-foreground"
                      : isProfit
                      ? "text-emerald-500"
                      : "text-rose-500"
                  )}
                >
                  {currentVal ? currentVal.toFixed(2) : "--"}
                </p>
              </div>
            </div>

            {/* Target & Stop Loss Row */}
            <div className="grid grid-cols-4 gap-1 text-center text-[10px] sm:text-[11px] pt-1 border-t border-border/40">
              <div className="bg-rose-500/5 p-1.5 rounded-lg border border-rose-500/10">
                <span className="text-muted-foreground block font-medium">STOP LOSS</span>
                <span className="font-bold text-rose-500 text-xs">{stopLossVal}</span>
              </div>
              <div className="bg-blue-500/5 p-1.5 rounded-lg border border-blue-500/10">
                <span className="text-muted-foreground block font-medium">TARGET 1</span>
                <span className="font-bold text-blue-500 text-xs">{tp1Val}</span>
              </div>
              <div className="bg-blue-500/5 p-1.5 rounded-lg border border-blue-500/10">
                <span className="text-muted-foreground block font-medium">TARGET 2</span>
                <span className="font-bold text-blue-500 text-xs">{tp2Val}</span>
              </div>
              <div className="bg-blue-500/5 p-1.5 rounded-lg border border-blue-500/10">
                <span className="text-muted-foreground block font-medium">TARGET 3</span>
                <span className="font-bold text-blue-500 text-xs">{tp3Val}</span>
              </div>
            </div>

            {/* Notes */}
            {signal?.notes && (
              <div className="mt-2 text-[11px] px-2.5 py-1.5 rounded-lg bg-muted/60 text-muted-foreground flex items-center gap-1.5 border border-border/30">
                {isClosed ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                )}
                <span className="truncate">{signal.notes}</span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
