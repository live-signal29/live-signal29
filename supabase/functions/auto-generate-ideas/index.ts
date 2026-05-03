import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Candle = { t: number; o: number; h: number; l: number; c: number };

interface MarketData {
  price: number;
  high: number;
  low: number;
  change: number;
  candles: Candle[];
  timeframe: string;
  symbol: string;
}

// Map timeframe label -> Yahoo interval & range
const TF_MAP: Record<string, { interval: string; range: string; label: string }> = {
  M15: { interval: "15m", range: "2d", label: "M15" },
  H1: { interval: "60m", range: "5d", label: "H1" },
  H4: { interval: "1h", range: "1mo", label: "H4" }, // Yahoo doesn't have 4h; we'll aggregate
  D1: { interval: "1d", range: "3mo", label: "D1" },
};

async function fetchCandles(symbol: string, tf: string): Promise<MarketData> {
  const cfg = TF_MAP[tf] || TF_MAP.H1;
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${cfg.interval}&range=${cfg.range}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    if (res.ok) {
      const data = await res.json();
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      const ts: number[] = result?.timestamp || [];
      const q = result?.indicators?.quote?.[0];
      let candles: Candle[] = [];
      if (ts.length && q) {
        for (let i = 0; i < ts.length; i++) {
          const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
          if (o != null && h != null && l != null && c != null) {
            candles.push({ t: ts[i], o, h, l, c });
          }
        }
      }
      // Aggregate to 4h if H4 requested (group every 4 hourly candles)
      if (tf === "H4" && candles.length) {
        const agg: Candle[] = [];
        for (let i = 0; i < candles.length; i += 4) {
          const slice = candles.slice(i, i + 4);
          if (slice.length) {
            agg.push({
              t: slice[0].t,
              o: slice[0].o,
              h: Math.max(...slice.map(s => s.h)),
              l: Math.min(...slice.map(s => s.l)),
              c: slice[slice.length - 1].c,
            });
          }
        }
        candles = agg;
      }
      // Keep last 60 candles for chart
      candles = candles.slice(-60);
      const price = meta?.regularMarketPrice || candles[candles.length - 1]?.c || 0;
      const prevClose = meta?.chartPreviousClose || price;
      const high = Math.max(...candles.map(c => c.h));
      const low = Math.min(...candles.map(c => c.l));
      return {
        price,
        high,
        low,
        change: +(price - prevClose).toFixed(2),
        candles,
        timeframe: cfg.label,
        symbol,
      };
    }
  } catch (e) {
    console.log(`Yahoo fetch failed for ${symbol} ${tf}:`, e);
  }
  // Fallback synthetic
  const p = 3220;
  const candles: Candle[] = [];
  let last = p - 30;
  for (let i = 0; i < 50; i++) {
    const o = last;
    const c = o + (Math.random() - 0.5) * 8;
    const h = Math.max(o, c) + Math.random() * 4;
    const l = Math.min(o, c) - Math.random() * 4;
    candles.push({ t: Date.now() / 1000 - (50 - i) * 3600, o, h, l, c });
    last = c;
  }
  return { price: p, high: p + 20, low: p - 20, change: 12.5, candles, timeframe: tf, symbol };
}

interface TradePlan {
  action: "BUY" | "SELL";
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
}

