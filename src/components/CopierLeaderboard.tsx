import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Gauge, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";

// The generated Supabase types haven't been regenerated to include this
// view yet, so we cast the client to `any` for this call.
const db = supabase as any;

interface PublicCopierStat {
  id: string;
  name: string | null;
  profit_amount: number | null;
  loss_amount: number | null;
  risk_reward_ratio: string | null;
  profit_percent: number | null;
  loss_percent: number | null;
  status: string;
  created_at: string;
}

const fmtPercent = (v: number | null) => (v === null || v === undefined ? "—" : `${v}%`);
const fmtMoney = (v: number | null) => (v === null || v === undefined ? "—" : `$${v}`);

/**
 * Public, read-only leaderboard of connected MT5 copier accounts. Only
 * name + performance numbers are shown — never login, password, broker or
 * contact details, which stay admin-only. Nobody (including the account's
 * own owner) can edit anything here; all edits happen from the admin panel.
 */
export const CopierLeaderboard = () => {
  const [selected, setSelected] = useState<PublicCopierStat | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["mt5-copier-public-stats"],
    queryFn: async () => {
      const { data, error } = await db
        .from("mt5_copier_public_stats")
        .select("*")
        .order("profit_percent", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data as PublicCopierStat[];
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground text-lg">No copier accounts published yet</p>
        <p className="text-muted-foreground text-sm mt-1">
          Connect your MT5 account and check back once it's live.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {stats.map((s) => {
          const isProfitable = (s.profit_percent ?? 0) >= (s.loss_percent ?? 0);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSelected(s)}
              className="text-left rounded-2xl border border-border/60 bg-card p-4 shadow-sm card-3d-hover"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{s.name || "Copier User"}</div>
                    <Badge
                      variant="secondary"
                      className={
                        s.status === "connected"
                          ? "bg-emerald-500/10 text-emerald-500 text-[10px] h-4 px-1.5"
                          : "text-[10px] h-4 px-1.5"
                      }
                    >
                      {s.status === "connected" ? "Connected" : s.status}
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted/40 py-1.5">
                  <div className="flex items-center justify-center gap-1 text-emerald-500 text-[11px] font-semibold">
                    <TrendingUp className="h-3 w-3" /> Profit
                  </div>
                  <div className="text-sm font-bold">{fmtPercent(s.profit_percent)}</div>
                </div>
                <div className="rounded-lg bg-muted/40 py-1.5">
                  <div className="flex items-center justify-center gap-1 text-destructive text-[11px] font-semibold">
                    <TrendingDown className="h-3 w-3" /> Loss
                  </div>
                  <div className="text-sm font-bold">{fmtPercent(s.loss_percent)}</div>
                </div>
                <div className="rounded-lg bg-muted/40 py-1.5">
                  <div className="flex items-center justify-center gap-1 text-primary text-[11px] font-semibold">
                    <Gauge className="h-3 w-3" /> R:R
                  </div>
                  <div className="text-sm font-bold truncate px-1">{s.risk_reward_ratio || "—"}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <DialogTitle className="text-base">{selected.name || "Copier User"}</DialogTitle>
                </div>
              </DialogHeader>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                      <TrendingUp className="h-3.5 w-3.5" /> Profit
                    </div>
                    <div className="text-lg font-bold">{fmtPercent(selected.profit_percent)}</div>
                    <div className="text-xs text-muted-foreground">{fmtMoney(selected.profit_amount)}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <div className="flex items-center gap-1 text-destructive text-xs font-semibold">
                      <TrendingDown className="h-3.5 w-3.5" /> Loss
                    </div>
                    <div className="text-lg font-bold">{fmtPercent(selected.loss_percent)}</div>
                    <div className="text-xs text-muted-foreground">{fmtMoney(selected.loss_amount)}</div>
                  </div>
                </div>

                <div className="rounded-lg bg-muted/40 p-3">
                  <div className="flex items-center gap-1 text-primary text-xs font-semibold">
                    <Gauge className="h-3.5 w-3.5" /> Risk : Reward Ratio
                  </div>
                  <div className="text-lg font-bold">{selected.risk_reward_ratio || "—"}</div>
                </div>

                <p className="text-[11px] text-muted-foreground text-center">
                  Connected since {format(new Date(selected.created_at), "PP")}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CopierLeaderboard;
