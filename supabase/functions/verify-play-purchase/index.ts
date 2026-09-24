// ============================================================
// VERIFY GOOGLE PLAY PURCHASE  (Play Billing, subscriptions v2)
// ============================================================
// Called by the Android app after a purchase (or on app start to
// sync renewals). Verifies the purchase token directly with Google,
// binds it to the logged-in user (from the JWT, never from the body),
// acknowledges it, logs it and grants / extends premium.
//
// Secret needed (Supabase -> Edge Functions -> Secrets):
//   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON  full JSON key of a service account that has
//     "View financial data" + "Manage orders and subscriptions" in Play Console.
// ============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { GoogleAuth } from "npm:google-auth-library@9";

const PACKAGE_NAME = "co.median.android.krkqyaz";
const PREMIUM_PRODUCT_ID = "premium";
// canceled = user turned off auto-renew but the paid period is still running
const VALID_STATES = new Set([
  "SUBSCRIPTION_STATE_ACTIVE",
  "SUBSCRIPTION_STATE_IN_GRACE_PERIOD",
  "SUBSCRIPTION_STATE_CANCELED",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));

    // Setup check (no secrets returned)
    if (body.action === "config_check") {
      const has = !!Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
      let tokenOk = false;
      let error: string | null = null;
      let playApi: { status: number; message?: string } | null = null;
      if (has) {
        try {
          const t = await googleAccessToken();
          tokenOk = true;
          // Probe the Play API with a dummy token: 401/403 = service account lacks Play Console permission
          const r = await fetch(
            `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/config-check-dummy-token`,
            { headers: { Authorization: `Bearer ${t}` } },
          );
          const j = await r.json().catch(() => ({}));
          playApi = { status: r.status, message: String(j?.error?.message ?? "").slice(0, 200) };
        } catch (e) {
          error = String(e).slice(0, 200);
        }
      }
      return json({ package: PACKAGE_NAME, hasServiceAccount: has, tokenOk, playApi, error });
    }

    const { productId, purchaseToken } = body;
    if (!productId || !purchaseToken) {
      return json({ success: false, error: "Missing productId or purchaseToken" }, 400);
    }
    if (productId !== PREMIUM_PRODUCT_ID) {
      return json({ success: false, error: "Unknown product" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Who is calling? (from the JWT)
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    const user = userData?.user;
    if (userErr || !user) return json({ success: false, error: "Not logged in" }, 401);

    // Ask Google about this token
    const accessToken = await googleAccessToken();
    const gRes = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(purchaseToken)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const sub = await gRes.json();
    if (!gRes.ok) {
      console.error("Google verification failed:", JSON.stringify(sub));
      return json({ success: false, error: "Google could not verify this purchase", details: sub?.error?.message }, 400);
    }

    const line = (sub.lineItems ?? []).find((l: { productId?: string }) => l.productId === PREMIUM_PRODUCT_ID);
    if (!line) return json({ success: false, error: "Purchase is not for the premium product" }, 400);

    if (sub.subscriptionState === "SUBSCRIPTION_STATE_PENDING") {
      return json({ success: false, pending: true, error: "Payment is still pending" }, 202);
    }

    const expiry = line.expiryTime ? new Date(line.expiryTime) : null;
    if (!VALID_STATES.has(sub.subscriptionState) || !expiry || expiry.getTime() <= Date.now()) {
      return json({ success: false, error: `Subscription not active (${sub.subscriptionState})` }, 400);
    }

    // Purchase must belong to this account
    const boundTo = sub.externalAccountIdentifiers?.obfuscatedExternalAccountId;
    if (boundTo && boundTo !== user.id) {
      return json({ success: false, error: "This purchase belongs to another account" }, 403);
    }
    const { data: existing } = await admin
      .from("play_billing_purchases")
      .select("id, user_id")
      .eq("purchase_token", purchaseToken)
      .maybeSingle();
    if (existing && existing.user_id !== user.id) {
      return json({ success: false, error: "This purchase belongs to another account" }, 403);
    }

    // Acknowledge within 3 days or Google refunds the purchase
    if (sub.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      const ack = await fetch(
        `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${PREMIUM_PRODUCT_ID}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: "{}",
        },
      );
      if (!ack.ok) console.error("Acknowledge failed:", ack.status, await ack.text());
    }

    const basePlanId: string | null = line.offerDetails?.basePlanId ?? null;
    const row = {
      user_id: user.id,
      product_id: PREMIUM_PRODUCT_ID,
      purchase_token: purchaseToken,
      purchase_type: "subs",
      order_id: sub.latestOrderId ?? null,
      purchase_state: String(sub.subscriptionState),
      raw_response: sub,
      verified_at: new Date().toISOString(),
    };
    if (existing) {
      await admin.from("play_billing_purchases").update(row).eq("id", existing.id);
    } else {
      await admin.from("play_billing_purchases").insert(row);
    }

    // Grant / extend premium (never shorten a longer period the user already has)
    const { data: profile } = await admin
      .from("profiles")
      .select("subscription_status, subscription_end_date")
      .eq("id", user.id)
      .maybeSingle();
    const currentEnd = profile?.subscription_end_date ? new Date(profile.subscription_end_date) : null;
    const newEnd = currentEnd && currentEnd > expiry ? currentEnd : expiry;

    const update: Record<string, unknown> = {
      subscription_status: "premium",
      subscription_plan: basePlanId ? `premium-${basePlanId}` : "premium",
      subscription_end_date: newEnd.toISOString(),
    };
    if (!existing || profile?.subscription_status !== "premium") {
      update.subscription_start_date = new Date().toISOString();
    }
    const { error: updateError } = await admin.from("profiles").update(update).eq("id", user.id);
    if (updateError) {
      console.error("Failed to update profile:", updateError);
      return json({ success: false, error: "Verified but failed to grant access" }, 500);
    }

    return json({
      success: true,
      basePlanId,
      expiry: expiry.toISOString(),
      state: sub.subscriptionState,
      testPurchase: !!sub.testPurchase,
    });
  } catch (err) {
    console.error("verify-play-purchase error:", err);
    return json({ success: false, error: String(err) }, 500);
  }
});
