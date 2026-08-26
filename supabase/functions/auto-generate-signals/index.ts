import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PriceData {
  price: number;
  high: number;
  low: number;
}

// ── Real MT5 broker prices (same feed the app uses for "CURRENT" price) ──
// Fetches every candidate pair from the fetch-live-prices function in ONE
// call, so gold/forex/crypto signals get generated off the actual MT5 quote
// instead of an external Yahoo/CoinGecko feed that can drift from the broker.
async function fetchMT5Prices(
  pairs: string[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  try {
    const resp = await fetch(
      `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(pairs.join(","))}`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
    );
    if (resp.ok) {
      const json = await resp.json();
      const prices: Record<string, string> = json?.prices || {};
      for (const pair of pairs) {
        const raw = prices[pair];
        const p = raw ? parseFloat(raw) : NaN;
        if (p && p > 0) result[pair] = p;
      }
    } else {
      console.log("fetch-live-prices (MT5) call failed:", resp.status);
    }
  } catch (e) {
    console.log("MT5 price fetch error:", String(e));
  }
  return result;
}

// Re-centers a PriceData on the real MT5 price while keeping the original
// spread width (so TP/SL sizing logic downstream is unaffected) — only the
// entry anchor point moves to match the live broker quote.
function recenterOnMT5(pd: PriceData, mt5Price: number): PriceData {
  const upWidth = pd.high - pd.price;
  const downWidth = pd.price - pd.low;
  return { price: mt5Price, high: mt5Price + upWidth, low: mt5Price - downWidth };
}

// ── Gold price from Yahoo Finance / metals.dev fallback ──
async function fetchGoldPrice(): Promise<PriceData> {
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d",
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
      if (meta?.regularMarketPrice) {
        return {
          price: meta.regularMarketPrice,
          high: quote?.high?.[0] || meta.regularMarketPrice + 15,
          low: quote?.low?.[0] || meta.regularMarketPrice - 15,
        };
      }
    }
  } catch (e) { console.log("Yahoo gold failed:", e); }

  try {
    const res = await fetch("https://api.metals.dev/v1/latest?api_key=demo&currency=USD&unit=oz");
    if (res.ok) {
      const data = await res.json();
      if (data.metals?.gold) {
        const p = data.metals.gold;
        return { price: p, high: p + 15, low: p - 15 };
      }
    }
  } catch (e) { console.log("metals.dev failed:", e); }

  throw new Error("Could not fetch gold price");
}

// ── Forex prices from Yahoo Finance ──
async function fetchForexPrice(symbol: string): Promise<PriceData> {
  try {
    const yahooSymbol = symbol.replace("/", "") + "=X";
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        const spread = meta.regularMarketPrice * 0.003;
        return { price: meta.regularMarketPrice, high: meta.regularMarketPrice + spread, low: meta.regularMarketPrice - spread };
      }
    }
  } catch (e) { console.log(`Yahoo forex ${symbol} failed:`, e); }

  // Fallback approximate prices
  const fallback: Record<string, number> = {
    "EUR/USD": 1.0830, "GBP/USD": 1.2940, "USD/JPY": 149.60,
    "AUD/USD": 0.6290, "GBP/JPY": 193.70, "USD/CAD": 1.3580,
    "NZD/USD": 0.5680, "USD/CHF": 0.8830, "CHF/JPY": 169.40, "CAD/JPY": 110.20,
  };
  const p = fallback[symbol] || 1.0;
  const s = p * 0.003;
  return { price: p, high: p + s, low: p - s };
}

// ── Crypto prices from CoinGecko ──
async function fetchCryptoPrices(): Promise<Record<string, PriceData>> {
  const result: Record<string, PriceData> = {};
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple,dogecoin&vs_currencies=usd&include_24hr_high=true&include_24hr_low=true"
    );
    if (res.ok) {
      const data = await res.json();
      const map: Record<string, string> = {
        bitcoin: "BTC/USD", ethereum: "ETH/USD", solana: "SOL/USD",
        ripple: "XRP/USD", dogecoin: "DOGE/USD",
      };
      for (const [id, pair] of Object.entries(map)) {
        if (data[id]?.usd) {
          result[pair] = {
            price: data[id].usd,
            high: data[id].usd_24h_high || data[id].usd * 1.02,
            low: data[id].usd_24h_low || data[id].usd * 0.98,
          };
        }
      }
    }
  } catch (e) { console.log("CoinGecko failed:", e); }

  // Fallbacks
  const fallback: Record<string, number> = {
    "BTC/USD": 83500, "ETH/USD": 1820, "SOL/USD": 125, "XRP/USD": 2.10, "DOGE/USD": 0.168,
  };
  for (const [pair, p] of Object.entries(fallback)) {
    if (!result[pair]) {
      result[pair] = { price: p, high: p * 1.02, low: p * 0.98 };
    }
  }
  return result;
}