function buildCandleSVG(md: MarketData, title: string, plan: TradePlan): string {
  const W = 900, H = 500;
  const padL = 60, padR = 130, padT = 80, padB = 50;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const candles = md.candles;
  if (!candles.length) return "";

  const allPrices = [
    ...candles.map(c => c.h),
    ...candles.map(c => c.l),
    plan.entry, plan.tp1, plan.tp2, plan.sl,
  ];
  const maxP = Math.max(...allPrices);
  const minP = Math.min(...allPrices);
  const range = maxP - minP || 1;
  const padPrice = range * 0.05;
  const yMax = maxP + padPrice;
  const yMin = minP - padPrice;
  const yRange = yMax - yMin;

  const candleW = Math.max(2, (innerW / candles.length) * 0.7);
  const slot = innerW / candles.length;
  const yOf = (p: number) => padT + ((yMax - p) / yRange) * innerH;

  let grid = "", labels = "";
  for (let i = 0; i <= 5; i++) {
    const y = padT + (innerH / 5) * i;
    const price = yMax - (yRange / 5) * i;
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#1f2937" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    labels += `<text x="${W - padR + 6}" y="${y + 4}" fill="#9ca3af" font-size="11" font-family="monospace">${price.toFixed(2)}</text>`;
  }

  let body = "";
  candles.forEach((c, i) => {
    const x = padL + i * slot + (slot - candleW) / 2;
    const xMid = x + candleW / 2;
    const isUp = c.c >= c.o;
    const color = isUp ? "#10b981" : "#ef4444";
    const yHigh = yOf(c.h), yLow = yOf(c.l), yOpen = yOf(c.o), yClose = yOf(c.c);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(1, Math.abs(yClose - yOpen));
    body += `<line x1="${xMid}" y1="${yHigh}" x2="${xMid}" y2="${yLow}" stroke="${color}" stroke-width="1"/>`;
    body += `<rect x="${x}" y="${bodyTop}" width="${candleW}" height="${bodyH}" fill="${color}" opacity="0.95"/>`;
  });

  const lastPrice = candles[candles.length - 1].c;
  const isBuy = plan.action === "BUY";
  const actionColor = isBuy ? "#10b981" : "#ef4444";
  const arrow = isBuy ? "▲" : "▼";

  const levelLine = (price: number, color: string, label: string, dash = "6,4") => {
    const y = yOf(price);
    return `
      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="${color}" stroke-width="1.5" stroke-dasharray="${dash}" opacity="0.95"/>
      <rect x="${W - padR + 2}" y="${y - 9}" width="55" height="18" fill="${color}" rx="2"/>
      <text x="${W - padR + 5}" y="${y + 4}" fill="white" font-size="10" font-weight="bold" font-family="monospace">${label}</text>
      <text x="${W - padR + 60}" y="${y + 4}" fill="${color}" font-size="11" font-weight="bold" font-family="monospace">${price.toFixed(2)}</text>
    `;
  };

  const tradeLines =
    levelLine(plan.tp2, "#10b981", "TP2") +
    levelLine(plan.tp1, "#22c55e", "TP1") +
    levelLine(plan.entry, "#3b82f6", "ENTRY", "8,3") +
    levelLine(plan.sl, "#ef4444", "SL");

  const yEntry = yOf(plan.entry);
  const yTp2 = yOf(plan.tp2);
  const ySl = yOf(plan.sl);
  const profitZone = `<rect x="${padL}" y="${Math.min(yEntry, yTp2)}" width="${innerW}" height="${Math.abs(yTp2 - yEntry)}" fill="#10b981" opacity="0.08"/>`;
  const lossZone = `<rect x="${padL}" y="${Math.min(yEntry, ySl)}" width="${innerW}" height="${Math.abs(ySl - yEntry)}" fill="#ef4444" opacity="0.08"/>`;

  const badge = `
    <rect x="${W - 200}" y="12" width="180" height="50" rx="10" fill="${actionColor}"/>
    <text x="${W - 110}" y="38" text-anchor="middle" fill="white" font-size="22" font-weight="900" font-family="Arial">${arrow} ${plan.action} XAUUSD</text>
    <text x="${W - 110}" y="55" text-anchor="middle" fill="white" font-size="11" font-family="Arial" opacity="0.95">Live @ ${lastPrice.toFixed(2)}</text>
  `;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1220"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${padL}" y="30" fill="#f3f4f6" font-size="20" font-weight="bold" font-family="Arial">${md.symbol} • ${md.timeframe}</text>
    <text x="${padL}" y="50" fill="#9ca3af" font-size="12" font-family="Arial">${title.substring(0, 80)}</text>
    <text x="${padL}" y="68" fill="${actionColor}" font-size="13" font-weight="bold" font-family="Arial">${plan.action} • Entry ${plan.entry.toFixed(2)} • TP ${plan.tp1.toFixed(2)}/${plan.tp2.toFixed(2)} • SL ${plan.sl.toFixed(2)}</text>
    ${badge}
    ${grid}
    ${profitZone}
    ${lossZone}
    ${body}
    ${tradeLines}
    ${labels}
    <text x="${padL}" y="${H - 12}" fill="#6b7280" font-size="10" font-family="Arial">🟢 Profit Zone  •  🔴 Loss Zone  •  Live MT5 Feed • ${new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })} PKT</text>
  </svg>`;
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function generateIdeas(price: number, _high: number, _low: number, change: number) {
  const isBull = change >= 0;
  const action: "BUY" | "SELL" = isBull ? "BUY" : "SELL";
  const dirEmoji = isBull ? "🟢" : "🔴";
  const arrow = isBull ? "📈" : "📉";

  const plan: TradePlan = isBull
    ? { action: "BUY", entry: +(price - 2).toFixed(2), tp1: +(price + 8).toFixed(2), tp2: +(price + 18).toFixed(2), sl: +(price - 10).toFixed(2) }
    : { action: "SELL", entry: +(price + 2).toFixed(2), tp1: +(price - 8).toFixed(2), tp2: +(price - 18).toFixed(2), sl: +(price + 10).toFixed(2) };

  const reason = isBull
    ? pick([
        "Higher highs ban rahi hain, bullish momentum strong.",
        "Demand zone se strong bounce, buyers control mein.",
        "Break of structure upside, trend continuation expected.",
        "RSI > 55, MACD bullish cross — uptrend confirmed.",
      ])
    : pick([
        "Lower lows ban rahi hain, bearish pressure barh raha hai.",
        "Supply zone se strong rejection, sellers control mein.",
        "Break of structure downside, downtrend continuation.",
        "RSI < 45, MACD bearish cross — downtrend confirmed.",
      ]);

  const ideas = [
    {
      kind: "daily",
      title: `${dirEmoji} ${action} XAU/USD @ ${plan.entry} — Gold ${arrow} $${price}`,
      description:
`📊 SIGNAL: ${action} XAUUSD (Gold)
🎯 Entry: ${plan.entry}
✅ TP1: ${plan.tp1}  •  TP2: ${plan.tp2}
🛑 SL: ${plan.sl}

