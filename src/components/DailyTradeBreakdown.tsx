import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  ShieldAlert,
  Scale,
  TrendingUp,
} from "lucide-react";
import { useDailyTradeBreakdown } from "@/hooks/useDailyTradeBreakdown";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyTradeBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: Date | null;
  dateLabel: string;
  /** e.g. "COMMODITIES" if you want to scope to a category, or leave both empty for everything */
  defaultCategory?: string | null;
  /** e.g. "XAU/USD (Gold)" to scope to one exact pair */
  defaultPair?: string | null;
  /** Toggle buttons shown at the top. Each option sets category/pair filters when clicked. */
  filterOptions?: {
    label: string;
    category?: string | null;
    pair?: string | null;
  }[];
}

const resultBadge = (result: string) => {
  if (result === "win")
    return (
      <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/15">
        Win
      </Badge>
    );
  if (result === "loss")
    return (
      <Badge className="bg-red-500/15 text-red-600 border-red-500/30 hover:bg-red-500/15">
        Loss
      </Badge>
    );
  return (
    <Badge className="bg-slate-400/15 text-slate-600 border-slate-400/30 hover:bg-slate-400/15">
      Breakeven
    </Badge>
  );
};

const StatBox = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
}) => (
  <div className="bg-background/60 rounded-lg p-3 text-center border border-border/50">
    <Icon className={`h-4 w-4 mx-auto mb-1 ${color}`} />
    <p className={`text-lg font-bold ${color}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
  </div>
);

const DailyTradeBreakdown = ({
  open,
  onOpenChange,
  date,
  dateLabel,
  defaultCategory = null,
  defaultPair = null,
  filterOptions,
}: DailyTradeBreakdownProps) => {
  const [category, setCategory] = useState<string | null>(defaultCategory);
  const [pair, setPair] = useState<string | null>(defaultPair);
  const [activeFilterLabel, setActiveFilterLabel] = useState<string>(
    filterOptions?.[0]?.label || "All"
  );

  const { summary, details, isLoading } = useDailyTradeBreakdown(
    date,
    category,
    pair
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-2 border-b">
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{dateLabel}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {date ? format(date, "MMM d, yyyy") : ""}
            </span>
          </DialogTitle>

          {filterOptions && filterOptions.length > 0 && (
            <div className="flex gap-2 pt-2 flex-wrap">
              {filterOptions.map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => {
                    setActiveFilterLabel(opt.label);
                    setCategory(opt.category ?? null);
                    setPair(opt.pair ?? null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    activeFilterLabel === opt.label
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </DialogHeader>

        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
        >
          <div className="p-4 space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : summary.total_trades === 0 ? (
              <div className="text-center py-10">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No closed trades for this day
                </p>
              </div>
            ) : (
              <>
                {/* Top-line win rate */}
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <div>
                    <p className="text-2xl font-bold text-amber-500">
                      {summary.win_rate}%
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Win rate • {summary.total_trades} trades
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        summary.total_pips >= 0
                          ? "text-emerald-500"
                          : "text-red-500"
                      }`}
                    >
                      {summary.total_pips >= 0 ? "+" : ""}
                      {summary.total_pips}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Total Pips
                    </p>
                  </div>
                </div>

                {/* Buy vs Sell */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                    <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
                    <div>
                      <p className="text-lg font-bold text-emerald-500 leading-none">
                        {summary.buy_count}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Buy</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <ArrowDownCircle className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="text-lg font-bold text-red-500 leading-none">
                        {summary.sell_count}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Sell</p>
                    </div>
                  </div>
                </div>

                {/* TP / SL / Breakeven grid */}
                <div className="grid grid-cols-3 gap-2">
                  <StatBox
                    icon={Target}
                    label="TP1 Hit"
                    value={summary.tp1_count}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={Target}
                    label="TP2 Hit"
                    value={summary.tp2_count}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={Target}
                    label="TP3 Hit"
                    value={summary.tp3_count}
                    color="text-emerald-500"
                  />
                  <StatBox
                    icon={ShieldAlert}
                    label="Stop Loss"
                    value={summary.sl_count}
                    color="text-red-500"
                  />
                  <StatBox
                    icon={Scale}
                    label="Breakeven"
                    value={summary.breakevens}
                    color="text-slate-500"
                  />
                  <StatBox
                    icon={TrendingUp}
                    label="Wins"
                    value={summary.wins}
                    color="text-amber-500"
                  />
                </div>

                <Separator />

                {/* Trade list */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Trades
                  </p>
                  {details.map((trade) => (
                    <div
                      key={trade.id}
                      className="flex items-center justify-between bg-background/60 border border-border/50 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2">
                        {trade.type?.toLowerCase() === "buy" ? (
                          <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{trade.pair}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Entry {trade.entry}
                            {trade.tp_hit_level
                              ? ` • TP${trade.tp_hit_level} hit`
                              : trade.sl_hit
                              ? " • SL hit"
                              : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            trade.pips_gained >= 0
                              ? "text-emerald-500"
                              : "text-red-500"
                          }`}
                        >
                          {trade.pips_gained >= 0 ? "+" : ""}
                          {trade.pips_gained}
                        </span>
                        {resultBadge(trade.result)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyTradeBreakdown;
