import { useState, Fragment } from "react";
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
  Zap,
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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
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

const fmtPercent = (v: number | null) => (v === null || v === undefined ? "—" : `${v}%`);
const fmtMoney = (v: number | null) => (v === null || v === undefined ? "—" : `$${v}`);

// Builds the "MT5 • Broker — Server" label from whatever broker fields the
// account actually has, instead of a single hardcoded broker for everyone.
const brokerLabel = (s: PublicCopierStat) => {
  if (!s.broker_name) return "MT5 Account";
  return s.broker_server ? `MT5 • ${s.broker_name} — ${s.broker_server}` : `MT5 • ${s.broker_name}`;
};

// Real relative time since the account's performance was last updated by
// admin — last_synced_at is never populated (the auto-sync cron was
// removed), so basing this on it would show "Not synced yet" for everyone.
const lastSyncLabel = (s: PublicCopierStat) => {
  const ts = s.last_synced_at || s.updated_at || s.created_at;
  if (!ts) return "Not synced yet";
  return `Updated ${formatDistanceToNow(new Date(ts), { addSuffix: true })}`;
};

const HOW_IT_WORKS = [
  { step: "01", icon: Link2, title: "Connect", desc: "Connect your MT5/MT4 account" },
  { step: "02", icon: ShieldCheck, title: "Verify", desc: "Our team verifies your account" },
  { step: "03", icon: Zap, title: "Auto Copy", desc: "Verified signals are copied automatically" },
  { step: "04", icon: BarChart3, title: "Track", desc: "Monitor profit, loss & performance" },
];

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
    <div className="pb-20">
      {/* HERO SECTION */}
      <div className="relative mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-950 p-4 shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative flex items-start gap-3">
          <div className="relative h-24 w-16 sm:h-28 sm:w-20 shrink-0 mt-0.5">
            <div className="absolute inset-0 rounded-2xl border-2 border-emerald-300/30 bg-gradient-to-b from-white/[0.08] to-white/[0.01] shadow-[0_0_22px_rgba(16,185,129,0.35)]" />
            <div className="absolute inset-x-1.5 top-2 bottom-3 overflow-hidden rounded-lg bg-emerald-950/60">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#6ee7b7" />
                  </linearGradient>
                  <filter id="chartGlow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="2.4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                {[35, 55, 30, 75, 50, 80, 60].map((h, i) => (
                  <rect
                    key={i}
                    x={i * 13 + 4}
                    y={100 - h}
                    width="7"
                    height={h}
                    rx="1.5"
                    fill="url(#barGrad)"
                    opacity="0.85"
                  />
                ))}
                <polyline
                  points="4,85 20,65 36,72 52,40 68,48 88,15"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#chartGlow)"
                />
              </svg>
            </div>
            <div className="absolute -left-3 top-1 -rotate-6 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 px-1.5 py-1 text-[8px] font-extrabold text-white shadow-lg shadow-emerald-500/40">
              MT5
            </div>
            <div className="absolute -right-3 top-8 sm:top-9 rotate-6 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 px-1.5 py-1 text-[8px] font-extrabold text-white shadow-lg shadow-sky-500/40">
              MT4
            </div>
            <div
              className="absolute -bottom-2 left-1/2 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full shadow-[0_6px_16px_rgba(16,185,129,0.55)]"
              style={{ background: "radial-gradient(circle at 32% 30%, #a7f3d0, #10b981 70%)" }}
            >
              <RefreshCw className="h-3.5 w-3.5 text-white drop-shadow-sm" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <Badge className="bg-emerald-400/15 text-emerald-300 text-[9px] font-bold hover:bg-emerald-400/15">
              MT5 & MT4 COPY
            </Badge>

            <h2 className="mt-1.5 text-base sm:text-xl font-extrabold text-white leading-tight whitespace-nowrap">
              Automate Your <span className="text-emerald-400">Signals</span>
            </h2>

            <p className="mt-1 text-[11px] sm:text-sm text-emerald-100/70 leading-snug">
              Connect your MT5 or MT4 account and let verified signals execute automatically.
            </p>

            <div className="mt-2 flex flex-wrap gap-x-2.5 gap-y-1 text-[9px] sm:text-[11px] font-medium text-emerald-100/85">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Auto Copy
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Secure
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Performance
              </span>
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => setConnectOpen(true)}
          className="relative mt-3 w-full h-10 sm:h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-500/20"
        >
          <Link2 className="h-3.5 w-3.5 mr-1.5" />
          Connect MT5 / MT4
          <ChevronRight className="h-3.5 w-3.5 ml-1.5" />
        </Button>
      </div>

      {/* HOW IT WORKS */}
      <div className="mb-3 rounded-2xl border border-border/50 bg-card p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              How Copy Trading Works
            </h3>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              Simple 4 steps to start copying verified signals
            </p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold gap-1"
          >
            <ShieldCheck className="h-3 w-3" /> 100% Safe & Secure
          </Badge>
        </div>

        <div className="mt-4 flex items-start gap-1 sm:gap-2">
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }, idx) => (
            <Fragment key={step}>
              <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="absolute -top-1 -left-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-900 px-1 text-[8px] font-bold text-white">
                    {step}
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] sm:text-xs font-bold text-foreground leading-tight">
                  {title}
                </div>
                <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-snug mt-0.5 px-0.5">
                  {desc}
                </div>
              </div>
              {idx < HOW_IT_WORKS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0 mt-2.5 sm:mt-3" />
              )}
            </Fragment>
          ))}
        </div>
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

            // CONNECTED CARD (Matched with Image style: Last sync & Broker info)
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
                  className="text-left rounded-2xl border border-emerald-500/20 bg-card p-4 shadow-sm card-3d-hover cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <User className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{s.name || "Copier User"}</div>
                        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          CONNECTED
                        </span>
                      </div>
                    </div>

                    {/* Right side info matching screenshot style */}
                    <div className="text-right shrink-0 min-w-0">
                      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" /> {lastSyncLabel(s)}
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
                      <span className="text-sm font-bold mt-0.5">+{fmtPercent(s.profit_percent)}</span>
                    </div>
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-destructive text-[10px] font-semibold">
                        <TrendingDown className="h-3 w-3" /> Loss
                      </span>
                      <span className="text-sm font-bold mt-0.5">-{fmtPercent(s.loss_percent)}</span>
                    </div>
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-primary text-[10px] font-semibold">
                        <Gauge className="h-3 w-3" /> R:R
                      </span>
                      <span className="text-sm font-bold mt-0.5 truncate">{s.risk_reward_ratio || "—"}</span>
                    </div>
                  </div>
                </div>
              );
            }

            // PENDING CARD
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
                  className="text-left rounded-2xl border border-amber-500/20 bg-card p-4 shadow-sm card-3d-hover cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{s.name || "Copier User"}</div>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        PENDING
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Your account is waiting for admin verification.
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
                    View Request <ChevronRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
              );
            }

            // REJECTED CARD
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
                className="text-left rounded-2xl border border-rose-500/20 bg-card p-4 shadow-sm card-3d-hover cursor-pointer"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <User className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm truncate">{s.name || "Copier User"}</div>
                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        REJECTED
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        Your account request was rejected.
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

      {/* DIALOG MODAL */}
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
                {selected.status === "pending" ? (
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      PENDING
                    </span>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Your account is still waiting for admin verification. We'll update this as soon as it's reviewed.
                    </p>
                  </div>
                ) : (
                  <>
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
                  </>
                )}

                <p className="text-[11px] text-muted-foreground text-center">
                  {selected.status === "pending" ? "Submitted" : "Connected since"}{" "}
                  {format(new Date(selected.created_at), "PP")}
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

      {/* BOTTOM NAVIGATION BAR (Fixed like App design) */}
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
