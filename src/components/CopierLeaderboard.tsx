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
  DollarSign,
  Bot,
  LockKeyhole,
  Ban,
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

const fmtPercent = (v: number | null) =>
  v === null || v === undefined ? "—" : `${v}%`;

const fmtMoney = (v: number | null) =>
  v === null || v === undefined ? "—" : `$${v}`;

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
    <div className="pb-24">
      {/* =========================================================
          ULTRA-PROFESSIONAL REDESIGNED HERO BANNER
      ========================================================= */}
      <div className="relative mb-4 overflow-hidden rounded-[24px] border border-emerald-500/30 bg-gradient-to-br from-[#022f27] via-[#033a2f] to-[#011c17] p-4 shadow-[0_12px_35px_rgba(2,47,39,0.35)] sm:p-5">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-emerald-400/20 blur-[55px]" />
        <div className="pointer-events-none absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-400/10 blur-[55px]" />

        {/* Tech Grid Pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(110,231,183,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative">
          {/* Top Status & Platform Badges */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 backdrop-blur-md">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              <span className="text-[10px] font-extrabold tracking-wider text-emerald-200">
                AI COPY TRADING PRO
              </span>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-black/40 px-3 py-1 border border-emerald-500/20 backdrop-blur-md">
              <span className="text-[10px] font-extrabold text-emerald-300">MT5</span>
              <span className="text-[10px] text-emerald-500/40">•</span>
              <span className="text-[10px] font-extrabold text-sky-300">MT4</span>
            </div>
          </div>

          {/* Main Hero Body with Mini Live Chart Graphic */}
          <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tight text-white sm:text-2xl">
                Automate Your <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">Trading Signals</span>
              </h1>
              <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70 sm:text-xs">
                Link your official MT5/MT4 account securely and mirror high-winrate signals automatically.
              </p>
            </div>

            {/* Mini SVG Chart Card Icon */}
            <div className="relative flex h-16 w-20 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-[#012620]/90 p-1.5 shadow-inner">
              <svg viewBox="0 0 100 50" className="h-full w-full">
                <defs>
                  <linearGradient id="miniChartGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 45 L15 32 L30 38 L45 20 L60 25 L75 12 L90 18 L100 5 L100 50 L0 50 Z"
                  fill="url(#miniChartGrad)"
                />
                <path
                  d="M0 45 L15 32 L30 38 L45 20 L60 25 L75 12 L90 18 L100 5"
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                <TrendingUp className="h-3 w-3" />
              </div>
            </div>
          </div>

          {/* Feature Highlights Grid */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-black/25 py-2 px-1.5 backdrop-blur-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-100 truncate">100% Secure</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-black/25 py-2 px-1.5 backdrop-blur-sm">
              <DollarSign className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-100 truncate">$100 Min</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/20 bg-black/25 py-2 px-1.5 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-[10px] font-bold text-emerald-100 truncate">Instant Sync</span>
            </div>
          </div>

          {/* Premium Connect Button */}
          <Button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="mt-4 h-12 w-full rounded-xl border border-emerald-300/30 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-400 text-xs font-black text-white shadow-[0_8px_20px_rgba(16,185,129,0.3)] hover:from-emerald-400 hover:to-teal-300 sm:h-13 sm:text-sm"
          >
            <Link2 className="mr-2 h-4 w-4" />
            <span>Connect MT5 / MT4 Account</span>
            <ChevronRight className="ml-1.5 h-4 w-4" />
          </Button>

          {/* Trust Subtext */}
          <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[9px] text-emerald-200/50 sm:text-[10px]">
            <LockKeyhole className="h-3 w-3 text-emerald-400" />
            <span>Encrypted broker connection</span>
            <span>•</span>
            <span>Setup takes under 2 minutes</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          IMPORTANT REQUIREMENTS
      ========================================================= */}
      <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-4.5 w-4.5" />
              </div>

              <div>
                <h3 className="font-bold text-sm text-foreground sm:text-base">
                  Important Requirements
                </h3>

                <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
                  Please read before connecting your account
                </p>
              </div>
            </div>
          </div>

          <Badge
            variant="secondary"
            className="shrink-0 bg-amber-500/15 text-[9px] font-semibold text-amber-600 dark:text-amber-400 sm:text-[10px]"
          >
            Required
          </Badge>
        </div>

        <div className="mt-4 space-y-2.5">
          {/* BALANCE */}
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground sm:text-sm">
                Account Balance — $100 Minimum, Unlimited Maximum
              </div>

              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                A minimum account balance of{" "}
                <span className="font-semibold text-foreground">$100</span>{" "}
                is required. There is{" "}
                <span className="font-semibold text-foreground">
                  no maximum balance limit
                </span>
                .
              </p>
            </div>
          </div>

          {/* PROFIT SHARE */}
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground sm:text-sm">
                Profit Share — 35%
              </div>

              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                <span className="font-semibold text-foreground">
                  35% of generated profits
                </span>{" "}
                will be shared with our team. The remaining{" "}
                <span className="font-semibold text-foreground">
                  65% belongs to you
                </span>
                .
              </p>
            </div>
          </div>

          {/* TELEGRAM */}
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Send className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground sm:text-sm">
                Automatic Profit Updates
              </div>

              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                Our{" "}
                <span className="font-semibold text-foreground">
                  team bot will automatically send your profit and performance
                  details
                </span>{" "}
                through Telegram.
              </p>
            </div>
          </div>

          {/* TELEGRAM VERIFICATION */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Bot className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground sm:text-sm">
                Telegram Verification is Required
              </div>

              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                After submitting your copy trading request, a verification
                popup will appear. You{" "}
                <span className="font-semibold text-foreground">
                  must start the Telegram bot
                </span>{" "}
                by tapping{" "}
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  “Start Bot to Confirm Request”
                </span>{" "}
                to complete your verification.
              </p>
            </div>
          </div>

          {/* NOT ACCEPTED */}
          <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Ban className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground sm:text-sm">
                Account Types Not Accepted
              </div>

              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                <span className="font-semibold text-rose-600 dark:text-rose-400">
                  Demo, Cent, Contest, and Bonus accounts
                </span>{" "}
                cannot be connected. Requests using these account types will
                be rejected.
              </p>
            </div>
          </div>

          {/* MT5 DETAILS */}
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <LockKeyhole className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs font-bold text-foreground sm:text-sm">
                Provide Correct MT5 Details
              </div>

              <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground sm:text-[11px]">
                Make sure your{" "}
                <span className="font-semibold text-foreground">
                  MT5 Login, Broker Name, Broker Server, and Trading Password
                </span>{" "}
                are entered correctly so our team can verify and connect your
                account.
              </p>
            </div>
          </div>
        </div>

        {/* WARNING */}
        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 shrink-0 text-amber-500">
              <span className="text-sm">⚠️</span>
            </div>

            <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-300 sm:text-[11px]">
              <span className="font-bold">Important:</span> After submitting
              your request, you{" "}
              <span className="font-bold">MUST start the Telegram bot</span>{" "}
              from the verification popup. Your request cannot be fully
              verified until the bot is started.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================
          DIVIDER
      ========================================================= */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60" />
        </div>

        <div className="relative flex justify-center">
          <span className="flex items-center gap-1.5 bg-background px-3 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            <BarChart3 className="h-3.5 w-3.5" />
            Live Leaderboard & Performance
          </span>
        </div>
      </div>

      {/* =========================================================
          LEADERBOARD
      ========================================================= */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !visibleStats || visibleStats.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-lg text-muted-foreground">
            No copier accounts published yet
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Connect your MT5 account and check back once it's live.
          </p>
        </div>
      ) : (
        <div
          id="copier-leaderboard-list"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {visibleStats.map((s) => {
            const rejectedMessage = `Hello, my name is ${
              s.name || "Copier User"
            }. I submitted an MT5 Copier connection request which was rejected. Could you please let me know the reason? Thank you.`;

            const telegramUrl = `https://t.me/forexqueeni?text=${encodeURIComponent(
              rejectedMessage
            )}`;

            {/* CONNECTED */}
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
                  className="card-3d-hover cursor-pointer rounded-2xl border border-emerald-500/20 bg-card p-4 text-left shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <User className="h-4.5 w-4.5" />
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">
                          {s.name || "Copier User"}
                        </div>

                        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          CONNECTED
                        </span>
                      </div>
                    </div>

                    <div className="min-w-0 shrink-0 text-right">
                      <div className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        {lastSyncLabel(s)}
                      </div>

                      <div className="mt-0.5 flex items-center justify-end gap-1 truncate text-[10px] font-medium text-foreground">
                        <Database className="h-3 w-3 shrink-0 text-emerald-500" />

                        <span className="truncate">
                          {brokerLabel(s)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 divide-x divide-border/50 rounded-xl bg-muted/30 py-2.5">
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                        <TrendingUp className="h-3 w-3" />
                        Profit
                      </span>

                      <span className="mt-0.5 text-sm font-bold">
                        +{fmtPercent(s.profit_percent)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-destructive">
                        <TrendingDown className="h-3 w-3" />
                        Loss
                      </span>

                      <span className="mt-0.5 text-sm font-bold">
                        -{fmtPercent(s.loss_percent)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                        <Gauge className="h-3 w-3" />
                        R:R
                      </span>

                      <span className="mt-0.5 truncate text-sm font-bold">
                        {s.risk_reward_ratio || "—"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-center text-[10px] text-muted-foreground">
                    Connected since {format(new Date(s.created_at), "PP")}
                  </p>
                </div>
              );
            }

            {/* PENDING */}
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
                  className="card-3d-hover flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-amber-500/20 bg-card p-4 text-left shadow-sm"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <User className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">
                        {s.name || "Copier User"}
                      </div>

                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        PENDING
                      </span>

                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
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
                    className="h-8 shrink-0 border-amber-500/30 text-[11px] text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                  >
                    View Request
                    <ChevronRight className="ml-0.5 h-3 w-3" />
                  </Button>
                </div>
              );
            }

            {/* REJECTED */}
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
                className="card-3d-hover cursor-pointer rounded-2xl border border-rose-500/20 bg-card p-4 text-left shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                      <User className="h-4.5 w-4.5" />
                    </div>

                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold">
                        {s.name || "Copier User"}
                      </div>

                      <span className="mt-0.5 flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        REJECTED
                      </span>

                      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
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
                  className="mt-3 flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-500/15 dark:text-rose-400"
                >
                  <Send className="h-3.5 w-3.5" />
                  Ask Reason (Telegram)
                </a>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================
          DETAILS DIALOG
      ========================================================= */}
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
                <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5 text-xs">
                  <span className="font-medium text-muted-foreground">
                    Broker
                  </span>

                  <span className="font-bold text-foreground">
                    {brokerPlain(selected)}
                  </span>
                </div>

                {selected.status === "pending" ? (
                  <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      PENDING
                    </span>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Your account is still waiting for admin verification.
                      We'll update this as soon as it's reviewed.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Profit
                        </div>

                        <div className="text-lg font-bold">
                          {fmtPercent(selected.profit_percent)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {fmtMoney(selected.profit_amount)}
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-1 text-xs font-semibold text-destructive">
                          <TrendingDown className="h-3.5 w-3.5" />
                          Loss
                        </div>

                        <div className="text-lg font-bold">
                          {fmtPercent(selected.loss_percent)}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {fmtMoney(selected.loss_amount)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-3">
                      <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <Gauge className="h-3.5 w-3.5" />
                        Risk : Reward Ratio
                      </div>

                      <div className="text-lg font-bold">
                        {selected.risk_reward_ratio || "—"}
                      </div>
                    </div>
                  </>
                )}

                <p className="text-center text-[11px] text-muted-foreground">
                  {selected.status === "pending"
                    ? "Submitted"
                    : "Connected since"}{" "}
                  {format(new Date(selected.created_at), "PP")}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================
          CONNECT DIALOG
      ========================================================= */}
      <MT5CopierConnectDialog
        open={connectOpen}
        onOpenChange={setConnectOpen}
        onConfirmed={() =>
          document
            .getElementById("copier-leaderboard-list")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
        }
      />

      {/* =========================================================
          BOTTOM NAVIGATION
      ========================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-w-md items-center justify-between border-t border-border/40 bg-background/95 px-4 py-2 backdrop-blur sm:max-w-xl">
        <button className="flex flex-col items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
          <LineChart className="h-5 w-5" />

          <span className="text-[10px] font-bold">Signals</span>

          <span className="mt-0.5 h-1 w-6 rounded-full bg-emerald-500" />
        </button>

        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground">
          <BarChart3 className="h-5 w-5" />

          <span className="text-[10px] font-medium">Results</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground">
          <FileText className="h-5 w-5" />

          <span className="text-[10px] font-medium">Account</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground">
          <Wallet className="h-5 w-5" />

          <span className="text-[10px] font-medium">Premium</span>
        </button>

        <button className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-foreground">
          <UserCheck className="h-5 w-5" />

          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
};

export default CopierLeaderboard;
