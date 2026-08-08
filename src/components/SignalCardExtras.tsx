import { memo } from "react";
import { Info, Share2, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Props {
  signalId: string;
  pair: string;
  type: string;
  entryPrice: number;
  sl: number;
  tps: number[];
  tpHits?: boolean[];
  slHit?: boolean;
  currentPrice: number;
  createdAt: string;
  isOpen: boolean;
  isPending?: boolean;
  isClosed?: boolean;
  analysis?: string;
  riskLevel?: string;
  signalType?: string;
  profitNote?: string;
  runningPL?: { formatted: string; isProfit: boolean } | null;
  onShare?: (platform: "whatsapp" | "telegram" | "copy") => void;
}

const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(2) : n.toFixed(4));

const SignalCardExtras = memo((props: Props) => {
  const {
    pair,
    type,
    entryPrice,
    sl,
    tps,
    tpHits = [],
    slHit,
    currentPrice,
    isOpen,
    isPending,
    isClosed,
    analysis,
    riskLevel,
    profitNote,
    onShare,
  } = props;

  const isBuy = type?.toLowerCase() === "buy";
  const validTps = tps.filter((t) => t > 0);

  return (
    <div className="space-y-3 p-1">
      {/* Risk Badge & Pair Info */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
              isBuy ? "bg-emerald-500 text-slate-950" : "bg-red-500 text-white"
            )}
          >
            {isBuy ? "BUY" : "SELL"}
          </span>

          {riskLevel && (
            <span className="flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold text-amber-400">
              <Shield className="h-2.5 w-2.5" />
              {riskLevel} Risk
            </span>
          )}
        </div>

        {onShare && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#111522] border-white/10 text-white">
              <DropdownMenuItem onClick={() => onShare("whatsapp")}>WhatsApp</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare("telegram")}>Telegram</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare("copy")}>Copy Link</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Entry vs Current Price */}
      <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-center">
        <div>
          <div className="text-[9px] font-medium text-slate-400">Entry</div>
          <div className="font-mono text-xs font-bold text-white">{entryPrice > 0 ? fmt(entryPrice) : "—"}</div>
        </div>

        <div>
          <div className="text-[9px] font-medium text-slate-400">Current</div>
          <div
            className={cn(
              "font-mono text-xs font-bold",
              currentPrice > 0 ? (isBuy ? "text-emerald-400" : "text-red-400") : "text-slate-400"
            )}
          >
            {currentPrice > 0 ? fmt(currentPrice) : "—"}
          </div>
        </div>

        <div>
          <div className="text-[9px] font-medium text-slate-400">Status</div>
          <div
            className={cn(
              "text-xs font-bold uppercase",
              isClosed ? "text-red-400" : isPending ? "text-amber-400" : "text-emerald-400"
            )}
          >
            {isClosed ? "Closed" : isPending ? "Pending" : "Active"}
          </div>
        </div>
      </div>

      {/* Target Levels */}
      <div className="flex items-center justify-between gap-1 border-t border-white/[0.06] pt-2 text-xs">
        <div className="flex items-center gap-1 font-semibold text-red-400">
          <span>SL:</span>
          <span className={cn("font-mono text-white", slHit && "line-through text-red-400")}>
            {sl > 0 ? fmt(sl) : "—"}
          </span>
        </div>

        {validTps.map((t, i) => (
          <div key={i} className="flex items-center gap-1 font-semibold text-emerald-400">
            <span>TP{i + 1}:</span>
            <span className="font-mono text-emerald-400">{fmt(t)}</span>
            {tpHits[i] && <span>✓</span>}
          </div>
        ))}
      </div>

      {/* Analysis Note */}
      {analysis && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
          <p className="truncate text-[10px] text-slate-300">
            <span className="font-bold text-amber-400">Note:</span> {analysis}
          </p>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 text-slate-400">
                <Info className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 bg-[#111522] border-white/10 text-white text-xs">
              <p className="font-bold text-amber-400 mb-1">Analysis Details</p>
              <p className="text-slate-300 leading-relaxed">{analysis}</p>
            </PopoverContent>
          </Popover>
        </div>
      )}

      {/* Status / Profit Banner */}
      {profitNote && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-center text-[10px] font-semibold text-emerald-300">
          {profitNote}
        </div>
      )}
    </div>
  );
});

SignalCardExtras.displayName = "SignalCardExtras";

export default SignalCardExtras;
