import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { useMyReferralCode, useMyReferrals } from "@/hooks/useReferrals";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Share2, Users, Award } from "lucide-react";
import { toast } from "sonner";

const Referrals = () => {
  const { data: code, isLoading } = useMyReferralCode();
  const { data: referrals } = useMyReferrals();

  const link = code ? `${window.location.origin}/signup?ref=${code}` : "";
  const totalEarned = (referrals?.length || 0) * 3;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Trend is Friend - Free Trading Signals",
          text: `Join me on Trend is Friend and get free signals! Use my code: ${code}`,
          url: link,
        });
      } catch {}
    } else {
      copy(link, "Invite link");
    }
  };

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
            <div className="inline-flex p-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 mb-3">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1">Invite & Earn</h1>
            <p className="text-sm text-muted-foreground">
              Get <span className="font-bold text-primary">+3 days FREE</span> for every friend who joins
            </p>
          </div>

          <Card className="p-5 glass-card mb-4 text-center">
            <p className="text-xs text-muted-foreground uppercase mb-2">Your Referral Code</p>
            {isLoading ? (
              <div className="text-sm">Loading…</div>
            ) : (
              <>
                <div className="text-3xl font-black tracking-widest text-primary mb-3 font-mono">
                  {code || "—"}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => copy(code || "", "Code")}>
                    <Copy className="h-4 w-4 mr-1" /> Copy Code
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={() => copy(link, "Invite link")}>
                    <Copy className="h-4 w-4 mr-1" /> Copy Link
                  </Button>
                  <Button className="flex-1" onClick={share}>
                    <Share2 className="h-4 w-4 mr-1" /> Share
                  </Button>
                </div>
              </>
            )}
          </Card>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <Card className="p-4 glass-card text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{referrals?.length || 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Friends Invited</p>
            </Card>
            <Card className="p-4 glass-card text-center">
              <Award className="h-5 w-5 mx-auto mb-1 text-amber-500" />
              <p className="text-2xl font-bold">+{totalEarned}</p>
              <p className="text-[10px] text-muted-foreground uppercase">Bonus Days Earned</p>
            </Card>
          </div>

          <Card className="p-5 glass-card">
            <h3 className="font-bold mb-3 text-sm">How it works</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="font-bold text-primary">1.</span> Share your code or link with friends.</li>
              <li className="flex gap-2"><span className="font-bold text-primary">2.</span> They sign up using your code.</li>
              <li className="flex gap-2"><span className="font-bold text-primary">3.</span> You instantly get <strong className="text-foreground">+3 days</strong> added to your trial/premium.</li>
            </ol>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Referrals;