// ── Signal generator ──
function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.round((min + Math.random() * (max - min)) * 100) / 100; }

const buyReasons = [
  "Demand zone bounce with bullish engulfing", "Trendline support holding on H1",
  "Double bottom formation confirmed", "RSI oversold bounce at key level",
  "Order block retest with bullish confirmation", "Golden ratio 61.8% retracement support",
  "Bullish MACD crossover on M30", "Asian session support zone holding",
];
const sellReasons = [
  "Supply zone rejection with bearish pin bar", "Resistance rejection at daily high",
  "Bearish divergence on RSI H1", "Head and shoulders pattern completing",
  "MACD bearish crossover near resistance", "Failed breakout at upper channel",
  "Overbought conditions on H4", "Distribution zone detected on volume",
];

interface SignalConfig {
  pair: string;
  category: string;
  mainCategory: string;
  subCategory: string;
  price: PriceData;
  pipMultiplier: number; // how much 1 "pip" is in price terms
  decimals: number;
  thresholdPct: number; // % move required since last signal before a new one is allowed
}

// Builds exactly ONE fresh open signal for a pair. No fake history, no
// forced pre-closed signals — this pair had no active signal and enough
// movement occurred, so this is the one new trade idea for it right now.
function generateOneOpenSignal(config: SignalConfig, session: "morning" | "evening") {
  const { pair, category, mainCategory, subCategory, price, pipMultiplier, decimals } = config;
  const isBuy = Math.random() < 0.5;
  const type = isBuy ? "Buy" : "Sell";
  const spread = price.high - price.low;
  const entryOffset = rand(-spread * 0.3, spread * 0.3);
  const entry = +(price.price + entryOffset).toFixed(decimals);

  const tp1d = rand(8, 15) * pipMultiplier;
  const tp2d = rand(18, 28) * pipMultiplier;
  const tp3d = rand(30, 45) * pipMultiplier;
  const sld = rand(10, 18) * pipMultiplier;

  const tp1 = +(isBuy ? entry + tp1d : entry - tp1d).toFixed(decimals);
  const tp2 = +(isBuy ? entry + tp2d : entry - tp2d).toFixed(decimals);
  const tp3 = +(isBuy ? entry + tp3d : entry - tp3d).toFixed(decimals);
  const sl = +(isBuy ? entry - sld : entry + sld).toFixed(decimals);

  const now = new Date();

  return {
    pair,
    type,
    category,
    main_category: mainCategory,
    sub_category: subCategory,
    entry: entry.toString(),
    tp1: tp1.toString(),
    tp2: tp2.toString(),
    tp3: tp3.toString(),
    sl: sl.toString(),
    status: "open",
    signal_status: "open",
    is_premium: Math.random() < 0.25,
    is_activated: true,
    activated_at: now.toISOString(),
    entry_mode: "market",
    signal_type: pick(["Scalping", "Intraday", "Swing"]),
    risk_level: pick(["Low", "Medium", "High"]),
    analysis_reason: isBuy ? pick(buyReasons) : pick(sellReasons),
    tag: null,
    signal_raw_text: null,
    published: true,
    created_at: now.toISOString(),
    tp1_hit: false,
    tp2_hit: false,
    tp3_hit: false,
    profit_note: null,
  };
}

