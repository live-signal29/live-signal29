import React, { useState } from "react";
import { Lock, PlayCircle, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSignalUnlock } from "@/hooks/useSignalUnlock";
import { showRewardedAd } from "@/lib/rewardedAd";

interface SignalUnlockGateProps {
  signalId: string;
  isPremium: boolean;
  children: React.ReactNode;
}

// Wrap any signal card with this component:
//   <SignalUnlockGate signalId={signal.id} isPremium={hasAccess}>
//     <SignalCardNew signal={signal} ... />
//   </SignalUnlockGate>
export const SignalUnlockGate = ({
  signalId,
  isPremium,
  children,
}: SignalUnlockGateProps) => {
  const { isUnlocked, loading, recordUnlock, dailyUnlocksRemaining } =
    useSignalUnlock(signalId, isPremium);

  const [watchingAd, setWatchingAd] = useState(false);
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 rounded-2xl border border-border bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Premium users, or a signal already unlocked earlier,
  // just render normally with no gate at all.
  if (isUnlocked) {
    return <>{children}</>;
  }

  const handleWatchAd = async () => {
    if (dailyUnlocksRemaining <= 0) {
      toast.error(
        "Aaj ke free unlocks khatam ho gaye. Premium lo unlimited signals ke liye."
      );
      return;
    }

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
      toast.error("Ad complete nahi hua, dobara try karo.");
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-border bg-card min-h-[210px] max-h-[240px] shadow-sm">
      {/* Blurred, non-interactive preview of the real signal — height capped so the gate stays compact */}
      <div className="absolute inset-0 blur-md pointer-events-none select-none opacity-60 overflow-hidden">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/85 backdrop-blur-md px-5 py-4 text-center">
        {/* Icon badge */}
        <div className="flex items-center justify-center h-11 w-11 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-sm">
          <Lock className="h-5 w-5 text-primary" />
        </div>

        <div className="space-y-0.5">
          <p className="text-sm font-bold text-foreground tracking-tight">
            Ye signal locked hai
          </p>
          <p className="text-[11px] text-muted-foreground">
            Ad dekho ya Premium lo, turant unlock karo
          </p>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-[260px] mt-1">
          <Button
            onClick={handleWatchAd}
            disabled={watchingAd || dailyUnlocksRemaining <= 0}
            className="w-full h-11 rounded-xl gap-2 font-semibold text-sm bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-md shadow-teal-500/20 border-0 disabled:opacity-50"
          >
            {watchingAd ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            <span>Ad Dekho</span>
            <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
              {dailyUnlocksRemaining} left
            </span>
          </Button>

          <Button
            onClick={() => navigate("/premium")}
            className="w-full h-11 rounded-xl gap-2 font-semibold text-sm bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-500/20 border-0"
          >
            <Crown className="h-4 w-4" />
            Go Premium
          </Button>
        </div>
      </div>
    </div>
  );
};
