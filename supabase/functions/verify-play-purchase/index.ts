// ============================================================
// VERIFY GOOGLE PLAY LICENSE PURCHASE  (Chinese Bot, one-time in-app products)
// ============================================================
// Play Console one-time products (create these exact IDs):
//   chinese_bot_6m        -> $30  (6 months)
//   chinese_bot_lifetime  -> $70  (lifetime)
// The app sends the purchase token after Google's sheet succeeds. We verify it with Google
// (same service account as verify-play-purchase), bind it to the logged-in user, acknowledge it,
// then create an APPROVED license order with a fresh key, activated for that user.
// Admin gets a Telegram + admin-panel notification.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleAuth } from "npm:google-auth-library@9";

const PACKAGE_NAME = "co.median.android.krkqyaz";

const PRODUCTS: Record<string, { plan: "6m" | "lifetime"; label: string; amount: number }> = {
  chinese_bot_6m: { plan: "6m", label: "6 Months", amount: 30 },
  chinese_bot_lifetime: { plan: "lifetime", label: "Lifetime", amount: 70 },
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const esc = (v: unknown) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => CHARSET[b % CHARSET.length]).join("");
  return chars.match(/.{4}/g)!.join("-");
}

async function googleAccessToken(): Promise<string> {
  const raw = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
  if (!raw) throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON secret is missing");
  const auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ["https://www.googleapis.com/auth/androidpublisher"],
  });
  const client = await auth.getClient();
  const t = await client.getAccessToken();
  if (!t.token) throw new Error("Could not get Google access token");
  return t.token;
}

async function notifyAdmins(admin: ReturnType<typeof createClient>, text: string, panelTitle: string, panelMsg: string, meta: Record<string, unknown>) {
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_ADMIN_CHAT_ID) {
    try {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: TELEGRAM_ADMIN_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
    } catch (e) {
      console.error("admin telegram notify failed:", e);
    }
  }
  try {
    const { data: admins } = await admin.from("user_roles").select("user_id").eq("role", "admin");
    if (admins?.length) {
      await admin.from("notifications").insert(
        admins.map((a: { user_id: string }) => ({ user_id: a.user_id, title: panelTitle, message: panelMsg, type: "license_order", metadata: meta })),
      );
    }
  } catch (e) {
    console.error("admin panel notify failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { productId, purchaseToken } = await req.json().catch(() => ({}));
    const product = PRODUCTS[productId as string];
    if (!product || !purchaseToken) return json({ success: false, error: "Unknown product or missing token" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) return json({ success: false, error: "Not logged in" }, 401);

    // Already processed this exact purchase? Return the same key (restore / retry safe).
    const { data: existing } = await admin
      .from("license_orders")
      .select("id, user_id, license_key, plan_label, expires_at")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();
    if (existing) {
      if (existing.user_id !== user.id) return json({ success: false, error: "This purchase belongs to another account" }, 403);
      return json({ success: true, license_key: existing.license_key, plan_label: existing.plan_label, expires_at: existing.expires_at, restored: true });
    }

    const accessToken = await googleAccessToken();
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/products/${productId}/tokens/${encodeURIComponent(purchaseToken)}`;

    const gRes = await fetch(base, { headers: { Authorization: `Bearer ${accessToken}` } });
    const purchase = await gRes.json();
    if (!gRes.ok) {
      console.error("Google verification failed (license):", JSON.stringify(purchase));
      return json({ success: false, error: "Google could not verify this purchase", details: purchase?.error?.message }, 400);
    }

    // purchaseState: 0 = purchased, 1 = canceled, 2 = pending
    if (purchase.purchaseState === 2) return json({ success: false, pending: true, error: "Payment is still pending" }, 202);
    if (purchase.purchaseState !== 0) return json({ success: false, error: `Purchase not valid (state ${purchase.purchaseState})` }, 400);

    const boundTo = purchase.obfuscatedExternalAccountId;
    if (boundTo && boundTo !== user.id) return json({ success: false, error: "This purchase belongs to another account" }, 403);

    // Acknowledge within 3 days or Google refunds the purchase
    if (purchase.acknowledgementState === 0) {
      const ack = await fetch(`${base}:acknowledge`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: "{}",
      });
      if (!ack.ok) console.error("Acknowledge failed (license):", ack.status, await ack.text());
    }

    // Log in the shared Play purchases table (ignore if the token is already logged)
    const { error: logErr } = await admin.from("play_billing_purchases").insert({
      user_id: user.id,
      product_id: productId,
      purchase_token: purchaseToken,
      purchase_type: "inapp",
      order_id: purchase.orderId ?? null,
      purchase_state: "PURCHASED",
      raw_response: purchase,
      verified_at: new Date().toISOString(),
    });
    if (logErr) console.error("play_billing_purchases log failed (continuing):", logErr.message);

    const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();

    const now = new Date();
    let expires: string | null = null;
    if (product.plan === "6m") {
      const d = new Date(now);
      d.setMonth(d.getMonth() + 6);
      expires = d.toISOString();
    }

    // Create the approved + activated order with a fresh key (retry on the rare key collision)
    let order: { id: string; license_key: string } | null = null;
    for (let i = 0; i < 5 && !order; i++) {
      const key = generateKey();
      const { data, error } = await admin
        .from("license_orders")
        .insert({
          plan: product.plan,
          plan_label: product.label,
          amount: product.amount,
          source: "play",
          user_id: user.id,
          customer_name: profile?.full_name ?? null,
          cryptocurrency: "Google Play",
          transaction_id: purchase.orderId ?? null,
          purchase_token: purchaseToken,
          status: "approved",
          license_key: key,
          approved_at: now.toISOString(),
          activated_by: user.id,
          activated_at: now.toISOString(),
          expires_at: expires,
        })
        .select("id, license_key")
        .single();
      if (!error && data) order = data;
      else if (error && !String(error.message).includes("license_key")) {
        console.error("license order insert failed:", error);
        return json({ success: false, error: "Verified but failed to create the license. Contact support." }, 500);
      }
    }
    if (!order) return json({ success: false, error: "Could not generate a license key. Please try again." }, 500);

    // In-app inbox for the buyer
    try {
      await admin.from("notifications").insert({
        user_id: user.id,
        title: "🔑 Your Chinese Bot license",
        message: `${product.label} license is active. Key: ${order.license_key}`,
        type: "license_order",
        metadata: { order_id: order.id },
      });
    } catch (e) {
      console.error("buyer notification failed:", e);
    }

    await notifyAdmins(
      admin,
      `🛒 <b>CHINESE BOT LICENSE — GOOGLE PLAY</b>\n━━━━━━━━━━━━━━━\n\n` +
        `📦 Plan: <b>${esc(product.label)}</b>\n💵 Price: <b>$${product.amount}</b>${purchase.testPurchase ? " <i>(test purchase)</i>" : ""}\n` +
        `🧾 Order: <code>${esc(purchase.orderId)}</code>\n\n` +
        `🙋 Name: <b>${esc(profile?.full_name || "-")}</b>\n✉️ Email: <code>${esc(profile?.email || "-")}</code>\n\n` +
        `✅ Verified by Google and auto-approved. Key <code>${esc(order.license_key)}</code> was activated for this user.`,
      "🛒 Chinese Bot license bought (Google Play)",
      `${profile?.full_name || profile?.email || "User"} • ${product.label} • $${product.amount}`,
      { order_id: order.id, source: "play" },
    );

    return json({ success: true, license_key: order.license_key, plan_label: product.label, expires_at: expires, testPurchase: !!purchase.testPurchase });
  } catch (err) {
    console.error("verify-play-license error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
