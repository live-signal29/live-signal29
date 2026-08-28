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
    if (tf === "H4") {
      const agg: Candle[] = [];
      for (let i = 0; i < candles.length; i += 4) {
        const s = candles.slice(i, i + 4);
        if (!s.length) continue;
        agg.push({ t: s[0].t, o: s[0].o, h: Math.max(...s.map(x => x.h)), l: Math.min(...s.map(x => x.l)), c: s[s.length - 1].c });
      }
      return agg.slice(-60);
    }
    return candles.slice(-80);
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
  const c = candles.slice(-60);
  const recent = c.slice(-25);
  const closes = recent.map(x => x.c);
  const first = closes[0] || livePrice;
  const last = livePrice || closes[closes.length - 1] || first;
  const pct = first ? ((last - first) / first) * 100 : 0;
  const trend: Analysis["trend"] = pct > 0.12 ? "Bullish" : pct < -0.12 ? "Bearish" : "Range";

  const highs: { i: number; p: number }[] = [];
  const lows: { i: number; p: number }[] = [];
  for (let i = Math.max(2, c.length - 35); i < c.length - 2; i++) {
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
  else if (lastHigh && prevHigh) trendline = lastHigh.p > prevHigh.p ? "Rising" : lastHigh.p < prevHigh.p ? "Falling" : "Flat";

  let fvg: Analysis["fvg"] = null;
  for (let i = c.length - 1; i >= 2 && !fvg; i--) {
    const a = c[i - 2], b = c[i - 1], d = c[i];
    if (a.h < d.l) fvg = { type: "bullish", low: a.h, high: d.l };
    else if (a.l > d.h) fvg = { type: "bearish", low: d.h, high: a.l };
  }

  let orderBlock: Analysis["orderBlock"] = "None";
  if (bos === "Bullish BOS") orderBlock = "Bullish OB";
  if (bos === "Bearish BOS") orderBlock = "Bearish OB";

  let action: Analysis["action"] = "BUY";
  if (bos === "Bearish BOS" || (trend === "Bearish" && fvg?.type !== "bullish")) action = "SELL";
  else if (bos === "Bullish BOS" || trend === "Bullish" || fvg?.type === "bullish") action = "BUY";
  else if (fvg?.type === "bearish") action = "SELL";

  const recentRange = Math.max(...recent.map(x => x.h)) - Math.min(...recent.map(x => x.l));
  const risk = Math.max(recentRange * 0.12, Math.abs(last) * 0.0012);
  const entry = last;
  const tp1 = action === "BUY" ? last + risk * 1.5 : last - risk * 1.5;
  const tp2 = action === "BUY" ? last + risk * 2.6 : last - risk * 2.6;
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
): string {
  const W = 1000, H = 600, padL = 70, padR = 170, padT = 110, padB = 65;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const candles = md.candles.slice(-60);
  const prices = candles.flatMap(x => [x.h, x.l]).concat([plan.entry, plan.tp1, plan.tp2, plan.sl]);
  if (plan.fvg) prices.push(plan.fvg.low, plan.fvg.high);
  const maxP = Math.max(...prices), minP = Math.min(...prices), range = Math.max(maxP - minP, 1);
  const yMax = maxP + range * 0.08, yMin = minP - range * 0.08, yRange = yMax - yMin;
  const slot = innerW / Math.max(candles.length, 1), candleW = Math.max(3, slot * 0.62);
  const y = (p: number) => padT + ((yMax - p) / yRange) * innerH;

  let grid = "", labels = "";
  for (let i = 0; i <= 5; i++) {
    const yy = padT + innerH * i / 5, p = yMax - yRange * i / 5;
    grid += `<line x1="${padL}" y1="${yy}" x2="${W-padR}" y2="${yy}" stroke="#263244" stroke-width="1" stroke-dasharray="4 4"/>`;
    labels += `<text x="${W-padR+8}" y="${yy+4}" fill="#9ca3af" font-size="12" font-family="monospace">${p.toFixed(2)}</text>`;
  }

  let body = "";
  candles.forEach((c, i) => {
    const x = padL + i * slot + (slot-candleW)/2, xm = x+candleW/2;
    const color = c.c >= c.o ? "#22c55e" : "#ef4444";
    body += `<line x1="${xm}" y1="${y(c.h)}" x2="${xm}" y2="${y(c.l)}" stroke="${color}" stroke-width="1.2"/>`;
    body += `<rect x="${x}" y="${Math.min(y(c.o),y(c.c))}" width="${candleW}" height="${Math.max(1,Math.abs(y(c.c)-y(c.o)))}" fill="${color}"/>`;
  });

  // Trendline: last two confirmed swing lows for bullish/rising structure, otherwise highs.
  const pivots: {i:number;p:number}[] = [];
  const useLows = plan.action === "BUY";
  for (let i = 2; i < candles.length-2; i++) {
    const ok = useLows ? findSwingLow(candles, i) : findSwingHigh(candles, i);
    if (ok) pivots.push({ i, p: useLows ? candles[i].l : candles[i].h });
  }
  let trendLine = "";
  if (pivots.length >= 2) {
    const a = pivots[pivots.length-2], b = pivots[pivots.length-1];
    const xa = padL+a.i*slot+slot/2, xb = padL+b.i*slot+slot/2;
    trendLine = `<line x1="${xa}" y1="${y(a.p)}" x2="${xb}" y2="${y(b.p)}" stroke="#f59e0b" stroke-width="3"/>`;
  }

  let fvgRect = "";
  if (plan.fvg) {
    const top = y(plan.fvg.high), bottom = y(plan.fvg.low);
    const color = plan.fvg.type === "bullish" ? "#22c55e" : "#ef4444";
    fvgRect = `<rect x="${padL+innerW*0.42}" y="${Math.min(top,bottom)}" width="${innerW*0.5}" height="${Math.max(8,Math.abs(bottom-top))}" fill="${color}" opacity="0.14" stroke="${color}" stroke-dasharray="6 4"/><text x="${padL+innerW*0.43}" y="${Math.min(top,bottom)-6}" fill="${color}" font-size="12" font-weight="bold">${plan.fvg.type.toUpperCase()} FVG</text>`;
  }

  const line = (price:number, color:string, label:string, dash="7 4") => `<line x1="${padL}" y1="${y(price)}" x2="${W-padR}" y2="${y(price)}" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/><rect x="${W-padR+2}" y="${y(price)-10}" width="62" height="20" rx="3" fill="${color}"/><text x="${W-padR+8}" y="${y(price)+4}" fill="white" font-size="11" font-weight="bold">${label}</text><text x="${W-padR+68}" y="${y(price)+4}" fill="${color}" font-size="11" font-weight="bold">${price}</text>`;
  const actionColor = plan.action === "BUY" ? "#22c55e" : "#ef4444";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07101f"/><stop offset="1" stop-color="#101827"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#bg2)"/>
  <text x="${padL}" y="32" fill="#f8fafc" font-size="24" font-weight="800" font-family="Arial">${safeText(md.symbol)} • ${md.timeframe}</text>
  <text x="${padL}" y="56" fill="#94a3b8" font-size="13" font-family="Arial">${safeText(title.slice(0, 100))}</text>
  <rect x="${padL}" y="70" width="${innerW}" height="30" rx="7" fill="#111c2f"/>
  <text x="${padL+12}" y="91" fill="${actionColor}" font-size="14" font-weight="800" font-family="Arial">${plan.action} • Live MT5 ${md.price} • ${plan.bos} • ${plan.trend}</text>
  ${grid}${fvgRect}${body}${trendLine}${line(plan.entry,"#3b82f6","ENTRY","8 3")}${line(plan.tp1,"#22c55e","TP1")}${line(plan.tp2,"#16a34a","TP2")}${line(plan.sl,"#ef4444","SL")}${labels}
  <rect x="${padL}" y="${H-48}" width="${innerW}" height="28" rx="6" fill="#111c2f"/>
  <text x="${padL+12}" y="${H-29}" fill="#cbd5e1" font-size="11" font-family="Arial">SMC: ${plan.bos} • ${plan.orderBlock} • Trendline: ${plan.trendline} • FVG: ${plan.fvg ? plan.fvg.type : "none"} • Live MT5 feed</text>
  </svg>`;
}

function buildDescription(pair: string, p: Analysis): string {
  const fvg = p.fvg ? `${p.fvg.type === "bullish" ? "Bullish" : "Bearish"} FVG ${p.fvg.low.toFixed(2)}–${p.fvg.high.toFixed(2)}` : "No clean FVG";
  return `📊 <b>${pair}</b> • ${p.action}\n💰 Entry: <code>${p.entry}</code>\n🎯 TP1: <code>${p.tp1}</code> • TP2: <code>${p.tp2}</code>\n🛑 SL: <code>${p.sl}</code>\n\n🧠 <b>Chart Analysis</b>\n• SMC: ${p.bos} / ${p.orderBlock}\n• Trendline: ${p.trendline} • Trend: ${p.trend}\n• FVG: ${fvg}\n\n⚠️ Educational idea only. Use your own risk management.`;
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

    // One invocation = one post. Cron runs 8 times/day. A manual request can pass ?pair=EUR/USD.
    const requestedPair = url.searchParams.get("pair");
    const utcHour = new Date().getUTCHours();
    const slotIndex = Math.floor(utcHour / 3) % PAIRS.length;
    const cfg = PAIRS.find(x => x.pair === requestedPair) || PAIRS[slotIndex];

    const prices = await fetchMt5Prices(PAIRS.map(x => x.pair), supabaseUrl, serviceRoleKey);
    const livePrice = prices[cfg.pair];
    if (!livePrice) {
      return new Response(JSON.stringify({ success:false, error:`No live MT5 price for ${cfg.pair}`, available:Object.keys(prices) }), { status: 503, headers:{...corsHeaders,"Content-Type":"application/json"} });
    }

    const candles = await fetchCandles(cfg.yahoo, "H1");
    if (candles.length < 12) {
      return new Response(JSON.stringify({ success:false, error:`Not enough chart candles for ${cfg.pair}` }), { status: 503, headers:{...corsHeaders,"Content-Type":"application/json"} });
    }
    // Anchor the latest candle to the real MT5 price so the chart and levels use the live feed.
    const last = candles[candles.length-1];
    candles[candles.length-1] = { ...last, c: livePrice, h: Math.max(last.h, livePrice), l: Math.min(last.l, livePrice) };

    const analysis = analyze(candles, livePrice, cfg.decimals);
    const tf = "H1";
    const title = `${analysis.action} idea • SMC + FVG + Trendline`;
    const svg = buildChartSVG({ candles, symbol: cfg.pair, timeframe: tf, price: livePrice }, analysis, title);
    const filename = `auto-ideas/${Date.now()}-${cfg.pair.replace(/[^A-Za-z0-9]/g,"_")}.svg`;
    const imageUrl = await uploadSvg(supabase, svg, filename);

    const row = {
      title: `${analysis.action === "BUY" ? "🟢" : "🔴"} ${analysis.action} ${cfg.pair} @ ${analysis.entry}`,
      description: buildDescription(cfg.pair, analysis),
      published: true,
      image_url: imageUrl,
    };
    const { data, error } = await supabase.from("market_ideas").insert(row).select("id,title,description,image_url").single();
    if (error) throw error;

    let telegram = false;
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/telegram-signal-post`, {
        method:"POST",
        headers:{"Content-Type":"application/json", Authorization:`Bearer ${serviceRoleKey}`, apikey:serviceRoleKey},
        body:JSON.stringify({ action:"new_idea", idea:data }),
      });
      const result = await response.json();
      telegram = Boolean(result?.success);
    } catch (e) { console.error("Telegram idea error", e); }

    return new Response(JSON.stringify({ success:true, pair:cfg.pair, live_price:livePrice, analysis, idea:data, telegram }), { headers:{...corsHeaders,"Content-Type":"application/json"} });
  } catch (error) {
    console.error("auto-generate-ideas error", error);
    return new Response(JSON.stringify({ success:false, error:error instanceof Error ? error.message : String(error) }), { status:500, headers:{...corsHeaders,"Content-Type":"application/json"} });
  }
});
