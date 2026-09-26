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
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Gauge,
  User,
  ChevronRight,
  ShieldCheck,
  BarChart3,
  Send,
  Link2,
  RefreshCw,
  Clock,
  Database,
  LineChart,
  FileText,
  UserCheck,
  Wallet,
  DollarSign,
  Bot,
  LockKeyhole,
  Ban,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { MT5CopierConnectDialog } from "@/components/MT5CopierConnectDialog";
import { isOwnCopierRequestId } from "@/lib/myCopierRequests";

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
  updated_at?: string;
  broker_name?: string | null;
  broker_server?: string | null;
  last_synced_at?: string | null;
}

const fmtPercent = (v: number | null) =>
  v === null || v === undefined ? "—" : `${v}%`;

const brokerPlain = (s: PublicCopierStat) => {
  if (!s.broker_name) return "Not specified";
  return s.broker_server
    ? `${s.broker_name} — ${s.broker_server}`
    : s.broker_name;
};

const brokerLabel = (s: PublicCopierStat) =>
  s.broker_name ? `MT5 • ${brokerPlain(s)}` : "MT5 • Account";

const lastSyncLabel = (s: PublicCopierStat) => {
  const ts = s.last_synced_at || s.updated_at || s.created_at;
  if (!ts) return "Not synced yet";
  return `Updated ${formatDistanceToNow(new Date(ts), {
    addSuffix: true,
  })}`;
};

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

  const visibleStats = stats?.filter(
    (s) => s.status !== "rejected" || isOwnCopierRequestId(s.id)
  );

  return (
    <div className="pb-24 px-3 sm:px-4 pt-4 max-w-[950px] mx-auto">

      {/* =========================================================
          EXACT 920x300 HERO BANNER (FIXED DIMENSIONS & SIDE-BY-SIDE)
          ========================================================= */}
      <div 
        className="relative mb-6 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#061c12] via-[#02130a] to-[#010a05] px-6 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.6),0_0_35px_rgba(0,255,136,0.12)] border border-[#00ff88]/25 text-white flex flex-col justify-between"
        style={{ width: "100%", maxWidth: "920px", minHeight: "300px", margin: "0 auto" }}
      >

        {/* Top Row: Badge & Content Grid */}
        <div>
          {/* Top Badge */}
          <div className="inline-flex items-center gap-1.5 bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] px-3 py-1 rounded-full font-bold text-xs mb-3">
            <span>⚡</span> MT5 & MT4 COPY
          </div>

          {/* Main Grid: Left Text & Right Graphic */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
            
            {/* Left Text Section (7 cols) */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              
              <h1 className="text-2xl sm:text-3xl lg:text-[36px] font-black leading-[1.1] tracking-tight mb-2">
                Automate Your <br />
                <span className="text-[#00ff88]">Trading Signals</span>
              </h1>

              <p className="text-[#b0c4b8] text-xs sm:text-sm leading-relaxed mb-3 max-w-md">
                Connect your real MT5 or MT4 account and let verified signals execute automatically.
              </p>

              {/* Features Sub-row */}
              <div className="flex items-center gap-3 text-xs font-semibold text-white/90">
                <div className="flex items-center gap-1"><span className="text-[#00ff88]">⚡</span> Auto Copy</div>
                <div className="w-px h-3 bg-[#00ff88]/30"></div>
                <div className="flex items-center gap-1"><span className="text-[#00ff88]">🛡️</span> Secure</div>
                <div className="w-px h-3 bg-[#00ff88]/30"></div>
                <div className="flex items-center gap-1"><span className="text-[#00ff88]">📊</span> Performance</div>
              </div>

            </div>

            {/* Right Phone Mockup Graphic (5 cols) */}
            <div className="lg:col-span-5 flex justify-center items-center">
              <div className="relative w-[150px] h-[170px] flex justify-center items-center">
                
                {/* MT5 Badge */}
                <div className="absolute -top-1 -left-3 bg-[#00c853] text-white px-2.5 py-0.5 rounded-full font-extrabold text-[10px] shadow-md z-30">
                  MT5
                </div>

                {/* MT4 Badge */}
                <div className="absolute top-10 -right-3 bg-[#2979ff] text-white px-2.5 py-0.5 rounded-full font-extrabold text-[10px] shadow-md z-30">
                  MT4
                </div>

                {/* Phone Frame */}
                <div className="w-[120px] h-[170px] bg-[#04120a] border-[3px] border-[#00ff88] rounded-[20px] flex flex-col justify-between items-center p-2.5 shadow-[0_0_25px_rgba(0,255,136,0.35)] z-20 relative overflow-hidden">
                  <div className="text-[9px] font-extrabold text-[#00ff88] flex items-center gap-1">
                    📈 Live Signals
                  </div>
                  <div className="w-7 h-7 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/50 flex items-center justify-center text-[#00ff88] mb-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  </div>
                </div>

                {/* Ground Glow */}
                <div className="absolute bottom-0 w-[100px] h-[20px] bg-[radial-gradient(ellipse_at_center,rgba(0,255,136,0.7)_0%,rgba(0,0,0,0)_70%)] rounded-full z-10"></div>
              
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Connect Button */}
        <div className="mt-3 pt-3 border-t border-[#00ff88]/15">
          <Button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="w-full bg-gradient-to-r from-[#00e676] via-[#00c853] to-[#00b050] hover:opacity-95 text-[#051a0e] font-black text-sm sm:text-base py-3.5 rounded-xl shadow-[0_6px_20px_rgba(0,230,118,0.35)] transition-all flex items-center justify-between px-4"
          >
            <span className="flex items-center gap-2">
              <Link2 className="h-4 w-4" /> Connect MT5 / MT4
            </span>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {/* =========================================================
          IMPORTANT REQUIREMENTS
          ========================================================= */}
      <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-card p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-foreground">
                  Important Requirements
                </h3>
                <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                  Please read before connecting your account
                </p>
              </div>
            </div>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] sm:text-[10px] font-semibold"
          >
            Required
          </Badge>
        </div>

        <div className="mt-4 space-y-2.5">
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Account Balance — $100 Minimum, Unlimited Maximum
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
                A minimum account balance of <span className="font-semibold text-foreground">$100</span> is required. There is <span className="font-semibold text-foreground">no maximum balance limit</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Profit Share — 35%
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">35% of generated profits</span> will be shared with our team. The remaining <span className="font-semibold text-foreground">65% belongs to you</span>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Send className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Automatic Profit Updates
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
                Our <span className="font-semibold text-foreground">team bot will automatically send your profit and performance details</span> through Telegram.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Telegram Verification is Required
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
                After submitting your copy trading request, a verification popup will appear. You <span className="font-semibold text-foreground">must start the Telegram bot</span> by tapping <span className="font-semibold text-amber-600 dark:text-amber-400">“Start Bot to Confirm Request”</span> to complete your verification.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Ban className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Account Types Not Accepted
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-rose-600 dark:text-rose-400">Demo, Cent, Contest, and Bonus accounts</span> cannot be connected. Requests using these account types will be rejected.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <LockKeyhole className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Provide Correct MT5 Details
              </div>
              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
                Make sure your <span className="font-semibold text-foreground">MT5 Login, Broker Name, Broker Server, and Trading Password</span> are entered correctly so our team can verify and connect your account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          LEADERBOARD DIVIDER & LIST
          ========================================================= */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs font-extrabold tracking-wider uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Live Leaderboard & Performance
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !visibleStats || visibleStats.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            No copier accounts published yet
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            Connect your MT5 account and check back once it's live.
          </p>
        </div>
      ) : (
        <div
          id="copier-leaderboard-list"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {visibleStats.map((s) => {
            const rejectedMessage = `Hello, my name is ${
              s.name || "Copier User"
            }. I submitted an MT5 Copier connection request which was rejected. Could you please let me know the reason? Thank you.`;

            const telegramUrl = `https://t.me/forexqueeni?text=${encodeURIComponent(
              rejectedMessage
            )}`;

            if (s.status === "connected") {
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
                  className="text-left rounded-2xl border border-emerald-500/20 bg-card p-4 shadow-sm cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">
                          {s.name || "Copier User"}
                        </div>
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          CONNECTED
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 min-w-0">
                      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {lastSyncLabel(s)}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] font-medium text-foreground mt-0.5 truncate">
                        <Database className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">{brokerLabel(s)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 divide-x divide-border/50 rounded-xl bg-muted/30 py-2.5">
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-semibold">
                        <TrendingUp className="h-3 w-3" /> Profit
                      </span>
                      <span className="text-sm font-bold mt-0.5">
                        +{fmtPercent(s.profit_percent)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-destructive text-[10px] font-semibold">
                        <TrendingDown className="h-3 w-3" /> Loss
                      </span>
                      <span className="text-sm font-bold mt-0.5">
                        -{fmtPercent(s.loss_percent)}
                      </span>
                    </div>
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-primary text-[10px] font-semibold">
                        <Gauge className="h-3 w-3" /> R:R
                      </span>
                      <span className="text-sm font-bold mt-0.5 truncate">
                        {s.risk_reward_ratio || "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            if (s.status === "pending") {
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
                  className="text-left rounded-2xl border border-amber-500/20 bg-card p-4 shadow-sm cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">
                        {s.name || "Copier User"}
                      </div>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        PENDING
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Broker: {brokerPlain(s)} • Waiting for verification.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(s);
                    }}
                    className="h-8 shrink-0 text-[11px] border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                  >
                    View Request
                    <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              );
            }

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
                className="text-left rounded-2xl border border-rose-500/20 bg-card p-4 shadow-sm cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">
                        {s.name || "Copier User"}
                      </div>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        REJECTED
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Broker: {brokerPlain(s)} • Request rejected.
                      </p>
                    </div>
                  </div>
                </div>
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
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog and Bottom Navigation */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="sm:max-w-sm">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <DialogTitle className="text-base">
                    {selected.name || "Copier User"}
                  </DialogTitle>
                </div>
              </DialogHeader>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/40 p-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">Broker</span>
                  <span className="font-bold text-foreground">{brokerPlain(selected)}</span>
                </div>
                {selected.status === "pending" ? (
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> PENDING
                    </span>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Your account is still waiting for admin verification.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
                        <TrendingUp className="h-3.5 w-3.5" /> Profit
                      </div>
                      <div className="text-lg font-bold">
                        {fmtPercent(selected.profit_percent)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center gap-1 text-destructive text-xs font-semibold">
                        <TrendingDown className="h-3.5 w-3.5" /> Loss
                      </div>
                      <div className="text-lg font-bold">
                        {fmtPercent(selected.loss_percent)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <MT5CopierConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConfirmed={() =>
          document
            .getElementById("copier-leaderboard-list")
            ?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      />

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border/40 px-4 py-2 flex items-center justify-between max-w-md mx-auto sm:max-w-xl">
        <button className="flex flex-col items-center text-emerald-600 dark:text-emerald-400 gap-0.5">
          <LineChart className="h-5 w-5" />
          <span className="text-[10px] font-bold">Signals</span>
          <span className="h-1 w-6 bg-emerald-500 rounded-full mt-0.5" />
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground gap-0.5">
          <BarChart3 className="h-5 w-5" />
          <span className="text-[10px] font-medium">Results</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground gap-0.5">
          <FileText className="h-5 w-5" />
          <span className="text-[10px] font-medium">Account</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground gap-0.5">
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] font-medium">Premium</span>
        </button>
        <button className="flex flex-col items-center text-muted-foreground hover:text-foreground gap-0.5">
          <UserCheck className="h-5 w-5" />
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>

    </div>
  );
};

export default CopierLeaderboard;
