// Public endpoint used by the Chinese Bot site (chinese-bot29.vercel.app).
// Verifies a license key bought via the bot/app, and locks it to the first device that activates it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_FAILS = 8; // failed attempts per IP
const WINDOW_MIN = 15; // within this many minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "POST required" }, 405);

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json().catch(() => ({}));

    const ip =
      req.headers.get("cf-connecting-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "unknown";

    const raw = String(body?.key ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const device = String(body?.device_id ?? "").trim();

    if (raw.length !== 16 || !/^[A-Za-z0-9-]{16,64}$/.test(device)) {
      return json({ ok: false, error: "Invalid license key." });
    }
    const key = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12)}`;

    // ---- rate limit (failed attempts per IP) ----
    const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
    const { count } = await supabase
      .from("license_verify_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .eq("success", false)
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_FAILS) {
      return json({ ok: false, error: "Too many attempts. Try again in 15 minutes." }, 429);
    }

    const fail = async (error: string) => {
      await supabase.from("license_verify_attempts").insert({ ip, success: false });
      return json({ ok: false, error });
    };

    const { data: order } = await supabase
      .from("license_orders")
      .select("*")
      .eq("license_key", key)
      .eq("status", "approved")
      .maybeSingle();
    if (!order) return await fail("Invalid license key.");

    // ---- bind to first device (atomic: only succeeds while still unbound) ----
    let row = order;
    if (!row.bound_device_id) {
      const expires =
        row.expires_at ?? (row.plan === "6m" ? new Date(Date.now() + 183 * 86400000).toISOString() : null);
      await supabase
        .from("license_orders")
        .update({
          bound_device_id: device,
          bound_at: new Date().toISOString(),
          expires_at: expires,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .is("bound_device_id", null);
      const { data: fresh } = await supabase.from("license_orders").select("*").eq("id", row.id).maybeSingle();
      if (fresh) row = fresh;
    }

    if (row.bound_device_id !== device) {
      return await fail("This key is already used on another device.");
    }
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return json({ ok: false, expired: true, error: "This license has expired." });
    }

    await supabase.from("license_orders").update({ last_verified_at: new Date().toISOString() }).eq("id", row.id);
    await supabase.from("license_verify_attempts").insert({ ip, success: true });

    return json({ ok: true, plan_label: row.plan_label, expires_at: row.expires_at });
  } catch (e) {
    console.error("verify-bot-key error:", e);
    return json({ ok: false, error: "Server error. Please try again." }, 500);
  }
});
