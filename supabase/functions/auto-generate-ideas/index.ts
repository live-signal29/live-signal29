import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Candle = { t: number; o: number; h: number; l: number; c: number };

type Analysis = {
  action: "BUY" | "SELL";
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  fvg: { type: "bullish" | "bearish"; low: number; high: number } | null;
  bos: "Bullish BOS" | "Bearish BOS" | "No clear BOS";
  trend: "Bullish" | "Bearish" | "Range";
  trendline: "Rising" | "Falling" | "Flat";
  orderBlock: "Bullish OB" | "Bearish OB" | "None";
};

const PAIRS = [
  { pair: "XAU/USD (Gold)", yahoo: "GC=F", decimals: 2 },
  { pair: "EUR/USD", yahoo: "EURUSD=X", decimals: 5 },
  { pair: "GBP/USD", yahoo: "GBPUSD=X", decimals: 5 },
  { pair: "USD/JPY", yahoo: "JPY=X", decimals: 3 },
  { pair: "AUD/USD", yahoo: "AUDUSD=X", decimals: 5 },
  { pair: "USD/CAD", yahoo: "CAD=X", decimals: 5 },
  { pair: "USD/CHF", yahoo: "CHF=X", decimals: 5 },
  { pair: "BTC/USD", yahoo: "BTC-USD", decimals: 2 },
  { pair: "ETH/USD", yahoo: "ETH-USD", decimals: 2 },
  { pair: "XAG/USD (Silver)", yahoo: "SI=F", decimals: 2 },
];

const TF_MAP: Record<string, { interval: string; range: string }> = {
  H1: { interval: "60m", range: "5d" },
  H4: { interval: "60m", range: "1mo" },
};

function roundPrice(n: number, decimals: number) {
  return Number(n.toFixed(decimals));
}

async function fetchCandles(symbol: string, tf = "H1"): Promise<Candle[]> {
  const cfg = TF_MAP[tf] || TF_MAP.H1;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${cfg.interval}&range=${cfg.range}`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const result = data.chart?.result?.[0];
    const ts: number[] = result?.timestamp || [];
    const q = result?.indicators?.quote?.[0];
    const candles: Candle[] = [];
    for (let i = 0; i < ts.length; i++) {
      const o = q?.open?.[i], h = q?.high?.[i], l = q?.low?.[i], c = q?.close?.[i];
      if ([o, h, l, c].every((v) => Number.isFinite(v))) candles.push({ t: ts[i], o, h, l, c });
    }
    return candles.slice(-50);
  } catch (e) {
    console.error("Candle fetch failed", symbol, e);
    return [];
  }
}

async function fetchMt5Prices(
  pairs: string[],
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<Record<string, number>> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(pairs.join(","))}`,
      { headers: { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey } },
    );
    if (!response.ok) return {};
    const json = await response.json();
    const raw = json?.prices || {};
    const out: Record<string, number> = {};
    for (const pair of pairs) {
      const n = Number(raw[pair]);
      if (Number.isFinite(n) && n > 0) out[pair] = n;
    }
    return out;
  } catch (e) {
    console.error("MT5 price fetch failed", e);
    return {};
  }
}

function findSwingHigh(c: Candle[], i: number, w = 2) {
  if (i < w || i + w >= c.length) return false;
  for (let j = 1; j <= w; j++) if (c[i].h <= c[i - j].h || c[i].h <= c[i + j].h) return false;
  return true;
}
function findSwingLow(c: Candle[], i: number, w = 2) {
  if (i < w || i + w >= c.length) return false;
  for (let j = 1; j <= w; j++) if (c[i].l >= c[i - j].l || c[i].l >= c[i + j].l) return false;
  return true;
}

