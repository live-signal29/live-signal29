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
}

function generateSignalsForAsset(config: SignalConfig, session: "morning" | "evening", count: number) {
  const { pair, category, mainCategory, subCategory, price, pipMultiplier, decimals } = config;
  const signals = [];
  const now = new Date();
  const baseHour = session === "morning" ? 8 : 15;
  const premiumIndex = count - 1; // last signal is premium

  for (let i = 0; i < count; i++) {
    const isBuy = i % 2 === 0;
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

    const signalTime = new Date(now);
    signalTime.setUTCHours(baseHour + i, Math.floor(Math.random() * 45), 0, 0);

    signals.push({
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
      is_premium: i === premiumIndex,
      is_activated: true,
      activated_at: signalTime.toISOString(),
      entry_mode: "market",
      signal_type: pick(["Scalping", "Intraday", "Swing"]),
      risk_level: pick(["Low", "Medium", "High"]),
      analysis_reason: isBuy ? pick(buyReasons) : pick(sellReasons),
      tag: null,
      signal_raw_text: null,
      published: true,
      created_at: signalTime.toISOString(),
    });
  }
  return signals;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const currentHour = new Date().getUTCHours();
    const session = currentHour < 12 ? "morning" : "evening";

    // ── Fetch all live prices in parallel ──
    console.log("Fetching live prices for all categories...");

    const forexPairs = ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "GBP/JPY"];
    const selectedForex = [pick(forexPairs), pick(forexPairs.filter(p => p !== forexPairs[0]))];
    // Ensure 2 unique forex pairs
    const forexSet = new Set<string>();
    while (forexSet.size < 2) forexSet.add(pick(forexPairs));
    const forexToUse = [...forexSet];

    const [goldPrice, cryptoPrices, ...forexPrices] = await Promise.all([
      fetchGoldPrice(),
      fetchCryptoPrices(),
      ...forexToUse.map(p => fetchForexPrice(p).then(pd => ({ pair: p, data: pd }))),
    ]);

    console.log(`Gold: $${goldPrice.price}`);

    const allSignals: any[] = [];

    // ── 1) XAUUSD Gold - 4 signals (3 free + 1 premium) ──
    allSignals.push(...generateSignalsForAsset({
      pair: "XAU/USD (Gold)", category: "COMMODITIES", mainCategory: "COMMODITIES",
      subCategory: "XAU/USD (Gold)", price: goldPrice, pipMultiplier: 1, decimals: 0,
    }, session, 4));

    // ── 2) Forex - 5 signals across different pairs ──
    const forexConfigs: SignalConfig[] = [];
    for (const fp of forexPrices) {
      const isJpy = fp.pair.includes("JPY");
      forexConfigs.push({
        pair: fp.pair, category: "FOREX", mainCategory: "FOREX",
        subCategory: fp.pair, price: fp.data,
        pipMultiplier: isJpy ? 0.1 : 0.001, decimals: isJpy ? 2 : 4,
      });
    }
    // Generate 2-3 signals per forex pair to total ~5
    let forexCount = 0;
    for (const fc of forexConfigs) {
      const count = forexCount === 0 ? 3 : 2;
      allSignals.push(...generateSignalsForAsset(fc, session, count));
      forexCount++;
    }

    // ── 3) Crypto - 4 signals across different coins ──
    const cryptoPairNames = ["BTC/USD", "ETH/USD", "SOL/USD"];
    const selectedCrypto = cryptoPairNames.slice(0, 2);
    for (const cp of selectedCrypto) {
      const pd = cryptoPrices[cp];
      if (!pd) continue;
      const isSmall = pd.price < 10;
      allSignals.push(...generateSignalsForAsset({
        pair: cp, category: "CRYPTO", mainCategory: "CRYPTO",
        subCategory: cp, price: pd,
        pipMultiplier: pd.price > 1000 ? 100 : pd.price > 50 ? 1 : 0.01,
        decimals: isSmall ? 4 : pd.price > 1000 ? 0 : 2,
      }, session, 2));
    }

    // ── 4) Deriv - 4 signals ──
    const derivPairs = [
      { pair: "BOOM 1000", price: { price: 8950, high: 9050, low: 8850 }, pip: 10 },
      { pair: "CRASH 1000", price: { price: 9150, high: 9250, low: 9050 }, pip: 10 },
      { pair: "VOL 75", price: { price: 450000, high: 455000, low: 445000 }, pip: 1000 },
      { pair: "BOOM 500", price: { price: 7820, high: 7920, low: 7720 }, pip: 10 },
    ];
    const selectedDeriv = [pick(derivPairs), pick(derivPairs)];
    const derivSet = new Map<string, typeof derivPairs[0]>();
    while (derivSet.size < 2) { const d = pick(derivPairs); derivSet.set(d.pair, d); }
    for (const [, d] of derivSet) {
      allSignals.push(...generateSignalsForAsset({
        pair: d.pair, category: "DERIV", mainCategory: "DERIV/BINARY",
        subCategory: d.pair, price: d.price, pipMultiplier: d.pip, decimals: 0,
      }, session, 2));
    }

    console.log(`Total signals generated: ${allSignals.length}`);

    // Insert all signals
    const { data, error } = await supabase.from("signals").insert(allSignals).select("id, pair, type, entry, category");

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
        session,
        gold_price: goldPrice.price,
        signals_created: data?.length || 0,
        categories: {
          COMMODITIES: allSignals.filter(s => s.category === "COMMODITIES").length,
          FOREX: allSignals.filter(s => s.category === "FOREX").length,
          CRYPTO: allSignals.filter(s => s.category === "CRYPTO").length,
          DERIV: allSignals.filter(s => s.category === "DERIV").length,
        },
        signals: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