// Decides whether `pair` is eligible for a new signal right now:
//  1) it must have NO currently active (non-closed) signal, and
//  2) price must have moved at least `thresholdPct` since that pair's
//     last signal (open or closed) — or it must have no prior signal at all.
async function evaluatePair(
  supabase: ReturnType<typeof createClient>,
  pair: string,
  currentPrice: number,
  thresholdPct: number
): Promise<{ generate: boolean; reason: string; pctMove?: number }> {
  const { data: active } = await supabase
    .from("signals")
    .select("id")
    .eq("pair", pair)
    .not("signal_status", "ilike", "close")
    .limit(1)
    .maybeSingle();

  if (active) return { generate: false, reason: "signal_still_open" };

  const { data: last } = await supabase
    .from("signals")
    .select("entry, created_at")
    .eq("pair", pair)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!last?.entry) return { generate: true, reason: "no_prior_signal" };

  const lastPrice = parseFloat(last.entry as string);
  if (!lastPrice) return { generate: true, reason: "no_prior_signal" };

  const pctMove = Math.abs((currentPrice - lastPrice) / lastPrice) * 100;
  if (pctMove >= thresholdPct) {
    return { generate: true, reason: "movement_detected", pctMove: +pctMove.toFixed(4) };
  }
  return { generate: false, reason: "no_significant_movement", pctMove: +pctMove.toFixed(4) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Pakistan/Karachi time, used only to tag the session on new signals.
    const pktHour = (new Date().getUTCHours() + 5) % 24;
    const session: "morning" | "evening" = pktHour < 12 ? "morning" : "evening";

    // ── Fetch shape/volatility data for every candidate pair (external feeds) ──
    const forexPairPool = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "GBP/JPY"];
    const cryptoPairPool = ["BTC/USD", "ETH/USD", "SOL/USD"];
    const goldPairName = "XAU/USD (Gold)";

    const [goldPrice, cryptoPrices, ...forexResults] = await Promise.all([
      fetchGoldPrice(),
      fetchCryptoPrices(),
      ...forexPairPool.map((p) => fetchForexPrice(p).then((pd) => ({ pair: p, data: pd }))),
    ]);

    // ── Pull the REAL MT5 broker quote for gold/forex/crypto too (same feed ──
    // the app uses to show "CURRENT" price), so signal entries stay in sync
    // with what the user actually sees live in-app instead of drifting from
    // Yahoo/CoinGecko. External feeds above are now only a fallback (used to
    // shape spread/volatility, and as the price if MT5 has no quote).
    const mt5PairNames = [goldPairName, ...forexPairPool, ...cryptoPairPool];
    const mt5Prices = await fetchMT5Prices(mt5PairNames, supabaseUrl, serviceRoleKey);

    // Strict: if the real MT5 quote isn't available for a pair this run, we
    // do NOT fall back to Yahoo/CoinGecko for a NEW signal's entry anymore.
    // A mismatched entry (vs. the real price fetch-live-prices checks TP/SL
    // against every minute) was causing signals to look like they hit TP/SL
    // "instantly" with no real movement — because they were never anchored
    // to the real price to begin with. Better to skip a pair for one cycle
    // than generate another bad-entry signal. hasMT5Price tracks this.
    let goldHasMT5 = false;
    if (mt5Prices[goldPairName]) {
      Object.assign(goldPrice, recenterOnMT5(goldPrice, mt5Prices[goldPairName]));
      goldHasMT5 = true;
    } else {
      console.log("No MT5 price for gold this run — skipping gold signal generation.");
    }

    const forexHasMT5: Record<string, boolean> = {};
    for (const fr of forexResults) {
      if (mt5Prices[fr.pair]) {
        Object.assign(fr.data, recenterOnMT5(fr.data, mt5Prices[fr.pair]));
        forexHasMT5[fr.pair] = true;
      } else {
        console.log(`No MT5 price for ${fr.pair} this run — skipping ${fr.pair} signal generation.`);
      }
    }

    const cryptoHasMT5: Record<string, boolean> = {};
    for (const cp of cryptoPairPool) {
      if (cryptoPrices[cp] && mt5Prices[cp]) {
        Object.assign(cryptoPrices[cp], recenterOnMT5(cryptoPrices[cp], mt5Prices[cp]));
        cryptoHasMT5[cp] = true;
      } else if (cryptoPrices[cp]) {
        console.log(`No MT5 price for ${cp} this run — skipping ${cp} signal generation.`);
      }
    }

    // Deriv synthetic indices — fetched from the same MT5 account (Deriv broker
    // carries these symbols natively), via the fetch-live-prices function so all
    // MT5 connection/symbol-matching logic stays in one place.
    const derivPairNames = ["BOOM 1000", "CRASH 1000", "VOL 75", "BOOM 500"];
    const derivPipMap: Record<string, number> = {
      "BOOM 1000": 10, "CRASH 1000": 10, "VOL 75": 1, "BOOM 500": 10,
    };
    const derivPool: { pair: string; pip: number; price: PriceData }[] = [];

    try {
      const derivResp = await fetch(
        `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(derivPairNames.join(","))}`,
        { headers: { Authorization: `Bearer ${serviceRoleKey}` } }
      );
      if (derivResp.ok) {
        const derivJson = await derivResp.json();
        const derivPrices: Record<string, string> = derivJson?.prices || {};
        for (const name of derivPairNames) {
          const raw = derivPrices[name];
          const p = raw ? parseFloat(raw) : NaN;
          if (p && p > 0) {
            derivPool.push({
              pair: name,
              pip: derivPipMap[name],
              price: { price: p, high: p * 1.002, low: p * 0.998 },
            });
          } else {
            console.log(`No real MT5 price for ${name} — skipping this run.`);
          }
        }
      } else {
        console.log("fetch-live-prices call for Deriv pairs failed:", derivResp.status);
      }
    } catch (e) {
      console.log("Deriv price fetch error:", String(e));
    }

    // ── Build the full candidate list with per-category thresholds ──
    const candidates: SignalConfig[] = [];

    if (goldHasMT5) {
      candidates.push({
        pair: goldPairName, category: "COMMODITIES", mainCategory: "COMMODITIES",
        subCategory: goldPairName, price: goldPrice, pipMultiplier: 1, decimals: 0,
        thresholdPct: 0.12,
      });
    }

    for (const fr of forexResults) {
      if (!forexHasMT5[fr.pair]) continue;
      const isJpy = fr.pair.includes("JPY");
      candidates.push({
        pair: fr.pair, category: "FOREX", mainCategory: "FOREX", subCategory: fr.pair,
        price: fr.data, pipMultiplier: isJpy ? 0.1 : 0.001, decimals: isJpy ? 2 : 4,
        thresholdPct: 0.12,
      });
    }

    for (const cp of cryptoPairPool) {
      if (!cryptoHasMT5[cp]) continue;
      const pd = cryptoPrices[cp];
      if (!pd) continue;
      const isSmall = pd.price < 10;
      candidates.push({
        pair: cp, category: "CRYPTO", mainCategory: "CRYPTO", subCategory: cp, price: pd,
        pipMultiplier: pd.price > 1000 ? 100 : pd.price > 50 ? 1 : 0.01,
        decimals: isSmall ? 4 : pd.price > 1000 ? 0 : 2,
        thresholdPct: 0.4, // crypto is naturally more volatile
      });
    }

    for (const d of derivPool) {
      candidates.push({
        pair: d.pair, category: "DERIV", mainCategory: "DERIV/BINARY", subCategory: d.pair,
        price: d.price, pipMultiplier: d.pip, decimals: 0,
        thresholdPct: 0.15,
      });
    }

    // ── Evaluate every pair independently: skip if still open, skip if no ──
    // ── real movement since its last signal, otherwise generate exactly ──
    // ── one fresh open signal for it. ──
    const newSignals: any[] = [];
    const decisions: Record<string, { generated: boolean; reason: string; pctMove?: number }> = {};

    for (const c of candidates) {
      const evalResult = await evaluatePair(supabase, c.pair, c.price.price, c.thresholdPct);
      decisions[c.pair] = { generated: evalResult.generate, reason: evalResult.reason, pctMove: evalResult.pctMove };
      if (evalResult.generate) {
        newSignals.push(generateOneOpenSignal(c, session));
      }
    }

    if (newSignals.length === 0) {
      console.log("No pairs eligible this run (all open or no movement).");
      return new Response(
        JSON.stringify({ success: true, generated: false, signals_created: 0, decisions }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase.from("signals").insert(newSignals).select("id, pair, type, entry, category");

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to insert signals", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: true,
        session,
        signals_created: data?.length || 0,
        decisions,
        signals: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
