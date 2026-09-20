import React, { useState } from "react";
import { Lock, PlayCircle, Crown, Loader2, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSignalUnlock } from "@/hooks/useSignalUnlock";
import { showRewardedAd, REWARDED_AD_SECONDS } from "@/lib/rewardedAd";
import { usePlayBilling } from "@/hooks/usePlayBilling";

interface SignalUnlockGateProps {
  signalId: string;
  isPremium: boolean;
  /** Display name of the pair, e.g. "XAUUSD (Gold)" */
  pair: string;
  /** Status text as shown on the real card, e.g. "OPEN" / "CLOSED" / "RUNNING" */
  status: string;
  /** Already-formatted time string, e.g. "01:15 AM" */
  time?: string;
  children: React.ReactNode;
}

// Circular countdown ring — pure SVG, no extra deps.
const CountdownRing = ({
  secondsLeft,
  total,
}: {
  secondsLeft: number;
  total: number;
}) => {
  const size = 88;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = 1 - secondsLeft / total;
  const dashoffset = circumference * (1 - progress);

  return (
    <div className="relative flex h-[88px] w-[88px] items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(173 80% 40%)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      <span className="absolute text-2xl font-bold tabular-nums text-teal-600">
        {secondsLeft}
      </span>
    </div>
  );
};