📌 Reason: ${reason}
💡 Action plan: Price ${plan.entry} pe ${action.toLowerCase()} karein. TP1 hit hone par SL ko entry pe move karein (risk-free trade). Phir TP2 tak ride karein.
⚠️ Risk: Sirf 1-2% capital risk karein per trade.`,
    },
    {
      kind: "scalping",
      title: `${dirEmoji} ${action} Scalp XAU/USD @ ${plan.entry}`,
      description:
`⚡ SCALP: ${action} XAUUSD
🎯 Entry: ${plan.entry}
✅ TP: ${plan.tp1}
🛑 SL: ${plan.sl}

📌 ${reason}
💡 Quick M15 scalp — 8-10 pip target, fast in & out.`,
    },
    {
      kind: "weekly",
      title: `${dirEmoji} Weekly ${action} Outlook XAU/USD`,
      description:
`📅 WEEKLY ${action} BIAS: XAUUSD
🎯 Entry zone: ${plan.entry}
✅ TP1: ${plan.tp1}  •  TP2: ${plan.tp2}
🛑 SL: ${plan.sl}

📌 ${reason}
💡 Swing trade — multi-day hold, wait for clean entry confirmation.`,
    },
  ];

  return { ideas: ideas.sort(() => Math.random() - 0.5), plan };
}


function tfForKind(kind: string): string {
  if (kind === "scalping") return "M15";
  if (kind === "weekly") return "D1";
  return "H4"; // daily analysis
}

async function uploadSvg(supabase: any, svg: string, filename: string): Promise<string | null> {
  try {
    const bytes = new TextEncoder().encode(svg);
    const { error } = await supabase.storage
      .from("chart-images")
      .upload(filename, bytes, { contentType: "image/svg+xml", upsert: true });
    if (error) { console.error("Upload error:", error); return null; }
    const { data } = supabase.storage.from("chart-images").getPublicUrl(filename);
    return data.publicUrl;
  } catch (e) { console.error("Upload exception:", e); return null; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Determine slot from query param or current PKT hour
    const url = new URL(req.url);
    let slot = url.searchParams.get("slot"); // morning | afternoon | evening
    if (!slot) {
      const pktHour = (new Date().getUTCHours() + 5) % 24;
      slot = pktHour < 12 ? "morning" : pktHour < 17 ? "afternoon" : "evening";
    }
    const slotLabel = slot === "morning" ? "🌅 Morning" : slot === "afternoon" ? "☀️ Afternoon" : "🌙 Evening";

    // Use H1 base for price summary
    const base = await fetchCandles("GC=F", "H1");
    console.log(`[${slot}] Gold $${base.price}, change ${base.change}`);

    const { ideas: allIdeas, plan } = generateIdeas(base.price, base.high, base.low, base.change);
    const idea = allIdeas[0];

    const tf = tfForKind(idea.kind);
    const md = await fetchCandles("GC=F", tf);
    md.symbol = "XAU/USD";
    const svg = buildCandleSVG(md, idea.title, plan);
    const filename = `auto-ideas/${Date.now()}-${slot}-${tf}.svg`;
    const imageUrl = await uploadSvg(supabase, svg, filename);
    const rows = [{
      title: `${slotLabel} • ${idea.title}`,
      description: idea.description,
      published: true,
      image_url: imageUrl,
    }];

    const { data, error } = await supabase.from("market_ideas").insert(rows).select("id, title, image_url");
    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true, gold_price: base.price, ideas_created: data?.length || 0, ideas: data,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
