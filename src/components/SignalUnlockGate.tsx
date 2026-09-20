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
    <div className="relative rounded-2xl overflow-hidden border border-border bg-card min-h-[190px] max-h-[220px]">
      {/* Blurred, non-interactive preview of the real signal — height capped so the gate stays compact */}
      <div className="absolute inset-0 blur-md pointer-events-none select-none opacity-60 overflow-hidden">
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-3 text-center">
        <Lock className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm font-semibold text-foreground">
          Ye signal locked hai
        </p>

        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
          <Button
            onClick={handleWatchAd}
            disabled={watchingAd || dailyUnlocksRemaining <= 0}
            variant="secondary"
            size="sm"
            className="flex-1 gap-2"
          >
            {watchingAd ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            Ad Dekho ({dailyUnlocksRemaining} left)
          </Button>

          <Button
            onClick={() => navigate("/premium")}
            size="sm"
            className="flex-1 gap-2"
          >
            <Crown className="h-4 w-4" />
            Premium
          </Button>
        </div>
      </div>
    </div>
  );
};
