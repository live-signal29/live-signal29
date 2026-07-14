import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Gift, Copy, Check } from "lucide-react";
import Header from "@/components/Header";
import { toast } from "sonner";

export default function GiftPremium() {
  const [days, setDays] = useState(30);
  const [redeemCode, setRedeemCode] = useState("");
  const [myCodes, setMyCodes] = useState<any[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const loadCodes = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("gift_codes").select("*").eq("created_by", user.id).order("created_at", { ascending: false });
    setMyCodes(data || []);
  };

  useEffect(() => { loadCodes(); }, []);

  const create = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return toast.error("Sign in first");
    const code = "GIFT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    const { error } = await supabase.from("gift_codes").insert({ code, days, created_by: user.id });
    if (error) return toast.error(error.message);
    toast.success("Gift code created!");
    loadCodes();
  };

  const redeem = async () => {
    if (!redeemCode.trim()) return;
    const { data, error } = await supabase.rpc("redeem_gift_code", { _code: redeemCode.trim().toUpperCase() });
    if (error) return toast.error(error.message);
    const result = data as any;
    if (result?.error) return toast.error(result.error);
    toast.success(`🎉 ${result?.days} days premium activated!`);
    setRedeemCode("");
  };

  const copy = (c: string) => {
    navigator.clipboard.writeText(c);
    setCopied(c);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-6 max-w-xl space-y-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Gift className="text-primary" /> Gift Premium</h1>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Redeem a code</h3>
          <div className="flex gap-2">
            <Input placeholder="GIFT-XXXXXXXX" value={redeemCode} onChange={e => setRedeemCode(e.target.value.toUpperCase())} />
            <Button onClick={redeem}>Redeem</Button>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Create a gift for a friend</h3>
          <div className="flex gap-2 items-center">
            <label className="text-sm">Days:</label>
            <Input type="number" value={days} onChange={e => setDays(+e.target.value)} className="w-24" />
            <Button onClick={create}>Generate Code</Button>
          </div>
        </Card>

        {myCodes.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">My gift codes</h3>
            <div className="space-y-2">
              {myCodes.map(c => (
                <div key={c.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <div className="font-mono font-semibold">{c.code}</div>
                    <div className="text-xs text-muted-foreground">{c.days} days • {c.redeemed_by ? "✅ Redeemed" : "🎁 Available"}</div>
                  </div>
                  <button onClick={() => copy(c.code)}>{copied === c.code ? <Check className="w-4 h-4 text-success-deep" /> : <Copy className="w-4 h-4" />}</button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
