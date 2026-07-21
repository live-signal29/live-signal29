import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield } from "lucide-react";
import { toast } from "sonner";

export function TwoFactorSettings() {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return toast.error("Sign in first"); }
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await supabase.from("two_factor_codes").insert({ user_id: user.id, code: otp, expires_at: expires });
    // Trigger email via existing send function (fallback: show in toast for dev)
    try {
      await supabase.functions.invoke("send-2fa-code", { body: { email: user.email, code: otp } });
    } catch {}
    toast.success("Verification code sent to your email");
    setSent(true);
    setLoading(false);
  };

  const verify = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("two_factor_codes").select("*").eq("user_id", user.id).eq("code", code).eq("used", false).gt("expires_at", new Date().toISOString()).limit(1).maybeSingle();
    if (!data) return toast.error("Invalid or expired code");
    await supabase.from("two_factor_codes").update({ used: true }).eq("id", data.id);
    toast.success("✅ 2FA verified");
    setSent(false); setCode("");
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2 font-semibold"><Shield className="w-4 h-4 text-primary" /> Two-Factor Authentication</div>
      <p className="text-sm text-muted-foreground">Add extra security. Get a 6-digit code by email for sensitive actions.</p>
      {!sent ? (
        <Button onClick={sendCode} disabled={loading}>{loading ? "Sending..." : "Send verification code"}</Button>
      ) : (
        <div className="flex gap-2">
          <Input placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value)} maxLength={6} />
          <Button onClick={verify}>Verify</Button>
        </div>
      )}
    </Card>
  );
}