// Wrap any signal card with this component:
//   <SignalUnlockGate
//     signalId={signal.id}
//     isPremium={hasAccess}
//     pair={signal.pair}
//     status={signal.signal_status || signal.status || "open"}
//     time={formatExactRealTime(signal.created_at)}
//   >
//     <SignalCardNew signal={signal} ... />
//   </SignalUnlockGate>
export const SignalUnlockGate = ({
  signalId,
  isPremium,
  pair,
  status,
  time,
  children,
}: SignalUnlockGateProps) => {
  const { isUnlocked, loading, recordUnlock, dailyUnlocksRemaining } =
    useSignalUnlock(signalId, isPremium);
  const { buyPremium, purchasing } = usePlayBilling();

  // Popup state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [watchingAd, setWatchingAd] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(REWARDED_AD_SECONDS);

  const navigate = useNavigate();

  const statusLower = String(status || "").toLowerCase();
  const isOpenStatus = ["open", "running", "active"].includes(statusLower);

  // Premium users, or a signal already unlocked earlier,
  // just render the real card with no gate at all.
  if (!loading && isUnlocked) {
    return <>{children}</>;
  }

  // Goes to Google Play checkout when running inside the Median
  // app with billing configured. Any other outcome (not inside
  // the app, checkout unavailable, or verification failed) falls
  // back to the /premium page — this is a web build today, so
  // that fallback is the normal path.
  const handleGoPremium = async () => {
    const result = await buyPremium();

    switch (result) {
      case "success":
        toast.success("Premium activated! Ab sab signals bina ad ke dekho.");
        setPickerOpen(false);
        break;
      case "cancelled":
        // user closed the Google checkout sheet — no message needed,
        // keep the popup open so they can pick again
        break;
      case "error":
        toast.error("Checkout nahi khul saka, premium page pe le ja rahe hain.");
        setPickerOpen(false);
        navigate("/premium#plans-section");
        break;
      case "unavailable":
      default:
        setPickerOpen(false);
        navigate("/premium#plans-section");
        break;
    }
  };

  const openPicker = () => {
    setSecondsLeft(REWARDED_AD_SECONDS);
    setWatchingAd(false);
    setPickerOpen(true);
  };

  const handleWatchAd = async () => {
    if (dailyUnlocksRemaining <= 0) {
      toast.error(
        "Aaj ke free unlocks khatam ho gaye. Premium lo unlimited signals ke liye."
      );
      return;
    }

    setWatchingAd(true);
    const watched = await showRewardedAd((remaining) => setSecondsLeft(remaining));

    if (watched) {
      const ok = await recordUnlock("ad");
      setWatchingAd(false);
      if (ok) {
        toast.success("Signal unlocked!");
        setPickerOpen(false);
      } else {
        toast.error("Kuch gadbad ho gayi, dobara try karo.");
      }
    } else {
      setWatchingAd(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
        {/* ALWAYS VISIBLE — compact header, mirrors the real card's top row */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/70">
          <span className="text-sm font-bold text-foreground truncate">
            {pair}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                isOpenStatus
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-rose-500/10 text-rose-500"
              )}
            >
              {isOpenStatus ? "OPEN" : "CLOSED"}
            </span>

            {time && (
              <span className="text-[11px] text-muted-foreground">
                {time}
              </span>
            )}
          </div>
        </div>

        {/* LOCKED BODY */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-muted/40 to-transparent px-4 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">
                  Details locked
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Entry, TP &amp; SL hidden
                </span>
              </div>
            </div>

            {dailyUnlocksRemaining <= 0 ? (
              <Button
                onClick={handleGoPremium}
                disabled={purchasing}
                size="sm"
                className="h-9 rounded-full px-4 gap-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-sm disabled:opacity-50"
              >
                {purchasing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Crown className="h-3.5 w-3.5" />
                )}
                Go Premium
              </Button>
            ) : (
              <Button
                onClick={openPicker}
                size="sm"
                className="h-9 rounded-full px-4 gap-1.5 text-xs font-semibold bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-sm"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Unlock ({dailyUnlocksRemaining})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* UNLOCK OPTIONS POPUP */}
      <Dialog
        open={pickerOpen}
        onOpenChange={(open) => {
          // Don't let the countdown be dismissed halfway — closing
          // early shouldn't grant an unlock.
          if (!watchingAd) setPickerOpen(open);
        }}
      >
        <DialogContent className="max-w-[360px] rounded-3xl p-0 overflow-hidden gap-0">
          {watchingAd ? (
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <CountdownRing secondsLeft={secondsLeft} total={REWARDED_AD_SECONDS} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  Signal unlock ho raha hai…
                </p>
                <p className="text-xs text-muted-foreground">
                  Bas {secondsLeft} second aur ruko
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gradient-to-br from-slate-900 to-slate-700 px-6 pt-6 pb-5 text-center text-white">
                <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
                  <Lock className="h-5 w-5" />
                </div>
                <DialogHeader className="items-center text-center space-y-1">
                  <DialogTitle className="text-white text-base">
                    {pair} Signal Unlock Karo
                  </DialogTitle>
                  <DialogDescription className="text-slate-300 text-xs">
                    Poora entry, TP aur SL dekhne ke liye ek option choose karo
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="flex flex-col gap-2.5 p-5">
                {/* Watch ad option */}
                <button
                  onClick={handleWatchAd}
                  className="group flex items-center gap-3 rounded-2xl border border-teal-200 bg-teal-50/60 px-4 py-3 text-left transition hover:border-teal-400 hover:bg-teal-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Watch {REWARDED_AD_SECONDS}s &amp; Unlock
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Free — {dailyUnlocksRemaining} left today
                    </p>
                  </div>
                  <Zap className="h-4 w-4 shrink-0 text-teal-500 opacity-0 transition group-hover:opacity-100" />
                </button>

                {/* Premium option */}
                <button
                  onClick={handleGoPremium}
                  disabled={purchasing}
                  className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 text-left transition hover:border-amber-400 disabled:opacity-60"
                >
                  <span className="absolute right-3 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                    Best value
                  </span>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-yellow-500 text-white shadow-sm">
                    {purchasing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Crown className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Remove Ads — Go Premium
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Unlimited signals, no waiting
                    </p>
                  </div>
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 border-t border-border/70 bg-muted/30 px-5 py-2.5">
                <Sparkles className="h-3 w-3 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">
                  Aaj {dailyUnlocksRemaining} free unlock baaki hain
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
