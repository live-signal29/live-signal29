import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useMyReferralCode, useMyReferrals } from "@/hooks/useReferrals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Share2, Users, Award, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Referrals = () => {
  const { data: rawCode, isLoading: hookLoading, refetch } = useMyReferralCode();
  const { data: referrals } = useMyReferrals();

  const [activeCode, setActiveCode] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to generate 8-char random alphanumeric code
  const generateRandomCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  useEffect(() => {
    const ensureReferralCode = async () => {
      if (rawCode) {
        setActiveCode(rawCode);
        return;
      }

      // If hook finished loading but returned no code (null / empty), generate and save one
      if (!hookLoading && (!rawCode || rawCode.trim() === "")) {
        setIsGenerating(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            const newCode = generateRandomCode();
            const { error } = await supabase
              .from("profiles")
              .update({ referral_code: newCode })
              .eq("id", session.user.id);

            if (!error) {
              setActiveCode(newCode);
              refetch?.();
            }
          }
        } catch {
          // ignore error
        } finally {
          setIsGenerating(false);
        }
      }
    };

    ensureReferralCode();
  }, [rawCode, hookLoading, refetch]);

  const link = activeCode ? `${window.location.origin}/signup?ref=${activeCode}` : "";
  const totalEarned = (referrals?.length || 0) * 3;

  const copy = (text: string, label: string) => {
    if (!text) {
      toast.error("Referral code is not available yet");
      return;
    }
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const share = async () => {
    if (!activeCode) {
      toast.error("Referral code is not available yet");
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Trend is Friend - Free Trading Signals",
          text: `Join me on Trend is Friend and get free signals! Use my code: ${activeCode}`,
          url: link,
        });
      } catch {
        copy(link, "Invite link");
      }
    } else {
      copy(link, "Invite link");
    }
  };

  const isLoading = hookLoading || isGenerating;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Refer Friends - Earn Free Premium Days"
        description="Invite friends and get +3 days of premium for each successful signup."
      />
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-2xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-3 shadow-md">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Invite & Earn</h1>
            <p className="text-sm text-muted-foreground">
              Get <span className="font-bold text-primary">+3 days FREE</span> for every friend who joins
            </p>
          </div>

          <Card className="p-5 glass-card mb-4 text-center border border-primary/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 font-semibold">
              Your Referral Code
            </p>
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Generating your code...</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-black tracking-widest text-primary mb-4 font-mono select-all">
                  {activeCode || "N/A"}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border-amber-500/30"
                    onClick={() => copy(activeCode, "Code")}
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copy Code
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => copy(link, "Invite link")}
                  >
                    <Copy className="h-4 w-4 mr-1.5" /> Copy Link
                  </Button>
                  <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={share}>
                    <Share2 className="h-4 w-4 mr-1.5" /> Share
                  </Button>
                </div>
              </>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="p-4 glass-card text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{referrals?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Friends Invited</p>
            </Card>
            <Card className="p-4 glass-card text-center">
              <Award className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">+{totalEarned}</p>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Bonus Days Earned</p>
            </Card>
          </div>

          <Card className="p-5 glass-card">
            <h3 className="font-bold mb-3 text-sm">How it works</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-bold text-primary">1.</span> Share your code or link with friends.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">2.</span> They sign up using your code.
              </li>
              <li className="flex gap-2">
                <span className="font-bold text-primary">3.</span> You instantly get <strong className="text-foreground">+3 days</strong> added to your trial/premium.
              </li>
            </ol>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Referrals;
