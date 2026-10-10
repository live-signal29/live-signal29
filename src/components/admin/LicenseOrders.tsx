import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Loader2, RefreshCw, RotateCw, Send, Shuffle, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* =========================================================
   LICENSE ORDERS (Chinese Bot)
   Orders come from the Telegram bot and from the app.
   Admin verifies the TXID, then "Approve & Send Key":
   the key is saved, sent to the user on the Telegram bot
   (when their chat is linked) and added to their in-app inbox.
========================================================= */

const db = supabase as any;

type Order = {
  id: string;
  plan: string;
  plan_label: string;
  amount: number;
  source: "app" | "bot";
  user_id: string | null;
  customer_name: string | null;
  telegram_username: string | null;
  telegram_chat_id: number | null;
  cryptocurrency: string | null;
  transaction_id: string | null;
  proof_file_id: string | null;
  status: "awaiting_txid" | "pending" | "approved" | "rejected";
  license_key: string | null;
  key_sent_via_bot: boolean;
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  profile?: { email: string | null; full_name: string | null } | null;
};

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generateKey = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
};

const formatKey = (v: string) => {
  const clean = v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return clean.match(/.{1,4}/g)?.join("-") ?? "";
};

const errorText = async (error: any, data: any): Promise<string> => {
  if (data?.error) return data.error;
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    /* ignore */
  }
  return error?.message || "Request failed";
};

const LicenseOrders = () => {
  const [rows, setRows] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [keys, setKeys] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await db
      .from("license_orders")
      .select("*")
      .neq("status", "awaiting_txid")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message || "Failed to load license orders");
      setLoading(false);
      return;
    }
    const list: Order[] = data || [];
    const ids = Array.from(new Set(list.map((r) => r.user_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profiles } = await db.from("profiles").select("id, email, full_name").in("id", ids);
      const map = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));
      list.forEach((r) => (r.profile = r.user_id ? map.get(r.user_id) || null : null));
    }
    setRows(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const keyFor = (id: string) => keys[id] ?? "";
  // Pre-generate a key for each pending order (stays stable once shown)
  useEffect(() => {
    setKeys((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (r.status === "pending" && !next[r.id]) next[r.id] = generateKey();
      });
      return next;
    });
  }, [rows]);

  const call = async (body: Record<string, unknown>, id: string) => {
    setBusyId(id);
    try {
      const { data, error } = await supabase.functions.invoke("license-send-key", { body });
      if (error || !data?.success) {
        toast.error(await errorText(error, data));
        return null;
      }
      return data;
    } finally {
      setBusyId(null);
    }
  };

  const reportDelivery = (res: any) => {
    if (res.bot_sent) toast.success("Key sent to the user on the Telegram bot ✅");
    else toast.warning("Saved, but the bot could not deliver the key", { description: res.bot_error || "Copy the key and send it manually." });
  };

  const approve = async (o: Order) => {
    const key = keyFor(o.id);
    if (!confirm(`Approve ${o.plan_label} ($${Number(o.amount).toFixed(0)}) and send key ${key}?`)) return;
    const res = await call({ action: "approve", order_id: o.id, license_key: key }, o.id);
    if (res) {
      reportDelivery(res);
      load();
    }
  };

  const resend = async (o: Order) => {
    const res = await call({ action: "resend", order_id: o.id }, o.id);
    if (res) reportDelivery(res);
    load();
  };

  const reject = async (o: Order) => {
    if (!confirm("Reject this payment? The user is told on the bot that it could not be verified.")) return;
    const res = await call({ action: "reject", order_id: o.id }, o.id);
    if (res) {
      toast.success("Rejected");
      load();
    }
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
          <h2 className="text-xl font-bold">Chinese Bot Licenses</h2>
          <p className="text-sm text-muted-foreground">Verify the TXID, then approve to send the key to the user.</p>
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
            className="shrink-0 capitalize"
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
        <p className="py-10 text-center text-sm text-muted-foreground">No license orders here.</p>
      ) : (
        <div className="space-y-3">
          {shown.map((o) => {
            const who =
              o.profile?.full_name || o.customer_name || (o.telegram_username ? `@${o.telegram_username}` : "User");
            const sub = o.profile?.email || (o.telegram_username ? `@${o.telegram_username}` : o.user_id || "");
            const busy = busyId === o.id;
            return (
              <div key={o.id} className="space-y-3 rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{who}</p>
                    <p className="truncate text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge
                      className={
                        o.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : o.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                      }
                    >
                      {o.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {o.source === "bot" ? "Telegram bot" : "App"}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Plan</p>
                    <p className="font-medium">{o.plan_label}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-bold text-primary">${Number(o.amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Crypto</p>
                    <p className="font-medium">{o.cryptocurrency || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {o.transaction_id ? (
                  <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-2">
                    <code className="min-w-0 flex-1 break-all text-xs">{o.transaction_id}</code>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => copy(o.transaction_id!)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <p className="rounded-xl bg-muted/40 p-2 text-xs text-muted-foreground">
                    📸 Payment screenshot — it was forwarded to your admin Telegram chat.
                  </p>
                )}

                <p className={`text-xs ${o.telegram_chat_id ? "text-emerald-600" : "text-amber-600"}`}>
                  {o.telegram_chat_id
                    ? "✈️ Telegram linked — the key will be sent on the bot"
                    : "✈️ Telegram not linked yet — key goes to the app inbox; copy it to send manually"}
                </p>

                {o.status === "pending" && (
                  <>
                    <div className="flex items-center gap-2">
                      <input
                        value={keys[o.id] ?? ""}
                        onChange={(e) => setKeys((p) => ({ ...p, [o.id]: formatKey(e.target.value) }))}
                        className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-center font-mono text-sm tracking-wider"
                        maxLength={19}
                        spellCheck={false}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 shrink-0"
                        title="Generate another key"
                        onClick={() => setKeys((p) => ({ ...p, [o.id]: generateKey() }))}
                      >
                        <Shuffle className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={busy || (keys[o.id] ?? "").length !== 19}
                        onClick={() => approve(o)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Approve &amp; Send Key
                      </Button>
                      <Button variant="outline" className="flex-1 gap-1 text-red-600" disabled={busy} onClick={() => reject(o)}>
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </>
                )}

                {o.status === "approved" && o.license_key && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-2">
                      <code className="min-w-0 flex-1 text-center font-mono text-sm font-bold tracking-wider">{o.license_key}</code>
                      <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => copy(o.license_key!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>
                        {o.key_sent_via_bot ? "✅ Delivered on bot" : "⚠️ Not delivered on bot"}
                        {o.activated_at ? " • 🔓 Activated" : " • Not activated yet"}
                      </span>
                      <Button size="sm" variant="outline" className="gap-1" disabled={busy} onClick={() => resend(o)}>
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : o.key_sent_via_bot ? <RotateCw className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                        {o.key_sent_via_bot ? "Resend" : "Send on bot"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LicenseOrders;
