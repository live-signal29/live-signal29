import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";

const KEYS = ["METAAPI_TOKEN", "MT5_LOGIN", "MT5_SERVER", "MT5_PASSWORD"] as const;
type Key = (typeof KEYS)[number];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // ── Auth: must be a signed-in full admin ─────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsError || !userId) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action = String(body.action || "status");

    // ── Save credentials (write-only; values never returned) ─────────────
    if (action === "save") {
      const updates: { key: Key; value: string }[] = [];
      for (const key of KEYS) {
        const raw = body[key];
        if (typeof raw !== "string") continue;
        const value = raw.trim();
        if (!value) continue;
        if (value.length > 4000) return json({ error: `${key} is too long` }, 400);
        updates.push({ key, value });
      }
      if (updates.length === 0) return json({ error: "No values provided" }, 400);

      const { error } = await admin.from("integration_settings").upsert(
        updates.map((u) => ({ key: u.key, value: u.value, updated_by: userId })),
        { onConflict: "key" },
      );
      if (error) {
        console.error("save failed:", error.message);
        return json({ error: "Could not save credentials" }, 500);
      }
      return json({ success: true, saved: updates.map((u) => u.key) });
    }

    // ── Status: masked metadata + live MetaApi connectivity test ──────────
    if (action === "status" || action === "test") {
      const { data: rows } = await admin
        .from("integration_settings")
        .select("key, value, updated_at")
        .in("key", KEYS as unknown as string[]);

      const stored = new Map<string, { value: string; updated_at: string }>();
      for (const r of rows || []) stored.set(r.key, { value: r.value, updated_at: r.updated_at });

      const resolve = (key: Key) => {
        const dbVal = stored.get(key)?.value?.trim();
        if (dbVal) return { value: dbVal, source: "admin" as const };
        const envVal = (Deno.env.get(key) || "").trim();
        return { value: envVal, source: envVal ? ("secret" as const) : ("none" as const) };
      };

      const fields = KEYS.map((key) => {
        const { value, source } = resolve(key);
        return {
          key,
          configured: Boolean(value),
          source,
          // masked preview only — never the raw value
          preview: value ? `${value.slice(0, 4)}••••${value.slice(-4)}` : null,
          updated_at: stored.get(key)?.updated_at ?? null,
        };
      });

      const metaToken = resolve("METAAPI_TOKEN").value;
      const login = resolve("MT5_LOGIN").value;
      const server = resolve("MT5_SERVER").value;

      let connection: { ok: boolean; message: string; account?: string | null } = {
        ok: false,
        message: "MetaApi token not configured yet.",
      };

      if (metaToken) {
        try {
          const r = await fetch(`${PROVISIONING}/users/current/accounts`, {
            headers: { "auth-token": metaToken },
            signal: AbortSignal.timeout(10000),
          });
          if (r.status === 401 || r.status === 403) {
            connection = { ok: false, message: "MetaApi rejected the token (invalid or expired)." };
          } else if (!r.ok) {
            connection = { ok: false, message: `MetaApi error (HTTP ${r.status}).` };
          } else {
            const accounts = await r.json();
            const list = Array.isArray(accounts) ? accounts : [];
            const match =
              list.find(
                (a: any) => String(a.login) === String(login) && a.server === server,
              ) || list.find((a: any) => String(a.login) === String(login));
            connection = match
              ? { ok: true, message: `Connected — MT5 account found (${match.state ?? "unknown state"}).`, account: match.name ?? null }
              : {
                  ok: true,
                  message:
                    list.length > 0
                      ? "Token valid, but no account matches this MT5 login/server yet — it will be provisioned on first price fetch."
                      : "Token valid. No MetaApi accounts yet — one will be provisioned on first price fetch.",
                  account: null,
                };
          }
        } catch (_e) {
          connection = { ok: false, message: "Could not reach MetaApi (timeout)." };
        }
      }

      return json({ success: true, fields, connection });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (e) {
    console.error("mt5-settings error:", e);
    return json({ error: "Unexpected error" }, 500);
  }
});
