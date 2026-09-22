import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Gauge, User, ChevronRight, Rocket, ShieldCheck, Zap, Clock, Send } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { MT5CopierConnectDialog } from "@/components/MT5CopierConnectDialog";
import { isOwnCopierRequestId } from "@/lib/myCopierRequests";

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
 *
 * Pending and Connected accounts are visible to everyone. A Rejected account
 * is only visible to the person who submitted that request — everyone else's
 * rejected requests are hidden from them, so nobody sees "who got rejected"
 * except the rejected person themselves (identified via the id remembered
 * locally at submission time — see src/lib/myCopierRequests.ts).
 */
export const CopierLeaderboard = () => {
  const [selected, setSelected] = useState<PublicCopierStat | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["mt5-copier-public-stats"],
    queryFn: async () => {
      const { data, error } = await db
        .from("mt5_copier_public_stats")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PublicCopierStat[];
    },
  });

  // Hide other people's rejected requests — only the submitter should see
  // their own "Rejected" card. Pending/Connected stay visible to everyone.
  const visibleStats = stats?.filter(
    (s) => s.status !== "rejected" || isOwnCopierRequestId(s.id)
  );

  return (
    <>
      {/* HERO SECTION */}
      <div className="mb-3 overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Rocket className="h-4 w-4" />
          </div>
          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">
            100% Automated
          </Badge>
        </div>

        <h2 className="text-base sm:text-lg font-extrabold text-foreground leading-snug line-clamp-1">
          Trade Without Watching the Screen
        </h2>

        <p className="mt-1 text-xs sm:text-sm text-muted-foreground leading-snug line-clamp-2">
          Connect your MT5 or MT4 account once, and every verified signal from
          our team is copied instantly to your trading account.
        </p>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-medium text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-primary" /> Zero Delay Execution
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Secure & Private
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-primary" /> Setup Under 5 Minutes
          </span>
        </div>

        <Button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="mt-3 w-full sm:w-auto font-bold"
          size="default"
        >
          Start Copy Trading Now <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !visibleStats || visibleStats.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">No copier accounts published yet</p>
          <p className="text-muted-foreground text-sm mt-1">
            Connect your MT5 account and check back once it's live.
          </p>
        </div>
      ) : (
        <div id="copier-leaderboard-list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {visibleStats.map((s) => {
              const rejectedMessage = `Hello, my name is ${s.name || "Copier User"}. I submitted an MT5 Copier connection request which was rejected. Could you please let me know the reason? Thank you.`;
              const telegramUrl = `https://t.me/forexqueeni?text=${encodeURIComponent(rejectedMessage)}`;

              return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(s);
                  }
                }}
                className="text-left rounded-2xl border border-border/60 bg-card p-4 shadow-sm card-3d-hover cursor-pointer"
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
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] h-4 px-1.5"
                            : s.status === "rejected"
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] h-4 px-1.5"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] h-4 px-1.5"
                        }
                      >
                        {s.status === "connected"
                          ? "Connected"
                          : s.status === "rejected"
                          ? "Rejected"
                          : "Pending"}
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

                {s.status === "rejected" && (
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 text-xs font-semibold py-2 transition-colors"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Ask Reason (Telegram)
                  </a>
                )}
              </div>
              );
          })}
        </div>
      )}

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

      <MT5CopierConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConfirmed={() =>
          document.getElementById("copier-leaderboard-list")?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />
    </>
  );
};

export default CopierLeaderboard;
