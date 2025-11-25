import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";

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
    signal_status?: string;
    note?: string;
    profit_note?: string;
    pips_result?: string;
    risk_level?: string;
    signal_type?: string;
    analysis_reason?: string;
    created_at: string;
    category: string;
  };
}

const SignalCardNew = ({ signal }: SignalCardProps) => {
  const isNewSignal = differenceInHours(new Date(), new Date(signal.created_at)) < 24;
  
  const getStatusText = () => {
    return signal.signal_status || "OPEN";
  };

  const getStatusColor = () => {
    const status = signal.signal_status || "OPEN";
    if (status === "CLOSE") return "bg-destructive/10 text-destructive border-destructive";
    if (status === "LIVE") return "bg-success/10 text-success border-success";
    return "bg-primary/10 text-primary border-primary";
  };

  const getRiskLevelColor = () => {
    if (signal.risk_level === "High") return "bg-destructive/10 text-destructive border-destructive";
    if (signal.risk_level === "Medium") return "bg-warning/10 text-warning border-warning";
    return "bg-success/10 text-success border-success";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return `Today, ${format(date, "hh:mm a")}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, "hh:mm a")}`;
    return format(date, "dd MMM yyyy, hh:mm a");
  };

  return (
    <Card className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md relative">
      <CardContent className="p-0">
        {/* NEW Badge */}
        {isNewSignal && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 animate-pulse">
              NEW
            </Badge>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-start gap-2 p-3 sm:p-4 border-b border-border bg-muted/30">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${signal.type === "Buy" ? "bg-success/10 text-success border-success" : "bg-destructive/10 text-destructive border-destructive"} border font-bold text-xs`}>
              {signal.type.toUpperCase()}
            </Badge>
            <span className="text-sm sm:text-base font-bold text-foreground">
              {signal.pair}
            </span>
            <Badge variant="outline" className="text-xs font-semibold">
              @ {signal.entry}
            </Badge>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] sm:text-xs text-muted-foreground">
              {formatDate(signal.created_at)}
            </div>
          </div>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-1.5 p-2 sm:p-3 bg-background border-b border-border">
          <Badge className={`${getStatusColor()} border text-[10px] sm:text-xs font-semibold`}>
            {getStatusText()}
          </Badge>
          {signal.risk_level && (
            <Badge className={`${getRiskLevelColor()} border text-[10px] sm:text-xs`}>
              {signal.risk_level} Risk
            </Badge>
          )}
          {signal.signal_type && (
            <Badge variant="outline" className="text-[10px] sm:text-xs">
              {signal.signal_type}
            </Badge>
          )}
          {signal.pips_result && (
            <Badge className="bg-success/10 text-success border-success border text-[10px] sm:text-xs font-semibold">
              {signal.pips_result}
            </Badge>
          )}
        </div>

        {/* TP/SL Table */}
        <div className="p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-muted-foreground text-xs sm:text-sm">TAKE PROFIT 1</span>
              <span className={`font-semibold text-xs sm:text-sm ${signal.tp1_hit ? 'text-success' : 'text-foreground'}`}>
                {signal.tp1} {signal.tp1_hit && '✓'}
              </span>
            </div>
            
            {signal.tp2 && (
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground text-xs sm:text-sm">TAKE PROFIT 2</span>
                <span className={`font-semibold text-xs sm:text-sm ${signal.tp2_hit ? 'text-success' : 'text-foreground'}`}>
                  {signal.tp2} {signal.tp2_hit && '✓'}
                </span>
              </div>
            )}
            
            {signal.tp3 && (
              <div className="flex justify-between items-center py-1.5 border-b border-border/50">
                <span className="text-muted-foreground text-xs sm:text-sm">TAKE PROFIT 3</span>
                <span className={`font-semibold text-xs sm:text-sm ${signal.tp3_hit ? 'text-success' : 'text-foreground'}`}>
                  {signal.tp3} {signal.tp3_hit && '✓'}
                </span>
              </div>
            )}
            
            <div className="flex justify-between items-center py-1.5 border-b border-border/50">
              <span className="text-muted-foreground text-xs sm:text-sm">SL-BELOW</span>
              <span className={`font-semibold text-xs sm:text-sm ${signal.sl_hit ? 'text-destructive' : 'text-foreground'}`}>
                {signal.sl} {signal.sl_hit && '✗'}
              </span>
            </div>
          </div>
        </div>

        {/* Analysis Reason */}
        {signal.analysis_reason && (
          <div className="px-3 sm:px-4 py-2 bg-muted/20 border-t border-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              <span className="font-semibold">Analysis:</span> {signal.analysis_reason}
            </p>
          </div>
        )}

        {/* Note */}
        {signal.note && (
          <div className="px-3 sm:px-4 py-2 bg-muted/20 border-t border-border">
            <p className="text-[10px] sm:text-xs text-muted-foreground">{signal.note}</p>
          </div>
        )}

        {/* Profit Note */}
        {signal.profit_note && (
          <div className="px-3 sm:px-4 py-2 bg-success/5 border-t border-success/20">
            <p className="text-xs sm:text-sm font-semibold text-success">{signal.profit_note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalCardNew;
