import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const GiftPremium = () => {
  const [redeemCodeInput, setRedeemCodeInput] = useState("");
  const [daysToGenerate, setDaysToGenerate] = useState(30);
  const [myGiftCodes, setMyGiftCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMyGiftCodes();
  }, []);

  const fetchMyGiftCodes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from("gift_codes")
      .select("*")
      .eq("created_by", session.user.id)
      .order("created_at", { ascending: false });

    if (data) setMyGiftCodes(data);
  };

  // 1. Redeem Code Function (For existing & new users)
  const handleRedeem = async () => {
    if (!redeemCodeInput.trim()) {
      toast.error("Please enter a valid gift code");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login to redeem gift code");
        return;
      }

      const codeUpper = redeemCodeInput.trim().toUpperCase();

      // Fetch code details
      const { data: giftData, error: fetchErr } = await supabase
        .from("gift_codes")
        .select("*")
        .eq("code", codeUpper)
        .eq("is_used", false)
        .maybeSingle();

      if (fetchErr || !giftData) {
        toast.error("Invalid or already redeemed gift code!");
        setLoading(false);
        return;
      }

      // Add days to current user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_end_date")
        .eq("id", session.user.id)
        .single();

      let currentEndDate = profile?.subscription_end_date
        ? new Date(profile.subscription_end_date)
        : new Date();

      if (currentEndDate < new Date()) {
        currentEndDate = new Date();
      }

      // Add gifted days
      currentEndDate.setDate(currentEndDate.getDate() + giftData.days);

      // Update Profile Subscription
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          is_premium: true,
          subscription_end_date: currentEndDate.toISOString(),
        })
        .eq("id", session.user.id);

      if (updateErr) throw updateErr;

      // Mark Gift Code as Used
      await supabase
        .from("gift_codes")
        .update({
          is_used: true,
          used_by: session.user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", giftData.id);

      toast.success(`Success! Added +${giftData.days} Premium Days to your account 🎉`);
      setRedeemCodeInput("");
      fetchMyGiftCodes();
    } catch (err: any) {
      toast.error("Failed to redeem gift code");
    } finally {
      setLoading(false);
    }
  };

  // 2. Generate Gift Code Function
  const handleGenerateCode = async () => {
    if (daysToGenerate <= 0) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
      const newCode = `GIFT-${randomStr}`;

      const { error } = await supabase.from("gift_codes").insert({
        code: newCode,
        days: daysToGenerate,
        created_by: session.user.id,
        is_used: false,
      });

      if (error) throw error;

      toast.success("New Gift Code Created!");
      fetchMyGiftCodes();
    } catch (err: any) {
      toast.error("Failed to generate code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-4 px-4 max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-2 text-emerald-600 font-bold text-xl">
        <Gift className="w-6 h-6" /> Gift Premium
      </div>

      {/* Redeem Section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Redeem a code</h3>
          <div className="flex gap-2">
            <Input
              placeholder="GIFT-XXXXXXXX"
              value={redeemCodeInput}
              onChange={(e) => setRedeemCodeInput(e.target.value)}
              className="uppercase font-mono"
            />
            <Button onClick={handleRedeem} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              Redeem
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Section */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">Create a gift for a friend</h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Days:</span>
            <Input
              type="number"
              value={daysToGenerate}
              onChange={(e) => setDaysToGenerate(Number(e.target.value))}
              className="w-24 text-center font-bold"
            />
            <Button onClick={handleGenerateCode} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 flex-1">
              Generate Code
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* My Gift Codes List */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-semibold text-sm">My gift codes</h3>
          {myGiftCodes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">No gift codes generated yet.</p>
          ) : (
            <div className="space-y-2">
              {myGiftCodes.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-muted/40 p-3 rounded-lg text-xs font-mono">
                  <div>
                    <div className="font-bold">{item.code}</div>
                    <div className="text-muted-foreground text-[10px]">
                      {item.days} days • {item.is_used ? "❌ Used" : "🎁 Available"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      navigator.clipboard.writeText(item.code);
                      toast.success("Code copied!");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GiftPremium;
