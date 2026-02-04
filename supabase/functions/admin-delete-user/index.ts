import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type DeleteUserBody = {
  userId: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1) Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate token and get caller user
    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = callerData.user.id;

    // 2) Use service client for admin operations (but keep our own authorization checks)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleRow, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Parse input
    const body = (await req.json()) as DeleteUserBody;
    const userId = String(body?.userId || "").trim();

    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4) Best-effort: revoke sessions / tokens (if supported by the SDK version)
    try {
      await (adminClient.auth.admin as any).signOut?.(userId);
    } catch (e) {
      console.log("admin signOut not available or failed:", e);
    }

    try {
      await (adminClient.auth.admin as any).invalidateUserTokens?.(userId);
    } catch (e) {
      // Optional; not available in older versions
      console.log("invalidateUserTokens not available or failed:", e);
    }

    // 5) Delete dependent data in public tables
    // NOTE: we intentionally delete profile near the end so existence checks can fail immediately once removed.
    const deleteOperations = [
      adminClient.from("user_favorites").delete().eq("user_id", userId),
      adminClient.from("user_favorite_pairs").delete().eq("user_id", userId),
      adminClient.from("user_signal_views").delete().eq("user_id", userId),
      adminClient.from("user_login_history").delete().eq("user_id", userId),
      adminClient.from("notifications").delete().eq("user_id", userId),
      adminClient.from("chart_reactions").delete().eq("user_id", userId),
      adminClient.from("market_idea_reactions").delete().eq("user_id", userId),
      adminClient.from("subscriptions").delete().eq("user_id", userId),
      adminClient.from("coupon_usage").delete().eq("user_id", userId),
      adminClient.from("deposits").delete().eq("user_id", userId),
      adminClient.from("user_roles").delete().eq("user_id", userId),
      adminClient.from("security_logs").delete().eq("user_id", userId),
      adminClient.from("trade_history").delete().eq("user_id", userId),
    ];

    const results = await Promise.allSettled(deleteOperations);
    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.warn(`Delete op ${idx} rejected:`, r.reason);
      } else if ((r.value as any)?.error) {
        console.warn(`Delete op ${idx} error:`, (r.value as any).error);
      }
    });

    // 6) Delete the profile
    const { error: profileError } = await adminClient.from("profiles").delete().eq("id", userId);
    if (profileError) {
      console.error("Profile deletion error:", profileError);
      return new Response(JSON.stringify({ error: `Failed to delete profile: ${profileError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7) Finally delete auth user so they cannot log in again with old credentials
    const { error: authDeleteError } = await (adminClient.auth.admin as any).deleteUser?.(userId);
    if (authDeleteError) {
      console.error("Auth user deletion error:", authDeleteError);
      // If public data is deleted but auth deletion fails, we still block app access via profile checks.
      return new Response(JSON.stringify({ error: `Failed to delete auth user: ${authDeleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in admin-delete-user:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
