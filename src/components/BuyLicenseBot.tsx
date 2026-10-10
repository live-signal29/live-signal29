import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  Crown,
  KeyRound,
  Loader2,
  Send,
  ShieldCheck,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/openExternal";
import { FunctionsHttpError } from "@supabase/supabase-js";
import {
  LICENSE_PRODUCT_IDS,
  getBillingProvider,
  getExistingPlayPurchases,
  purchaseInAppProduct,
} from "@/lib/playBilling";

/* =========================================================
   LIVE SIGNALS CHINESE BOT
   - Activate a license key (RPC activate_license_key)
   - Buy a license: 6 Months $30 / Lifetime $70 (manual crypto, same
     addresses as the Premium page) -> table license_orders
   - Admin is notified on Telegram + the admin panel; the key is sent
     back through the Telegram bot (and the in-app inbox).
========================================================= */

interface BuyLicenseBotProps {
  onBack: () => void;
}

const db = supabase as any;
const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "Queenisupport_bot";
const botLink = (payload: string) => `https://t.me/${BOT_USERNAME}?start=${payload}`;

type PlanId = "6m" | "lifetime";

const PLANS: {
  id: PlanId;
  label: string;
  price: number;
  period: string;
  note: string;
  badge?: string;
  features: string[];
}[] = [
  {
    id: "6m",
    label: "6 Months",
    price: 30,
    period: "6 months access",
    note: "≈ $5 / month",
    features: ["Full Chinese Bot access", "Premium trading signals", "Key delivered on Telegram"],
  },
  {
    id: "lifetime",
    label: "Lifetime",
    price: 70,
    period: "one-time payment",
    note: "Pay once, use forever",
    badge: "BEST VALUE",
    features: ["Full Chinese Bot access", "All future updates included", "Priority support"],
  },
];

type View = "home" | "plans" | "pay" | "done" | "playdone";

// Reads the real reason out of a failed edge-function call.
async function functionError(error: unknown): Promise<string> {
  let message = String((error as Error)?.message ?? error);
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      message = body?.details ?? body?.error ?? message;
    } catch {
      /* keep generic message */
    }
  }
  return message;
}

const formatLicenseKey = (value: string) => {
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return clean.match(/.{1,4}/g)?.join("-") ?? "";
};

