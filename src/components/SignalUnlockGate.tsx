import React, { useState } from "react";
import { Lock, PlayCircle, Crown, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSignalUnlock } from "@/hooks/useSignalUnlock";
import { showRewardedAd } from "@/lib/rewardedAd";
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

  const [watchingAd, setWatchingAd] = useState(false);
  // true right after the user closes/skips an ad without finishing it
  const [adWasSkipped, setAdWasSkipped] = useState(false);
  const navigate = useNavigate();

  const statusLower = String(status || "").toLowerCase();
  const isOpenStatus = ["open", "running", "active"].includes(statusLower);

  // Premium users, or a signal already unlocked earlier,
  // just render the real card with no gate at all.
  if (!loading && isUnlocked) {
    return <>{children}</>;
  }

  const handleGoPremium = async () => {
    // Inside the Play Store TWA: opens Google's native checkout,
    // verifies the purchase on the backend, grants premium.
    // In a normal browser (or if anything fails): falls back to
    // the existing /premium page — nothing breaks either way.
    const result = await buyPremium();

    switch (result) {
      case "success":
        toast.success("Premium activated! Ab sab signals bina ad ke dekho.");
        break;
      case "cancelled":
        // user closed the Google checkout sheet — no message needed
        break;
      case "error":
        toast.error("Purchase verify nahi ho saka, dobara try karo.");
        break;
      case "unavailable":
      default:
        navigate("/premium");
        break;
    }
  };

  const handleWatchAd = async () => {
    if (dailyUnlocksRemaining <= 0) {
      toast.error(
        "Aaj ke free unlocks khatam ho gaye. Premium lo unlimited signals ke liye."
      );
      return;
    }

    setAdWasSkipped(false);
    setWatchingAd(true);
    const watched = await showRewardedAd();
    setWatchingAd(false);

    if (watched) {
      const ok = await recordUnlock("ad");
      if (ok) {
        toast.success("Signal unlocked!");
      } else {
        toast.error("Kuch gadbad ho gayi, dobara try karo.");
      }
    } else {
      // Ad was closed/skipped before finishing — nudge toward Premium
      // instead of just erroring out, like a rewarded-ad game would.
      setAdWasSkipped(true);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-border bg-card">
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
      ) : adWasSkipped ? (
        // Ad was closed early — nudge toward Premium instead of retry-only
        <div className="flex flex-col items-center gap-2 px-4 py-5 text-center">
          <XCircle className="h-5 w-5 text-rose-500" />
          <p className="text-xs font-semibold text-foreground">
            Ad skip ho gaya
          </p>
          <p className="text-[11px] text-muted-foreground max-w-[220px]">
            Poora ad dekhe bina signal unlock nahi hota. Chaaho to Premium
            lekar sab signals bina ad ke dekho.
          </p>

          <div className="flex gap-2 w-full max-w-[220px] mt-1">
            <Button
              onClick={handleWatchAd}
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-lg text-xs"
            >
              Dobara Try Karo
            </Button>
            <Button
              onClick={handleGoPremium}
              disabled={purchasing}
              size="sm"
              className="flex-1 h-9 rounded-lg text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
            >
              {purchasing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crown className="h-3.5 w-3.5" />
              )}
              Remove Ads
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 px-4 py-3.5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span className="text-xs font-medium">
              Details locked
            </span>
          </div>

          <Button
            onClick={handleWatchAd}
            disabled={watchingAd || dailyUnlocksRemaining <= 0}
            size="sm"
            className="h-9 rounded-lg px-3 gap-1.5 text-xs font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
          >
            {watchingAd ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" />
            )}
            Unlock ({dailyUnlocksRemaining})
          </Button>
        </div>
      )}
    </div>
  );
};
