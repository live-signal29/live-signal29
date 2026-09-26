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
          COMPACT HERO — 920 x 350 STYLE / HORIZONTAL
      ========================================================= */}
      <div
        className="
          relative mb-3 overflow-hidden rounded-[22px]
          border border-emerald-400/20
          bg-gradient-to-br from-[#003d2f] via-[#005341] to-[#00261f]
          shadow-[0_12px_35px_rgba(0,80,60,0.20)]
          aspect-[920/350]
          w-full
        "
      >
        {/* Background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-emerald-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-52 w-52 rounded-full bg-emerald-300/10 blur-3xl" />

        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(110,231,183,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,0.5) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Decorative chart line */}
        <svg
          className="pointer-events-none absolute bottom-10 left-[35%] h-28 w-[62%] opacity-[0.10]"
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
        >
          <path
            d="M0 145 C70 125 90 145 150 105 C210 65 230 125 300 95 C370 65 395 105 450 55 C500 10 550 35 600 0"
            fill="none"
            stroke="#6ee7b7"
            strokeWidth="4"
          />
        </svg>

        <div className="relative h-full w-full p-3 sm:p-4">

          {/* TOP BADGES */}
          <div className="flex items-center justify-between gap-2">

            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1.5 text-[9px] sm:text-[11px] font-bold text-emerald-100 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.8)]" />
              MT5 & MT4 COPY
            </div>

            <div className="flex items-center gap-1.5">
              <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[9px] sm:text-[11px] font-bold text-emerald-100">
                MT5
              </span>

              <span className="text-[10px] text-emerald-100/50">
                /
              </span>

              <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1.5 text-[9px] sm:text-[11px] font-bold text-sky-200">
                MT4
              </span>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="mt-2 grid grid-cols-[34%_66%] items-center">

            {/* CHART */}
            <div className="relative flex items-center justify-center">
              <div
                className="
                  relative h-[92px] w-[78px]
                  sm:h-[118px] sm:w-[98px]
                  rounded-[22px]
                  border border-emerald-300/25
                  bg-emerald-950/45
                  shadow-[0_0_25px_rgba(16,185,129,0.18)]
                "
              >
                <div
                  className="absolute inset-2 rounded-[15px] overflow-hidden"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(110,231,183,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(110,231,183,0.10) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="h-full w-full"
                  >
                    <defs>
                      <linearGradient
                        id="heroBarGradient"
                        x1="0"
                        y1="1"
                        x2="0"
                        y2="0"
                      >
                        <stop offset="0%" stopColor="#059669" />
                        <stop offset="100%" stopColor="#6ee7b7" />
                      </linearGradient>

                      <filter
                        id="heroChartGlow"
                        x="-60%"
                        y="-60%"
                        width="220%"
                        height="220%"
                      >
                        <feGaussianBlur
                          stdDeviation="2"
                          result="blur"
                        />

                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {[30, 45, 35, 62, 50, 75, 60].map((h, i) => (
                      <rect
                        key={i}
                        x={i * 13 + 4}
                        y={100 - h}
                        width="7"
                        height={h}
                        rx="1.5"
                        fill="url(#heroBarGradient)"
                        opacity="0.75"
                      />
                    ))}

                    <polyline
                      points="4,82 20,65 35,73 50,48 64,57 82,22 92,12"
                      fill="none"
                      stroke="#6ee7b7"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#heroChartGlow)"
                    />

                    <circle
                      cx="92"
                      cy="12"
                      r="3"
                      fill="#d1fae5"
                    />
                  </svg>
                </div>

                {/* MT5 badge */}
                <div className="absolute -left-4 top-4 rotate-[-5deg] rounded-full bg-gradient-to-br from-emerald-300 to-emerald-500 px-3 py-1.5 text-[9px] sm:text-[11px] font-extrabold text-white shadow-lg shadow-emerald-500/30">
                  MT5
                </div>

                {/* MT4 badge */}
                <div className="absolute -right-4 top-12 rotate-[5deg] rounded-full bg-gradient-to-br from-sky-400 to-blue-600 px-3 py-1.5 text-[9px] sm:text-[11px] font-extrabold text-white shadow-lg shadow-blue-500/30">
                  MT4
                </div>

                {/* Sync button */}
                <div
                  className="
                    absolute -bottom-4 left-1/2
                    flex h-10 w-10 -translate-x-1/2
                    items-center justify-center
                    rounded-full
                    border border-white/20
                    shadow-[0_6px_20px_rgba(16,185,129,0.45)]
                  "
                  style={{
                    background:
                      "radial-gradient(circle at 32% 28%, #a7f3d0, #10b981 70%)",
                  }}
                >
                  <RefreshCw className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>

            {/* TEXT */}
            <div className="min-w-0 pr-1">

              <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold tracking-wide text-emerald-200/80">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-emerald-300/50">
                  <ShieldCheck className="h-3 w-3" />
                </span>

                AUTOMATED COPY TRADING
              </div>

              <h2 className="mt-1 text-[22px] leading-[0.98] sm:text-[30px] lg:text-[34px] font-extrabold tracking-tight text-white">
                Automate Your{" "}
                <span className="block text-emerald-400">
                  Trading Signal
                </span>
              </h2>

              <p className="mt-1.5 max-w-[360px] text-[9px] leading-snug sm:text-[12px] text-emerald-100/70">
                Connect your real MT5 or MT4 account and let verified signals
                execute automatically.
              </p>
            </div>
          </div>

          {/* FEATURES */}
          <div
            className="
              mt-1.5 grid grid-cols-3
              overflow-hidden rounded-2xl
              border border-emerald-300/15
              bg-emerald-950/20
            "
          >
            <div className="flex items-center justify-center gap-1.5 border-r border-emerald-300/15 py-2 sm:py-2.5">
              <Zap className="h-4 w-4 text-emerald-300" />
              <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-100/75">
                Auto Copy
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 border-r border-emerald-300/15 py-2 sm:py-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-100/75">
                Secure
              </span>
            </div>

            <div className="flex items-center justify-center gap-1.5 py-2 sm:py-2.5">
              <BarChart3 className="h-4 w-4 text-emerald-300" />
              <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-100/75">
                Performance
              </span>
            </div>
          </div>

          {/* ACCOUNT INFO */}
          <div
            className="
              mt-1.5 grid grid-cols-2
              overflow-hidden rounded-2xl
              border border-emerald-300/15
              bg-emerald-950/20
            "
          >
            <div className="flex items-center justify-center gap-2 border-r border-emerald-300/15 py-1.5 sm:py-2">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />

              <div>
                <div className="text-[9px] sm:text-[11px] font-extrabold text-white">
                  REAL ACCOUNT
                </div>

                <div className="text-[7px] sm:text-[9px] text-emerald-100/50">
                  MT5 / MT4 ONLY
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 py-1.5 sm:py-2">
              <DollarSign className="h-4 w-4 text-emerald-300" />

              <div>
                <div className="text-[9px] sm:text-[11px] font-extrabold text-white">
                  $100 MINIMUM
                </div>

                <div className="text-[7px] sm:text-[9px] text-emerald-100/50">
                  UNLIMITED MAXIMUM
                </div>
              </div>
            </div>
          </div>

          {/* CONNECT BUTTON */}
          <Button
            type="button"
            onClick={() => setConnectOpen(true)}
            className="
              relative mt-1.5
              h-10 sm:h-11
              w-full rounded-full
              bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400
              hover:from-emerald-300 hover:via-emerald-400 hover:to-teal-300
              text-white
              font-extrabold
              text-[12px] sm:text-[15px]
              shadow-[0_6px_22px_rgba(16,185,129,0.25)]
              border border-emerald-200/20
            "
          >
            <Link2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />

            Connect MT5 / MT4

            <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
          </Button>

          {/* BOTTOM MICRO TEXT */}
          <div className="mt-1 flex items-center justify-center gap-2 text-[7px] sm:text-[9px] text-emerald-100/30">
            <LockKeyhole className="h-3 w-3" />
            Secure connection
            <span>•</span>
            Takes less than 2 minutes
          </div>
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

          {/* BALANCE */}
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Account Balance — $100 Minimum, Unlimited Maximum
              </div>

              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Profit Share — 35%
              </div>

              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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

          {/* TELEGRAM UPDATES */}
          <div className="flex items-start gap-3 rounded-xl border border-border/50 bg-background/60 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Send className="h-4 w-4" />
            </div>

            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Automatic Profit Updates
              </div>

              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Telegram Verification is Required
              </div>

              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Account Types Not Accepted
              </div>

              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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
              <div className="text-xs sm:text-sm font-bold text-foreground">
                Provide Correct MT5 Details
              </div>

              <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-muted-foreground">
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

            <p className="text-[10px] sm:text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
              <span className="font-bold">Important:</span> After submitting
              your request, you{" "}
              <span className="font-bold">
                MUST start the Telegram bot
              </span>{" "}
              from the verification popup. Your request cannot be fully
              verified until the bot is started.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION DIVIDER */}
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

      {/* LOADING */}
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
                  className="text-left rounded-2xl border border-emerald-500/20 bg-card p-4 shadow-sm card-3d-hover cursor-pointer"
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

                        <span className="truncate">
                          {brokerLabel(s)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 divide-x divide-border/50 rounded-xl bg-muted/30 py-2.5">
                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-emerald-500 text-[10px] font-semibold">
                        <TrendingUp className="h-3 w-3" />
                        Profit
                      </span>

                      <span className="text-sm font-bold mt-0.5">
                        +{fmtPercent(s.profit_percent)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-destructive text-[10px] font-semibold">
                        <TrendingDown className="h-3 w-3" />
                        Loss
                      </span>

                      <span className="text-sm font-bold mt-0.5">
                        -{fmtPercent(s.loss_percent)}
                      </span>
                    </div>

                    <div className="flex flex-col items-center px-1">
                      <span className="flex items-center gap-1 text-primary text-[10px] font-semibold">
                        <Gauge className="h-3 w-3" />
                        R:R
                      </span>

                      <span className="text-sm font-bold mt-0.5 truncate">
                        {s.risk_reward_ratio || "—"}
                      </span>
                    </div>
                  </div>

                  <p className="mt-2 text-[10px] text-muted-foreground text-center">
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
                  className="text-left rounded-2xl border border-amber-500/20 bg-card p-4 shadow-sm card-3d-hover cursor-pointer flex items-center justify-between gap-3"
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
                className="text-left rounded-2xl border border-rose-500/20 bg-card p-4 shadow-sm card-3d-hover cursor-pointer"
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

      {/* =========================================================
          DIALOG MODAL
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

                <div className="rounded-lg bg-muted/40 p-2.5 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
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

                    <p className="text-xs text-muted-foreground mt-1.5">
                      Your account is still waiting for admin verification.
                      We'll update this as soon as it's reviewed.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">

                      <div className="rounded-lg bg-muted/40 p-3">
                        <div className="flex items-center gap-1 text-emerald-500 text-xs font-semibold">
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
                        <div className="flex items-center gap-1 text-destructive text-xs font-semibold">
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
                      <div className="flex items-center gap-1 text-primary text-xs font-semibold">
                        <Gauge className="h-3.5 w-3.5" />
                        Risk : Reward Ratio
                      </div>

                      <div className="text-lg font-bold">
                        {selected.risk_reward_ratio || "—"}
                      </div>
                    </div>
                  </>
                )}

                <p className="text-[11px] text-muted-foreground text-center">
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