export const BuyLicenseBot = ({ onBack }: BuyLicenseBotProps) => {
  const [view, setView] = useState<View>("home");
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [active, setActive] = useState<{ plan_label: string; expires_at: string | null } | null>(null);

  const [plan, setPlan] = useState<(typeof PLANS)[number] | null>(null);
  type Method = { id: string; label: string; address: string };
  const [methods, setMethods] = useState<Method[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(true);
  const [methodIdx, setMethodIdx] = useState(0);
  const [txid, setTxid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Inside the Play Store app the license is bought with Google Play (like the Premium plans).
  const playAvailable = getBillingProvider() === "native";
  const [buyingPlay, setBuyingPlay] = useState(false);
  const [boughtKey, setBoughtKey] = useState<{ key: string; label: string; expires: string | null } | null>(null);

  const verifyLicensePurchase = async (productId: string, purchaseToken: string) => {
    const { data, error } = await supabase.functions.invoke("verify-play-license", {
      body: { productId, purchaseToken },
    });
    if (error) return { ok: false as const, message: await functionError(error) };
    if (data?.success) return { ok: true as const, data };
    return { ok: false as const, pending: !!data?.pending, message: data?.error || data?.details };
  };

  const buyWithPlay = async (p: (typeof PLANS)[number]) => {
    if (buyingPlay) return;
    setBuyingPlay(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Please login first.");
        return;
      }
      const productId = LICENSE_PRODUCT_IDS[p.id];
      const outcome = await purchaseInAppProduct(productId, auth.user.id);
      if (outcome.status === "cancelled") return;
      if (outcome.status === "pending") {
        toast.info("Your payment is pending. Your key will appear once Google confirms it — tap “Restore purchase” later.");
        return;
      }
      if (outcome.status === "error") {
        toast.error(outcome.message ? `Purchase failed: ${outcome.message}` : "Couldn't complete the purchase.");
        return;
      }
      const res = await verifyLicensePurchase(productId, outcome.purchaseToken);
      if (res.ok) {
        setBoughtKey({ key: res.data.license_key, label: res.data.plan_label, expires: res.data.expires_at });
        setActive({ plan_label: res.data.plan_label, expires_at: res.data.expires_at });
        setView("playdone");
      } else if (res.pending) {
        toast.info("Your payment is pending. Tap “Restore purchase” once Google confirms it.");
      } else {
        toast.error(`Could not activate: ${res.message || "unknown error"}. If you were charged, tap “Restore purchase”.`, { duration: 10000 });
      }
    } finally {
      setBuyingPlay(false);
    }
  };

  const restorePlay = async () => {
    setBuyingPlay(true);
    try {
      const owned = (await getExistingPlayPurchases()).filter((x) =>
        Object.values(LICENSE_PRODUCT_IDS).includes(x.productId as never)
      );
      if (owned.length === 0) {
        toast.info("No Chinese Bot purchase found on this Google account.");
        return;
      }
      let restored = false;
      for (const x of owned) {
        const res = await verifyLicensePurchase(x.productId, x.purchaseToken);
        if (res.ok) {
          setBoughtKey({ key: res.data.license_key, label: res.data.plan_label, expires: res.data.expires_at });
          setActive({ plan_label: res.data.plan_label, expires_at: res.data.expires_at });
          restored = true;
        }
      }
      if (restored) setView("playdone");
      else toast.error("Could not restore the purchase. Please contact support.");
    } finally {
      setBuyingPlay(false);
    }
  };

  // Show the user's current license (if any)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) return;
        const { data } = await db
          .from("license_orders")
          .select("plan_label, expires_at")
          .eq("activated_by", auth.user.id)
          .eq("status", "approved")
          .order("activated_at", { ascending: false })
          .limit(1);
        const row = data?.[0];
        if (!cancelled && row && (!row.expires_at || new Date(row.expires_at) > new Date())) setActive(row);
      } catch {
        /* optional banner only */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Payment methods = whatever the admin set in Payment Settings (read through an RPC).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await db.rpc("get_license_payment_methods");
        if (!cancelled) setMethods(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setMethods([]);
      } finally {
        if (!cancelled) setMethodsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleActivate = async () => {
    if (licenseKey.replace(/-/g, "").length !== 16) {
      toast.error("Please enter your 16-character license key.");
      return;
    }
    setActivating(true);
    try {
      const { data, error } = await db.rpc("activate_license_key", { p_key: licenseKey });
      if (error) throw error;
      if (!data?.ok) {
        toast.error(data?.error || "Invalid license key.");
        return;
      }
      setActive({ plan_label: data.plan_label, expires_at: data.expires_at });
      setLicenseKey("");
      toast.success("Bot activated!", { description: `${data.plan_label} license is now active.` });
    } catch (e: any) {
      toast.error(e?.message || "Could not activate. Please try again.");
    } finally {
      setActivating(false);
    }
  };

  const choosePlan = (p: (typeof PLANS)[number]) => {
    if (playAvailable) {
      buyWithPlay(p);
      return;
    }
    setPlan(p);
    setTxid("");
    setView("pay");
  };

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error("Could not copy");
    }
  };

  const submitPayment = async () => {
    if (!plan) return;
    const method = methods[methodIdx];
    if (!method) {
      toast.error("Payment details are not available. Please contact support.");
      return;
    }
    const id = txid.trim();
    if (id.length < 6) {
      toast.error("Please enter a valid transaction ID.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        toast.error("Please login first.");
        return;
      }
      const { data: order, error } = await db
        .from("license_orders")
        .insert({
          plan: plan.id,
          plan_label: plan.label,
          amount: plan.price,
          source: "app",
          user_id: auth.user.id,
          cryptocurrency: method.label,
          wallet_address: method.address,
          transaction_id: id,
          status: "pending",
        })
        .select("id")
        .single();
      if (error) throw error;

      setOrderId(order.id);
      setView("done");
      // Admin alert (Telegram + admin panel). Failure must not block the user.
      supabase.functions.invoke("license-notify", { body: { order_id: order.id } }).catch(() => {});
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit payment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const backButton = (label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      className="mb-5 inline-flex items-center gap-2 self-start rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </button>
  );

  /* ------------------------------ PLANS ------------------------------ */
  if (view === "plans") {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col px-3 py-6">
        {backButton("Back", () => setView("home"))}
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-black tracking-tight">Choose Your License</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {playAvailable ? "Pick a plan and pay securely with Google Play." : "Pick a plan, pay in crypto, receive your key on Telegram."}
          </p>
        </div>
        <div className="space-y-4">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => choosePlan(p)}
              className={`relative w-full rounded-3xl border p-5 text-left transition active:scale-[0.99] ${
                p.id === "lifetime"
                  ? "border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-card to-card ring-1 ring-amber-500/30"
                  : "border-border bg-card hover:border-emerald-500/50"
              }`}
            >
              {p.badge && (
                <span className="absolute -top-3 right-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-600 px-3 py-1 text-[11px] font-bold text-white">
                  <Crown className="h-3 w-3" />
                  {p.badge}
                </span>
              )}
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-lg font-extrabold">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.period}</p>
                </div>
                <div className="text-right">
                  <p className={`text-4xl font-black ${p.id === "lifetime" ? "text-amber-500" : "text-emerald-500"}`}>${p.price}</p>
                  <p className="text-xs text-muted-foreground">{p.note}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <span
                className={`mt-5 flex h-12 w-full items-center justify-center rounded-2xl font-bold ${
                  p.id === "lifetime" ? "bg-gradient-to-r from-amber-500 to-yellow-600 text-white" : "bg-emerald-400 text-emerald-950"
                }`}
              >
                {buyingPlay ? <Loader2 className="h-5 w-5 animate-spin" /> : playAvailable ? `Buy with Google Play — $${p.price}` : `Select ${p.label} — $${p.price}`}
              </span>
            </button>
          ))}
        </div>
        {playAvailable && (
          <button
            type="button"
            onClick={restorePlay}
            disabled={buyingPlay}
            className="mt-5 self-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline disabled:opacity-60"
          >
            Restore purchase
          </button>
        )}
      </section>
    );
  }

  /* ------------------------------ PAY ------------------------------ */
  if (view === "pay" && plan) {
    const method = methods[methodIdx];
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col px-3 py-6">
        {backButton("Change plan", () => setView("plans"))}
        <div className="mb-5 rounded-3xl border border-border bg-card p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Order summary</p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-lg font-bold">Chinese Bot • {plan.label}</p>
            <p className="text-3xl font-black text-emerald-500">${plan.price}</p>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5">
          {methodsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
            </div>
          ) : !method ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Payment details are not available right now. Please contact support on Telegram.
            </p>
          ) : (
            <>
              {methods.length > 1 && (
                <>
                  <p className="mb-3 text-sm font-bold">1. Choose payment method</p>
                  <div className="space-y-2">
                    {methods.map((m, i) => (
                      <button
                        key={m.id || i}
                        type="button"
                        onClick={() => setMethodIdx(i)}
                        className={`w-full rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                          methodIdx === i ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground"
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <p className="mb-2 mt-5 text-sm font-bold">
                {methods.length > 1 ? "2." : "1."} Send exactly ${plan.price} to
              </p>
              <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-3">
                <code className="min-w-0 flex-1 break-all text-sm">{method.address}</code>
                <button
                  type="button"
                  onClick={() => copy(method.address, "Copied")}
                  className="shrink-0 rounded-lg border border-border p-2 hover:bg-background"
                  aria-label="Copy payment details"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-amber-600">{method.label} — double-check the details. Payments cannot be reversed.</p>

              <p className="mb-2 mt-5 text-sm font-bold">{methods.length > 1 ? "3." : "2."} Paste your transaction ID / order ID</p>
              <input
                value={txid}
                onChange={(e) => setTxid(e.target.value)}
                placeholder="Transaction ID / order ID"
                autoComplete="off"
                spellCheck={false}
                className="h-14 w-full rounded-2xl border border-border bg-muted/50 px-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
              <button
                type="button"
                onClick={submitPayment}
                disabled={submitting}
                className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 font-extrabold text-emerald-950 transition hover:bg-emerald-300 disabled:opacity-60"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                I Have Paid — Submit
              </button>
            </>
          )}
        </div>
      </section>
    );
  }

  /* ------------------------------ PLAY DONE ------------------------------ */
  if (view === "playdone" && boughtKey) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-3 py-10 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-11 w-11 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black">Purchase Successful</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Your <b>{boughtKey.label}</b> Chinese Bot license is active
          {boughtKey.expires ? ` until ${new Date(boughtKey.expires).toLocaleDateString()}` : " for life"}.
        </p>
        <div className="mt-5 flex w-full max-w-sm items-center gap-2 rounded-2xl bg-muted/60 p-3">
          <code className="min-w-0 flex-1 text-center font-mono text-base font-bold tracking-wider">{boughtKey.key}</code>
          <button
            type="button"
            onClick={() => copy(boughtKey.key, "Key copied")}
            className="shrink-0 rounded-lg border border-border p-2 hover:bg-background"
            aria-label="Copy key"
          >
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Keep this key safe. It is also saved in your notifications.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 flex h-14 w-full max-w-sm items-center justify-center rounded-2xl bg-emerald-400 font-extrabold text-emerald-950 hover:bg-emerald-300"
        >
          Done
        </button>
      </section>
    );
  }

  /* ------------------------------ DONE ------------------------------ */
  if (view === "done") {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-3 py-10 text-center">
        <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="h-11 w-11 text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black">Payment Submitted</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Our team will verify your payment and send your <b>{plan?.label}</b> license key. Open Telegram once so we can deliver it
          to you instantly.
        </p>
        <button
          type="button"
          onClick={() => openExternal(botLink(orderId ? `lo_${orderId}` : "license"))}
          className="mt-6 flex h-14 w-full max-w-sm items-center justify-center gap-2 rounded-2xl bg-emerald-400 font-extrabold text-emerald-950 hover:bg-emerald-300"
        >
          <Send className="h-5 w-5" />
          Receive Key on Telegram
        </button>
        <button type="button" onClick={onBack} className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground">
          Close
        </button>
      </section>
    );
  }

  /* ------------------------------ HOME ------------------------------ */
  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col items-center px-3 py-6">
      {backButton("Back", onBack)}

      <div className="mb-7 flex flex-col items-center text-center">
        <div className="relative mb-4 flex h-28 w-28 items-center justify-center rounded-full border-4 border-emerald-500/40 bg-emerald-950/70 shadow-[0_0_50px_rgba(16,185,129,0.25)]">
          <div className="absolute inset-2 rounded-full border border-emerald-400/20" />
          <Bot className="h-14 w-14 text-emerald-300" strokeWidth={1.5} />
        </div>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Live Signals Chinese Bot</h2>
        <p className="mt-1.5 text-sm text-muted-foreground sm:text-base">Automated premium trading signals</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1">
            <Zap className="h-3.5 w-3.5 text-emerald-500" /> Instant key delivery
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1">
            <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" /> Verified payments
          </span>
        </div>
      </div>

      {active && (
        <div className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-500" />
          <div className="text-sm">
            <p className="font-bold text-emerald-600">License active • {active.plan_label}</p>
            <p className="text-xs text-muted-foreground">
              {active.expires_at ? `Valid until ${new Date(active.expires_at).toLocaleDateString()}` : "Lifetime access"}
            </p>
          </div>
        </div>
      )}

      <div className="w-full rounded-3xl border border-border bg-card p-5 shadow-xl sm:p-6">
        <label htmlFor="license-key" className="mb-3 flex items-center gap-2.5 text-base font-bold sm:text-lg">
          <KeyRound className="h-6 w-6 text-emerald-500" />
          Enter License Key
        </label>
        <input
          id="license-key"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={licenseKey}
          onChange={(event) => setLicenseKey(formatLicenseKey(event.target.value))}
          placeholder="XXXX-XXXX-XXXX-XXXX"
          maxLength={19}
          className="h-14 w-full rounded-2xl border border-border bg-muted/70 px-3 text-center font-mono text-base tracking-[0.1em] text-foreground outline-none transition placeholder:text-muted-foreground focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:text-lg"
        />
        <button
          type="button"
          onClick={handleActivate}
          disabled={activating}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-400 px-4 text-base font-extrabold text-emerald-950 transition hover:bg-emerald-300 active:scale-[0.99] disabled:opacity-60"
        >
          {activating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Activate Bot
        </button>
      </div>

      <div className="my-5 flex w-full items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        Don't have a key?
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={() => openExternal(botLink("license"))}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-center font-bold transition hover:border-emerald-500/50 hover:bg-muted/50"
      >
        <Send className="h-5 w-5 shrink-0 text-emerald-500" />
        Get License Key DM on Telegram
      </button>

      <button
        type="button"
        onClick={() => setView("plans")}
        className="mt-3 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-center font-extrabold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-600 hover:to-teal-600 active:scale-[0.99]"
      >
        <ShoppingCart className="h-5 w-5 shrink-0" />
        Buy License Key
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">from $30</span>
      </button>

      <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        Secure checkout
        <span>•</span>
        Key sent via Telegram &amp; in-app
        <span>•</span>
        24/7 support
      </p>
    </section>
  );
};

export default BuyLicenseBot;