function analyze(candles: Candle[], livePrice: number, decimals: number): Analysis {
  const c = candles.slice(-40);
  const recent = c.slice(-20);
  const closes = recent.map(x => x.c);
  const first = closes[0] || livePrice;
  const last = livePrice || closes[closes.length - 1] || first;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const trend: Analysis["trend"] = pct > 0.1 ? "Bullish" : pct < -0.1 ? "Bearish" : "Range";

  const highs: { i: number; p: number }[] = [];
  const lows: { i: number; p: number }[] = [];
  for (let i = 2; i < c.length - 2; i++) {
    if (findSwingHigh(c, i)) highs.push({ i, p: c[i].h });
    if (findSwingLow(c, i)) lows.push({ i, p: c[i].l });
  }
  const lastHigh = highs[highs.length - 1];
  const prevHigh = highs[highs.length - 2];
  const lastLow = lows[lows.length - 1];
  const prevLow = lows[lows.length - 2];

  let bos: Analysis["bos"] = "No clear BOS";
  if (lastHigh && last > lastHigh.p) bos = "Bullish BOS";
  else if (lastLow && last < lastLow.p) bos = "Bearish BOS";

  let trendline: Analysis["trendline"] = "Flat";
  if (lastLow && prevLow) trendline = lastLow.p > prevLow.p ? "Rising" : lastLow.p < prevLow.p ? "Falling" : "Flat";

  let fvg: Analysis["fvg"] = null;
  for (let i = c.length - 1; i >= 2 && !fvg; i--) {
    const a = c[i - 2], d = c[i];
    if (a.h < d.l) fvg = { type: "bullish", low: a.h, high: d.l };
    else if (a.l > d.h) fvg = { type: "bearish", low: d.h, high: a.l };
  }

  let orderBlock: Analysis["orderBlock"] = "None";
  if (bos === "Bullish BOS") orderBlock = "Bullish OB";
  if (bos === "Bearish BOS") orderBlock = "Bearish OB";

  let action: Analysis["action"] = "BUY";
  if (bos === "Bearish BOS" || (trend === "Bearish" && fvg?.type !== "bullish")) action = "SELL";
  else if (bos === "Bullish BOS" || trend === "Bullish" || fvg?.type === "bullish") action = "BUY";

  const recentRange = Math.max(...recent.map(x => x.h)) - Math.min(...recent.map(x => x.l));
  const risk = Math.max(recentRange * 0.18, Math.abs(last) * 0.002);
  const entry = last;
  const tp1 = action === "BUY" ? last + risk * 1.5 : last - risk * 1.5;
  const tp2 = action === "BUY" ? last + risk * 2.8 : last - risk * 2.8;
  const sl = action === "BUY" ? last - risk : last + risk;

  return {
    action,
    entry: roundPrice(entry, decimals),
    tp1: roundPrice(tp1, decimals),
    tp2: roundPrice(tp2, decimals),
    sl: roundPrice(sl, decimals),
    fvg,
    bos,
    trend,
    trendline,
    orderBlock,
  };
}

function safeText(s: string) {
  return s.replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[ch]!));
}

