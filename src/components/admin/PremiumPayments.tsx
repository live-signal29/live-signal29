import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Check, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* =========================================================
   PREMIUM PAYMENTS
   Manual crypto payments submitted from the Premium page
   (table: payment_submissions). Admin verifies the TxID on the
   blockchain, then taps Approve -> the user's profile becomes
   premium for the purchased duration.
========================================================= */

const db = supabase as any;
const LIFETIME_END_DATE = "2099-12-31T23:59:59.000Z";

type Submission = {
  id: string;
  user_id: string;
  plan_name: string;
  category: string | null;
  duration: string | null;
  amount: number;
  cryptocurrency: string;
  wallet_address: string | null;
  transaction_id: string;
  coupon_code: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile?: { email: string | null; full_name: string | null } | null;
};

const monthsFor = (duration: string | null): number | "lifetime" => {
  const d = (duration || "").toLowerCase();
  if (d.includes("lifetime")) return "lifetime";
  const m = d.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : 1; // "month" -> 1
};

const planIdFor = (planName: string) => {
  const n = planName.toLowerCase();
  if (n.includes("life")) return "lifetime";
  if (n.includes("half")) return "half-yearly";
  if (n.includes("year")) return "yearly";
  if (n.includes("quarter")) return "quarterly";
  return "monthly";
};

const PremiumPayments = () => {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("payment_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      toast.error(error.message || "Failed to load payments");
      setLoading(false);
      return;
    }

    const list: Submission[] = data || [];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids);
      const map = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
      list.forEach((r) => (r.profile = map.get(r.user_id) || null));
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (s: Submission) => {
    if (!confirm(`Approve ${s.plan_name} ($${Number(s.amount).toFixed(2)}) for ${s.profile?.email || s.user_id}?`)) return;
    setBusyId(s.id);
    try {
      const { data: profile, error: pErr } = await db
        .from("profiles")
        .select("subscription_status, subscription_plan, subscription_end_date")
        .eq("id", s.user_id)
        .maybeSingle();
      if (pErr) throw pErr;

      const months = monthsFor(s.duration);
      let endDate: string;

      if (months === "lifetime") {
        endDate = LIFETIME_END_DATE;
      } else if (profile?.subscription_plan === "premium-lifetime") {
        // Never downgrade an existing Lifetime user.
        endDate = LIFETIME_END_DATE;
      } else {
        // Extend from the current end date if the user is still premium,
        // otherwise start from today.
        const now = new Date();
        const current = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
        const base =
          profile?.subscription_status === "premium" && current && current > now ? current : now;
        const d = new Date(base);
        d.setMonth(d.getMonth() + months);
        endDate = d.toISOString();
      }

      const update: Record<string, unknown> = {
        subscription_status: "premium",
        subscription_end_date: endDate,
      };
      if (profile?.subscription_plan !== "premium-lifetime") {
        update.subscription_plan = `premium-${planIdFor(s.plan_name)}`;
      }
      if (profile?.subscription_status !== "premium") {
        update.subscription_start_date = new Date().toISOString();
      }

      const { error: uErr } = await db.from("profiles").update(update).eq("id", s.user_id);
      if (uErr) throw uErr;

      const { error: sErr } = await db
        .from("payment_submissions")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", s.id);
      if (sErr) throw sErr;

      toast.success("Approved — premium activated");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Approve failed");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (s: Submission) => {
    if (!confirm("Reject this payment?")) return;
    setBusyId(s.id);
    const { error } = await db
      .from("payment_submissions")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", s.id);
    setBusyId(null);
    if (error) {
      toast.error(error.message || "Reject failed");
      return;
    }
    toast.success("Rejected");
    load();
  };

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast.success("Copied");
  };

  const shown = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const count = (st: string) => rows.filter((r) => r.status === st).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold">Premium Payments</h2>
          <p className="text-sm text-muted-foreground">Verify the TxID, then approve to activate premium.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize shrink-0"
          >
            {f}
            {f !== "all" && ` (${count(f)})`}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[160px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No payments here.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((s) => (
            <div key={s.id} className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{s.profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.profile?.email || s.user_id}</p>
                </div>
                <Badge
                  className={
                    s.status === "pending"
                      ? "bg-amber-100 text-amber-700"
                      : s.status === "approved"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                  }
                >
                  {s.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium">{s.plan_name} {s.category ? `· ${s.category}` : ""}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-bold text-primary">${Number(s.amount).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Crypto</p>
                  <p className="font-medium">{s.cryptocurrency}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Submitted</p>
                  <p className="font-medium">{new Date(s.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2">
                <code className="min-w-0 flex-1 break-all text-xs">{s.transaction_id}</code>
                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => copy(s.transaction_id)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              {s.coupon_code && (
                <p className="text-xs text-muted-foreground">Coupon: {s.coupon_code}</p>
              )}

              {s.status === "pending" && (
                <div className="flex gap-2">
                  <Button className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700" disabled={busyId === s.id} onClick={() => approve(s)}>
                    {busyId === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </Button>
                  <Button variant="outline" className="flex-1 gap-1 text-red-600" disabled={busyId === s.id} onClick={() => reject(s)}>
                    <X className="h-4 w-4" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PremiumPayments;
