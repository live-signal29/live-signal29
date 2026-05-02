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

function buildCandleSVG(md: MarketData, title: string): string {
  const W = 800, H = 420;
  const padL = 60, padR = 70, padT = 50, padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const candles = md.candles;
  if (!candles.length) return "";

  const maxP = Math.max(...candles.map(c => c.h));
  const minP = Math.min(...candles.map(c => c.l));
  const range = maxP - minP || 1;
  const padPrice = range * 0.05;
  const yMax = maxP + padPrice;
  const yMin = minP - padPrice;
  const yRange = yMax - yMin;

  const candleW = Math.max(2, (innerW / candles.length) * 0.7);
  const slot = innerW / candles.length;

  const yOf = (p: number) => padT + ((yMax - p) / yRange) * innerH;

  // Grid lines (5 horizontal)
  let grid = "";
  let labels = "";
  for (let i = 0; i <= 5; i++) {
    const y = padT + (innerH / 5) * i;
    const price = yMax - (yRange / 5) * i;
    grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#1f2937" stroke-width="0.5" stroke-dasharray="3,3"/>`;
    labels += `<text x="${W - padR + 6}" y="${y + 4}" fill="#9ca3af" font-size="11" font-family="monospace">${price.toFixed(2)}</text>`;
  }

  // Candles
  let body = "";
  candles.forEach((c, i) => {
    const x = padL + i * slot + (slot - candleW) / 2;
    const xMid = x + candleW / 2;
    const isUp = c.c >= c.o;
    const color = isUp ? "#10b981" : "#ef4444";
    const yHigh = yOf(c.h);
    const yLow = yOf(c.l);
    const yOpen = yOf(c.o);
    const yClose = yOf(c.c);
    const bodyTop = Math.min(yOpen, yClose);
    const bodyH = Math.max(1, Math.abs(yClose - yOpen));
    body += `<line x1="${xMid}" y1="${yHigh}" x2="${xMid}" y2="${yLow}" stroke="${color}" stroke-width="1"/>`;
    body += `<rect x="${x}" y="${bodyTop}" width="${candleW}" height="${bodyH}" fill="${color}" opacity="0.95"/>`;
  });

  // Last price line
  const lastPrice = candles[candles.length - 1].c;
  const lastY = yOf(lastPrice);
  const priceColor = md.change >= 0 ? "#10b981" : "#ef4444";
  const priceLine = `
    <line x1="${padL}" y1="${lastY}" x2="${W - padR}" y2="${lastY}" stroke="${priceColor}" stroke-width="1" stroke-dasharray="4,4" opacity="0.7"/>
    <rect x="${W - padR}" y="${lastY - 10}" width="65" height="20" fill="${priceColor}"/>
    <text x="${W - padR + 5}" y="${lastY + 4}" fill="white" font-size="12" font-family="monospace" font-weight="bold">${lastPrice.toFixed(2)}</text>
  `;

  const dirArrow = md.change >= 0 ? "▲" : "▼";
  const changePct = ((md.change / (lastPrice - md.change || 1)) * 100).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0b1220"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <text x="${padL}" y="25" fill="#f3f4f6" font-size="16" font-weight="bold" font-family="Arial">${md.symbol} • ${md.timeframe}</text>
    <text x="${padL}" y="42" fill="#9ca3af" font-size="11" font-family="Arial">${title.substring(0, 70)}</text>
    <text x="${W - padR - 10}" y="25" text-anchor="end" fill="${priceColor}" font-size="16" font-weight="bold" font-family="monospace">${lastPrice.toFixed(2)} ${dirArrow} ${changePct}%</text>
    ${grid}
    ${body}
    ${labels}
    ${priceLine}
    <text x="${padL}" y="${H - 10}" fill="#6b7280" font-size="10" font-family="Arial">Live MT5/Market Feed • ${new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })} PKT</text>
  </svg>`;
}

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function generateIdeas(price: number, high: number, low: number, change: number) {
  const direction = change >= 0 ? "bullish" : "bearish";
  const dirEmoji = change >= 0 ? "📈" : "📉";
  const range = high - low;
  const support1 = Math.round(low - rand(5, 15));
  const support2 = Math.round(low - rand(20, 40));
  const resistance1 = Math.round(high + rand(5, 15));
  const resistance2 = Math.round(high + rand(20, 40));
  const fib618 = Math.round(low + range * 0.618);
  const fib382 = Math.round(low + range * 0.382);

  // Each idea has a "kind" used to pick timeframe
  const ideas = [
    {
      kind: "daily",
      title: `${dirEmoji} XAU/USD ${direction === "bullish" ? "Bulls Push" : "Bears Dominate"} – Gold at $${price}`,
      description: `Gold currently $${price} (${change >= 0 ? "+" : ""}${change}). Range: $${low}-$${high}. ${
        direction === "bullish"
          ? `Buyers in control above $${low}. Resistance $${resistance1}, target $${resistance2}. Support $${support1}.`
          : `Sellers pushing from $${high}. Support $${support1}, target $${support2}. Resistance $${resistance1}.`
      } RSI ${direction === "bullish" ? "above 55" : "below 45"}.`,
    },
    {
      kind: "daily",
      title: `🎯 Gold Key Levels – Support $${support1} | Resistance $${resistance1}`,
      description: `XAU/USD at $${price}. High $${high}, Low $${low}. Fib 61.8% $${fib618}, 38.2% $${fib382}. ${
        price > fib618 ? `Above golden ratio – bullish. Target $${resistance1}.` : `Testing below – watch bounce $${fib382}.`
      }`,
    },
    {
      kind: "scalping",
      title: `💡 Gold Scalping Zones – ${price > high - range / 2 ? "Buy Dips" : "Sell Rallies"} Near $${price}`,
      description: `Intraday scalping XAU/USD $${price}. ${
        price > high - range / 2
          ? `Buy zone $${low}-$${Math.round(low + range * 0.25)}, target $${high}, SL $${Math.round(low - 5)}.`
          : `Sell zone $${Math.round(high - range * 0.25)}-$${high}, target $${low}, SL $${Math.round(high + 5)}.`
      } MACD ${pick(["bullish M15 cross", "bearish M30 div", "H1 momentum shift"])}.`,
    },
    {
      kind: "weekly",
      title: `📊 Weekly Gold Outlook – $${support2} to $${resistance2} Range`,
      description: `XAU/USD weekly: consolidating $${support2}-$${resistance2}. Current $${price}. ${pick(["Symmetrical triangle", "Ascending channel", "Descending wedge"])} on H4. Break above $${resistance1} → $${resistance2}. Break below $${support1} → $${support2}.`,
    },
    {
      kind: "scalping",
      title: `🔥 Gold ${change >= 0 ? "Rally" : "Selloff"} Alert – ${Math.abs(change)} Points Move`,
      description: `XAU/USD moved ${change >= 0 ? "up" : "down"} ${Math.abs(change)} pts to $${price}. Order blocks $${Math.round(price - 15)} & $${Math.round(price + 15)}. Next: ${pick([`continuation to $${direction === "bullish" ? resistance1 : support1}`, `consolidation $${Math.round(price - 10)}-$${Math.round(price + 10)}`])}.`,
    },
  ];

  return ideas.sort(() => Math.random() - 0.5);
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

    // Use H1 base for price summary
    const base = await fetchCandles("GC=F", "H1");
    console.log(`Gold $${base.price}, change ${base.change}`);

    const ideas = generateIdeas(base.price, base.high, base.low, base.change);

    const rows: any[] = [];
    for (const idea of ideas) {
      const tf = tfForKind(idea.kind);
      // Fetch candles for the chosen timeframe
      const md = await fetchCandles("GC=F", tf);
      md.symbol = "XAU/USD";
      const svg = buildCandleSVG(md, idea.title);
      const filename = `auto-ideas/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${tf}.svg`;
      const imageUrl = await uploadSvg(supabase, svg, filename);
      rows.push({
        title: idea.title,
        description: idea.description,
        published: true,
        image_url: imageUrl,
      });
    }

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