function buildChartSVG(
  md: { candles: Candle[]; symbol: string; timeframe: string; price: number },
  plan: Analysis,
  title: string,
  decimals: number
): string {
  const W = 1000, H = 650, padL = 20, padR = 140, padT = 90, padB = 40;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const candles = md.candles.slice(-45);

  // FIX: Limit price bounds focused on candles + active levels to avoid candle squeezing
  const activePrices = candles.flatMap(x => [x.h, x.l]).concat([plan.entry, plan.sl, plan.tp1]);
  const maxP = Math.max(...activePrices);
  const minP = Math.min(...activePrices);
  const range = Math.max(maxP - minP, 0.0001);

  const yMax = maxP + range * 0.05;
  const yMin = minP - range * 0.05;
  const yRange = yMax - yMin;

  const slot = innerW / Math.max(candles.length, 1);
  const candleW = Math.max(6, slot * 0.65);
  const y = (p: number) => padT + ((yMax - p) / yRange) * innerH;

  // Background Grid Lines
  let grid = "", labels = "";
  for (let i = 0; i <= 6; i++) {
    const yy = padT + (innerH * i) / 6;
    const p = yMax - (yRange * i) / 6;
    grid += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="#1e293b" stroke-width="1" stroke-dasharray="2 4"/>`;
    labels += `<text x="${W - padR + 10}" y="${yy + 4}" fill="#64748b" font-size="11" font-family="monospace">${p.toFixed(decimals)}</text>`;
  }

  // Candlesticks rendering
  let body = "";
  candles.forEach((c, i) => {
    const x = padL + i * slot + (slot - candleW) / 2;
    const xm = x + candleW / 2;
    const isBull = c.c >= c.o;
    const color = isBull ? "#22c55e" : "#ef4444";
    const topY = y(Math.max(c.o, c.c));
    const botY = y(Math.min(c.o, c.c));
    const hY = y(c.h);
    const lY = y(c.l);

    body += `<line x1="${xm}" y1="${hY}" x2="${xm}" y2="${lY}" stroke="${color}" stroke-width="1.5"/>`;
    body += `<rect x="${x}" y="${topY}" width="${candleW}" height="${Math.max(2, botY - topY)}" fill="${color}" rx="1"/>`;
  });

  // Level Indicators (Entry, TP, SL)
  const renderLevel = (price: number, color: string, label: string) => {
    const yPos = y(price);
    if (yPos < padT || yPos > H - padB) return "";
    return `
      <line x1="${padL}" y1="${yPos}" x2="${W - padR}" y2="${yPos}" stroke="${color}" stroke-width="2" stroke-dasharray="5 3"/>
      <rect x="${W - padR}" y="${yPos - 11}" width="130" height="22" rx="4" fill="${color}"/>
      <text x="${W - padR + 8}" y="${yPos + 4}" fill="#ffffff" font-size="11" font-weight="bold" font-family="Arial">${label}: ${price}</text>
    `;
  };

  const actionBg = plan.action === "BUY" ? "#16a34a" : "#dc2626";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0b0f19"/>
  
  <!-- Header Info -->
  <text x="${padL}" y="35" fill="#ffffff" font-size="22" font-weight="800" font-family="Arial">${safeText(md.symbol)} (${md.timeframe})</text>
  <rect x="${W - padR - 110}" y="15" width="110" height="30" rx="6" fill="${actionBg}"/>
  <text x="${W - padR - 55}" y="35" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="Arial">${plan.action}</text>
  
  <text x="${padL}" y="60" fill="#94a3b8" font-size="12" font-family="Arial">Live: ${md.price} | SMC: ${plan.bos} | Trend: ${plan.trend}</text>

  <!-- Chart Main Area -->
  ${grid}
  ${body}
  
  <!-- Target lines -->
  ${renderLevel(plan.entry, "#3b82f6", "ENTRY")}
  ${renderLevel(plan.tp1, "#22c55e", "TP1")}
  ${renderLevel(plan.tp2, "#16a34a", "TP2")}
  ${renderLevel(plan.sl, "#ef4444", "SL")}
  ${labels}

  <!-- Footer -->
  <rect x="0" y="${H - 30}" width="${W}" height="30" fill="#030712"/>
  <text x="${padL}" y="${H - 10}" fill="#64748b" font-size="11" font-family="Arial">Live Market Signal • Auto Generated Analysis</text>
  </svg>`;
}

function buildDescription(pair: string, p: Analysis): string {
  return `📊 <b>${pair}</b> • ${p.action}\n💰 Entry: <code>${p.entry}</code>\n🎯 TP1: <code>${p.tp1}</code> | TP2: <code>${p.tp2}</code>\n🛑 SL: <code>${p.sl}</code>\n\n🧠 <b>Analysis Info</b>\n• Trend: ${p.trend}\n• Structure: ${p.bos}\n• OB: ${p.orderBlock}\n\n⚠️ Risk Disclaimer: Manage your risk accordingly.`;
}

async function uploadSvg(supabase: any, svg: string, filename: string): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(svg);
    const { error } = await supabase.storage.from("chart-images").upload(filename, bytes, { contentType: "image/svg+xml", upsert: true });
    if (error) { console.error("Chart upload error", error); return null; }
    return supabase.storage.from("chart-images").getPublicUrl(filename).data.publicUrl;
  } catch (e) { console.error("Chart upload exception", e); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const url = new URL(req.url);

    const requestedPair = url.searchParams.get("pair");
    const utcHour = new Date().getUTCHours();
    const slotIndex = Math.floor(utcHour / 3) % PAIRS.length;
    const cfg = PAIRS.find(x => x.pair === requestedPair) || PAIRS[slotIndex];

    const prices = await fetchMt5Prices(PAIRS.map(x => x.pair), supabaseUrl, serviceRoleKey);
    const livePrice = prices[cfg.pair];
    if (!livePrice) {
      return new Response(JSON.stringify({ success: false, error: `No live MT5 price for ${cfg.pair}` }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const candles = await fetchCandles(cfg.yahoo, "H1");
    if (candles.length < 12) {
      return new Response(JSON.stringify({ success: false, error: `Not enough chart candles` }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const last = candles[candles.length - 1];
    candles[candles.length - 1] = { ...last, c: livePrice, h: Math.max(last.h, livePrice), l: Math.min(last.l, livePrice) };

    const analysis = analyze(candles, livePrice, cfg.decimals);
    const svg = buildChartSVG({ candles, symbol: cfg.pair, timeframe: "H1", price: livePrice }, analysis, `${analysis.action} Analysis`, cfg.decimals);
    const filename = `auto-ideas/${Date.now()}-${cfg.pair.replace(/[^A-Za-z0-9]/g, "_")}.svg`;
    const imageUrl = await uploadSvg(supabase, svg, filename);

    const row = {
      title: `${analysis.action === "BUY" ? "🟢" : "🔴"} ${analysis.action} ${cfg.pair} @ ${analysis.entry}`,
      description: buildDescription(cfg.pair, analysis),
      published: true,
      image_url: imageUrl,
    };
    const { data, error } = await supabase.from("market_ideas").insert(row).select("id,title,description,image_url").single();
    if (error) throw error;

    return new Response(JSON.stringify({ success: true, pair: cfg.pair, live_price: livePrice, analysis, idea: data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
