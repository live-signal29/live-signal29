import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROVISIONING = "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai";
const DEFAULT_CLIENT_API = "https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai";

/**
 * This is a self-contained copy of the same MetaApi provisioning logic used
 * in mt5-demo-trade, but pointed at each COPIER USER's own MT5 login
 * instead of the admin's own trading account — so we can read their real
 * account balance/equity and compute their real profit/loss %.
 */
async function getOrCreateMetaApiAccount(
  token: string,
  login: string,
  password: string,
  server: string
): Promise<{ accountId: string; clientApi: string }> {
  const listResponse = await fetch(`${PROVISIONING}/users/current/accounts`, {
    headers: { "auth-token": token },
  });

  if (!listResponse.ok) {
    throw new Error(`Failed to list MetaApi accounts: ${await listResponse.text()}`);
  }

  const raw = await listResponse.json();
  const accounts = Array.isArray(raw) ? raw : raw?.items || [];
  let account =
    accounts.find(
      (acc: any) =>
        String(acc.login) === String(login) &&
        String(acc.server || "").toLowerCase() === String(server).toLowerCase()
    ) || accounts.find((acc: any) => String(acc.login) === String(login));

  if (!account) {
    const createResponse = await fetch(`${PROVISIONING}/users/current/accounts`, {
      method: "POST",
      headers: {
        "auth-token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Copier-${login}`,
        type: "cloud",
        login,
        password,
        server,
        platform: "mt5",
        magic: 654321,
      }),
    });

    if (!createResponse.ok) {
      throw new Error(`Failed to create MetaApi account: ${await createResponse.text()}`);
    }

    account = await createResponse.json();
  }

  const accountId = account._id || account.id;
  const state = String(account?.state || "").toUpperCase();

  if (state && state !== "DEPLOYED" && state !== "DEPLOYING") {
    await fetch(`${PROVISIONING}/users/current/accounts/${accountId}/deploy`, {
      method: "POST",
      headers: { "auth-token": token },
    });
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const region = account?.region || account?.primaryReplica?.region || null;
  const clientApi = region
    ? `https://mt-client-api-v1.${region}.agiliumtrade.ai`
    : DEFAULT_CLIENT_API;

  return { accountId, clientApi };
}

async function getAccountInformation(token: string, clientApi: string, accountId: string) {
  const response = await fetch(
    `${clientApi}/users/current/accounts/${accountId}/account-information`,
    { headers: { "auth-token": token } }
  );

  if (!response.ok) {
    throw new Error(`account-information failed: ${await response.text()}`);
  }

  return await response.json();
}

async function loadMetaApiToken(supabase: any): Promise<string> {
  try {
    const { data } = await supabase
      .from("integration_settings")
      .select("key,value")
      .eq("key", "METAAPI_TOKEN")
      .maybeSingle();
    if (data?.value) return String(data.value).trim();
  } catch (_e) {
    // fall through to env var
  }
  return Deno.env.get("METAAPI_TOKEN")?.trim() || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = await loadMetaApiToken(supabase);
    if (!token) throw new Error("METAAPI_TOKEN missing");

    // Optionally sync a single request (admin "Sync Now" button); otherwise
    // sync every non-rejected request (called by the cron job below).
    let body: { request_id?: string } = {};
    try {
      body = await req.json();
    } catch (_e) {
      // no body — sync all
    }

    let query = supabase.from("mt5_copier_requests").select("*").neq("status", "rejected");
    if (body.request_id) {
      query = supabase.from("mt5_copier_requests").select("*").eq("id", body.request_id);
    }

    const { data: requests, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    const results: any[] = [];

    for (const reqRow of requests || []) {
      try {
        const { accountId, clientApi } = await getOrCreateMetaApiAccount(
          token,
          reqRow.mt5_login,
          reqRow.mt5_password,
          reqRow.broker_server
        );

        const info = await getAccountInformation(token, clientApi, accountId);
        const equity = Number(info.equity ?? info.balance ?? 0);
        const balance = Number(info.balance ?? equity);

        // First successful sync sets the baseline balance we measure
        // profit/loss against — this is the connected account's own
        // starting balance, not some shared/admin figure.
        const initialBalance =
          reqRow.initial_balance !== null && reqRow.initial_balance !== undefined
            ? Number(reqRow.initial_balance)
            : balance;

        const diff = equity - initialBalance;
        const profit_amount = diff > 0 ? Number(diff.toFixed(2)) : 0;
        const loss_amount = diff < 0 ? Number(Math.abs(diff).toFixed(2)) : 0;
        const profit_percent =
          initialBalance > 0 && diff > 0 ? Number(((diff / initialBalance) * 100).toFixed(2)) : 0;
        const loss_percent =
          initialBalance > 0 && diff < 0
            ? Number(((Math.abs(diff) / initialBalance) * 100).toFixed(2))
            : 0;

        await supabase
          .from("mt5_copier_requests")
          .update({
            meta_account_id: accountId,
            initial_balance: initialBalance,
            profit_amount,
            loss_amount,
            profit_percent,
            loss_percent,
            status: "connected",
            sync_error: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", reqRow.id);

        results.push({ id: reqRow.id, name: reqRow.name, success: true, equity, initialBalance });
      } catch (rowError) {
        const message = rowError instanceof Error ? rowError.message : String(rowError);
        console.error(`Sync failed for request ${reqRow.id} (${reqRow.name}):`, message);

        // Leave existing stats untouched on failure — just record the
        // error so the admin can see why (bad password, account not
        // found, still deploying, etc.) without losing prior data.
        await supabase
          .from("mt5_copier_requests")
          .update({ sync_error: message.slice(0, 300), last_synced_at: new Date().toISOString() })
          .eq("id", reqRow.id);

        results.push({ id: reqRow.id, name: reqRow.name, success: false, error: message });
      }
    }

    return new Response(
      JSON.stringify({ success: true, synced: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("mt5-copier-sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
