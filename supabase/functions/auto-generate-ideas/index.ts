import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type Analysis = {
  action: "BUY" | "SELL";
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;
  fvg: {
    type: "bullish" | "bearish";
    low: number;
    high: number;
  } | null;
  bos: "Bullish BOS" | "Bearish BOS" | "No clear BOS";
  trend: "Bullish" | "Bearish" | "Range";
  trendline: "Rising" | "Falling" | "Flat";
  orderBlock: "Bullish OB" | "Bearish OB" | "None";
};

type PairCfg = {
  pair: string;
  yahoo: string;
  decimals: number;
  category: "commodity" | "other";
};

const PAIRS: PairCfg[] = [
  {
    pair: "XAU/USD (Gold)",
    yahoo: "GC=F",
    decimals: 2,
    category: "commodity",
  },
  {
    pair: "XAG/USD (Silver)",
    yahoo: "SI=F",
    decimals: 2,
    category: "commodity",
  },
  {
    pair: "EUR/USD",
    yahoo: "EURUSD=X",
    decimals: 5,
    category: "other",
  },
  {
    pair: "GBP/USD",
    yahoo: "GBPUSD=X",
    decimals: 5,
    category: "other",
  },
  {
    pair: "USD/JPY",
    yahoo: "JPY=X",
    decimals: 3,
    category: "other",
  },
  {
    pair: "AUD/USD",
    yahoo: "AUDUSD=X",
    decimals: 5,
    category: "other",
  },
  {
    pair: "USD/CAD",
    yahoo: "CAD=X",
    decimals: 5,
    category: "other",
  },
  {
    pair: "USD/CHF",
    yahoo: "CHF=X",
    decimals: 5,
    category: "other",
  },
  {
    pair: "BTC/USD",
    yahoo: "BTC-USD",
    decimals: 2,
    category: "other",
  },
  {
    pair: "ETH/USD",
    yahoo: "ETH-USD",
    decimals: 2,
    category: "other",
  },
];

const COMMODITY_WEIGHTED = [
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",
  "XAG/USD (Silver)",
];

const OTHER_PAIRS = PAIRS
  .filter((p) => p.category === "other")
  .map((p) => p.pair);

const SLOT_MINUTES = 30;

function pickScheduledPair(now: Date): PairCfg {
  const minutesSinceMidnight =
    now.getUTCHours() * 60 + now.getUTCMinutes();

  const slot = Math.floor(
    minutesSinceMidnight / SLOT_MINUTES
  );

  const isCommoditySlot = slot % 2 === 0;

  if (isCommoditySlot) {
    const name =
      COMMODITY_WEIGHTED[
        Math.floor(slot / 2) %
          COMMODITY_WEIGHTED.length
      ];

    return PAIRS.find(
      (p) => p.pair === name
    )!;
  }

  const name =
    OTHER_PAIRS[
      Math.floor(slot / 2) %
        OTHER_PAIRS.length
    ];

  return PAIRS.find(
    (p) => p.pair === name
  )!;
}

const TF_MAP: Record<
  string,
  { interval: string; range: string }
> = {
  H1: {
    interval: "60m",
    range: "5d",
  },
  H4: {
    interval: "60m",
    range: "1mo",
  },
};

function roundPrice(
  n: number,
  decimals: number
) {
  return Number(n.toFixed(decimals));
}

/* =========================================================
   FETCH YAHOO CANDLES
========================================================= */

async function fetchCandles(
  symbol: string,
  tf = "H1"
): Promise<Candle[]> {
  const cfg =
    TF_MAP[tf] || TF_MAP.H1;

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?interval=${cfg.interval}&range=${cfg.range}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!res.ok) {
      console.error(
        "Yahoo response failed:",
        res.status
      );
      return [];
    }

    const data = await res.json();

    const result =
      data.chart?.result?.[0];

    const ts: number[] =
      result?.timestamp || [];

    const q =
      result?.indicators?.quote?.[0];

    const candles: Candle[] = [];

    for (let i = 0; i < ts.length; i++) {
      const o = q?.open?.[i];
      const h = q?.high?.[i];
      const l = q?.low?.[i];
      const c = q?.close?.[i];

      if (
        [o, h, l, c].every((v) =>
          Number.isFinite(v)
        )
      ) {
        candles.push({
          t: ts[i],
          o,
          h,
          l,
          c,
        });
      }
    }

    return candles.slice(-50);
  } catch (e) {
    console.error(
      "Candle fetch failed:",
      symbol,
      e
    );

    return [];
  }
}

/* =========================================================
   FETCH LIVE MT5 PRICES
========================================================= */

async function fetchMt5Prices(
  pairs: string[],
  supabaseUrl: string,
  serviceRoleKey: string
): Promise<Record<string, number>> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/fetch-live-prices?pairs=${encodeURIComponent(
        pairs.join(",")
      )}`,
      {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "MT5 price HTTP error:",
        response.status
      );

      return {};
    }

    const json = await response.json();

    const raw =
      json?.prices || {};

    const out: Record<
      string,
      number
    > = {};

    for (const pair of pairs) {
      const n = Number(
        raw[pair]
      );

      if (
        Number.isFinite(n) &&
        n > 0
      ) {
        out[pair] = n;
      }
    }

    return out;
  } catch (e) {
    console.error(
      "MT5 price fetch failed:",
      e
    );

    return {};
  }
}

/* =========================================================
   SWINGS
========================================================= */

function findSwingHigh(
  c: Candle[],
  i: number,
  w = 2
) {
  if (
    i < w ||
    i + w >= c.length
  ) {
    return false;
  }

  for (
    let j = 1;
    j <= w;
    j++
  ) {
    if (
      c[i].h <= c[i - j].h ||
      c[i].h <= c[i + j].h
    ) {
      return false;
    }
  }

  return true;
}

function findSwingLow(
  c: Candle[],
  i: number,
  w = 2
) {
  if (
    i < w ||
    i + w >= c.length
  ) {
    return false;
  }

  for (
    let j = 1;
    j <= w;
    j++
  ) {
    if (
      c[i].l >= c[i - j].l ||
      c[i].l >= c[i + j].l
    ) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   SMC / FVG / TREND ANALYSIS
========================================================= */

function analyze(
  candles: Candle[],
  livePrice: number,
  decimals: number
): Analysis {
  const c =
    candles.slice(-40);

  const recent =
    c.slice(-20);

  const closes =
    recent.map(
      (x) => x.c
    );

  const first =
    closes[0] ||
    livePrice;

  const last =
    livePrice ||
    closes[closes.length - 1] ||
    first;

  const pct =
    first
      ? ((last - first) /
          first) *
        100
      : 0;

  const trend: Analysis["trend"] =
    pct > 0.1
      ? "Bullish"
      : pct < -0.1
      ? "Bearish"
      : "Range";

  const highs: {
    i: number;
    p: number;
  }[] = [];

  const lows: {
    i: number;
    p: number;
  }[] = [];

  for (
    let i = 2;
    i < c.length - 2;
    i++
  ) {
    if (
      findSwingHigh(c, i)
    ) {
      highs.push({
        i,
        p: c[i].h,
      });
    }

    if (
      findSwingLow(c, i)
    ) {
      lows.push({
        i,
        p: c[i].l,
      });
    }
  }

  const lastHigh =
    highs[highs.length - 1];

  const prevHigh =
    highs[highs.length - 2];

  const lastLow =
    lows[lows.length - 1];

  const prevLow =
    lows[lows.length - 2];

  let bos: Analysis["bos"] =
    "No clear BOS";

  if (
    lastHigh &&
    last > lastHigh.p
  ) {
    bos = "Bullish BOS";
  } else if (
    lastLow &&
    last < lastLow.p
  ) {
    bos = "Bearish BOS";
  }

  let trendline:
    Analysis["trendline"] =
    "Flat";

  if (
    lastLow &&
    prevLow
  ) {
    trendline =
      lastLow.p >
      prevLow.p
        ? "Rising"
        : lastLow.p <
          prevLow.p
        ? "Falling"
        : "Flat";
  }

  /* =======================================================
     FVG
  ======================================================= */

  let fvg:
    Analysis["fvg"] =
    null;

  for (
    let i =
      c.length - 1;
    i >= 2 && !fvg;
    i--
  ) {
    const a =
      c[i - 2];

    const d =
      c[i];

    if (
      a.h < d.l
    ) {
      fvg = {
        type: "bullish",
        low: a.h,
        high: d.l,
      };
    } else if (
      a.l > d.h
    ) {
      fvg = {
        type: "bearish",
        low: d.h,
        high: a.l,
      };
    }
  }

  /* =======================================================
     ORDER BLOCK
  ======================================================= */

  let orderBlock:
    Analysis["orderBlock"] =
    "None";

  if (
    bos ===
    "Bullish BOS"
  ) {
    orderBlock =
      "Bullish OB";
  }

  if (
    bos ===
    "Bearish BOS"
  ) {
    orderBlock =
      "Bearish OB";
  }

  /* =======================================================
     DIRECTION
  ======================================================= */

  let action:
    Analysis["action"] =
    "BUY";

  if (
    bos ===
      "Bearish BOS" ||
    (
      trend ===
        "Bearish" &&
      fvg?.type !==
        "bullish"
    )
  ) {
    action = "SELL";
  } else if (
    bos ===
      "Bullish BOS" ||
    trend ===
      "Bullish" ||
    fvg?.type ===
      "bullish"
  ) {
    action = "BUY";
  }

  /* =======================================================
     TP / SL
  ======================================================= */

  const recentRange =
    Math.max(
      ...recent.map(
        (x) => x.h
      )
    ) -
    Math.min(
      ...recent.map(
        (x) => x.l
      )
    );

  const risk =
    Math.max(
      recentRange * 0.18,
      Math.abs(last) *
        0.002
    );

  const entry =
    last;

  const tp1 =
    action === "BUY"
      ? last + risk * 1.5
      : last - risk * 1.5;

  const tp2 =
    action === "BUY"
      ? last + risk * 2.8
      : last - risk * 2.8;

  const sl =
    action === "BUY"
      ? last - risk
      : last + risk;

  return {
    action,

    entry: roundPrice(
      entry,
      decimals
    ),

    tp1: roundPrice(
      tp1,
      decimals
    ),

    tp2: roundPrice(
      tp2,
      decimals
    ),

    sl: roundPrice(
      sl,
      decimals
    ),

    fvg,
    bos,
    trend,
    trendline,
    orderBlock,
  };
}

/* =========================================================
   SAFE TEXT
========================================================= */

function safeText(
  s: string
) {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;",
      }[ch]!)
  );
}

/* =========================================================
   CHART SVG
========================================================= */

function buildChartSVG(
  md: {
    candles: Candle[];
    symbol: string;
    timeframe: string;
    price: number;
  },
  plan: Analysis,
  title: string,
  decimals: number
): string {
  const W = 1000;
  const H = 650;

  const padL = 20;
  const padR = 150;
  const padT = 90;
  const padB = 40;

  const innerW =
    W - padL - padR;

  const innerH =
    H - padT - padB;

  const candles =
    md.candles.slice(-45);

  const candleHighs =
    candles.map(
      (x) => x.h
    );

  const candleLows =
    candles.map(
      (x) => x.l
    );

  const candleMax =
    Math.max(
      ...candleHighs
    );

  const candleMin =
    Math.min(
      ...candleLows
    );

  const candleRange =
    Math.max(
      candleMax -
        candleMin,
      0.0001
    );

  const levelDefs: {
    key:
      | "entry"
      | "tp1"
      | "tp2"
      | "sl";

    price: number;
    color: string;
    label: string;
  }[] = [
    {
      key: "entry",
      price: plan.entry,
      color: "#3b82f6",
      label: "ENTRY",
    },
    {
      key: "tp1",
      price: plan.tp1,
      color: "#22c55e",
      label: "TP1",
    },
    {
      key: "tp2",
      price: plan.tp2,
      color: "#16a34a",
      label: "TP2",
    },
    {
      key: "sl",
      price: plan.sl,
      color: "#ef4444",
      label: "SL",
    },
  ];

  const maxExtension =
    candleRange * 1.5;

  const inRangeLevelPrices =
    levelDefs
      .map(
        (l) => l.price
      )
      .filter(
        (p) =>
          p <=
            candleMax +
              maxExtension &&
          p >=
            candleMin -
              maxExtension
      );

  const allPrices = [
    ...candleHighs,
    ...candleLows,
    ...inRangeLevelPrices,
  ];

  const maxP =
    Math.max(
      ...allPrices
    );

  const minP =
    Math.min(
      ...allPrices
    );

  const range =
    Math.max(
      maxP - minP,
      0.0001
    );

  const yMax =
    maxP + range * 0.08;

  const yMin =
    minP - range * 0.08;

  const yRange =
    Math.max(
      yMax - yMin,
      0.0001
    );

  const slot =
    innerW /
    Math.max(
      candles.length,
      1
    );

  const candleW =
    Math.max(
      6,
      slot * 0.65
    );

  const y = (
    p: number
  ) =>
    padT +
    ((yMax - p) /
      yRange) *
      innerH;

  const clampY = (
    yy: number
  ) =>
    Math.min(
      Math.max(
        yy,
        padT
      ),
      H - padB
    );

  /* =======================================================
     GRID
  ======================================================= */

  let grid = "";
  let gridLabels = "";

  for (
    let i = 0;
    i <= 6;
    i++
  ) {
    const yy =
      padT +
      (innerH * i) /
        6;

    const p =
      yMax -
      (yRange * i) /
        6;

    grid +=
      `<line x1="${padL}" y1="${yy}" x2="${
        W - padR
      }" y2="${yy}" stroke="#1e293b" stroke-width="1" stroke-dasharray="2 4"/>`;

    gridLabels +=
      `<text x="${
        W - padR + 10
      }" y="${yy + 4}" fill="#64748b" font-size="11" font-family="monospace">${p.toFixed(
        decimals
      )}</text>`;
  }

  /* =======================================================
     CANDLES
  ======================================================= */

  let body = "";

  candles.forEach(
    (c, i) => {
      const x =
        padL +
        i * slot +
        (slot -
          candleW) /
          2;

      const xm =
        x +
        candleW / 2;

      const isBull =
        c.c >= c.o;

      const color =
        isBull
          ? "#22c55e"
          : "#ef4444";

      const topY =
        y(
          Math.max(
            c.o,
            c.c
          )
        );

      const botY =
        y(
          Math.min(
            c.o,
            c.c
          )
        );

      const hY =
        y(c.h);

      const lY =
        y(c.l);

      body +=
        `<line x1="${xm}" y1="${hY}" x2="${xm}" y2="${lY}" stroke="${color}" stroke-width="1.5"/>`;

      body +=
        `<rect x="${x}" y="${topY}" width="${candleW}" height="${Math.max(
          2,
          botY - topY
        )}" fill="${color}" rx="1"/>`;
    }
  );

  /* =======================================================
     LEVEL LABELS
  ======================================================= */

  const LABEL_H = 22;
  const MIN_LABEL_GAP = 26;

  type LevelPos = {
    key: string;
    price: number;
    color: string;
    label: string;
    lineY: number;
    labelY: number;
  };

  const positioned: LevelPos[] =
    levelDefs.map(
      (l) => {
        const rawY =
          y(l.price);

        const lineY =
          clampY(rawY);

        return {
          key: l.key,
          price: l.price,
          color: l.color,
          label: l.label,
          lineY,
          labelY: lineY,
        };
      }
    );

  positioned.sort(
    (a, b) =>
      a.labelY -
      b.labelY
  );

  for (
    let i = 1;
    i < positioned.length;
    i++
  ) {
    if (
      positioned[i].labelY -
        positioned[
          i - 1
        ].labelY <
      MIN_LABEL_GAP
    ) {
      positioned[i].labelY =
        positioned[
          i - 1
        ].labelY +
        MIN_LABEL_GAP;
    }
  }

  const overshoot =
    positioned[
      positioned.length - 1
    ].labelY -
    (H -
      padB -
      LABEL_H / 2);

  if (
    overshoot > 0
  ) {
    for (
      const p of positioned
    ) {
      p.labelY -=
        overshoot;
    }
  }

  let levelsSvg = "";

  for (
    const p of positioned
  ) {
    levelsSvg +=
      `<line x1="${padL}" y1="${p.lineY}" x2="${
        W - padR
      }" y2="${p.lineY}" stroke="${p.color}" stroke-width="2" stroke-dasharray="5 3"/>`;

    if (
      Math.abs(
        p.labelY -
          p.lineY
      ) > 3
    ) {
      levelsSvg +=
        `<line x1="${W - padR}" y1="${p.lineY}" x2="${
          W - padR + 8
        }" y2="${p.labelY}" stroke="${p.color}" stroke-width="1.5"/>`;
    }

    levelsSvg +=
      `<rect x="${W - padR}" y="${
        p.labelY - 11
      }" width="140" height="22" rx="4" fill="${p.color}"/>`;

    levelsSvg +=
      `<text x="${W - padR + 8}" y="${
        p.labelY + 4
      }" fill="#ffffff" font-size="11" font-weight="bold" font-family="Arial">${
        p.label
      }: ${p.price.toFixed(
        decimals
      )}</text>`;
  }

  const actionBg =
    plan.action === "BUY"
      ? "#16a34a"
      : "#dc2626";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="100%" height="100%" fill="#0b0f19"/>

  <text x="${padL}" y="35" fill="#ffffff" font-size="22" font-weight="800" font-family="Arial">${safeText(
    md.symbol
  )} (${md.timeframe})</text>

  <rect x="${
    W - padR - 110
  }" y="15" width="110" height="30" rx="6" fill="${actionBg}"/>

  <text x="${
    W - padR - 55
  }" y="35" fill="#ffffff" font-size="14" font-weight="bold" text-anchor="middle" font-family="Arial">${plan.action}</text>

  <text x="${padL}" y="60" fill="#94a3b8" font-size="12" font-family="Arial">Live: ${md.price.toFixed(
    decimals
  )} | SMC: ${plan.bos} | Trend: ${plan.trend}</text>

  ${grid}
  ${body}
  ${levelsSvg}
  ${gridLabels}

  <rect x="0" y="${
    H - 30
  }" width="${W}" height="30" fill="#030712"/>

  <text x="${padL}" y="${
    H - 10
  }" fill="#64748b" font-size="11" font-family="Arial">Live Market Signal • Auto Generated Analysis</text>

  </svg>`;
}

/* =========================================================
   IDEA DESCRIPTION
========================================================= */

function buildDescription(
  pair: string,
  p: Analysis
): string {
  const fvgText =
    p.fvg
      ? `${p.fvg.type} FVG (${p.fvg.low} - ${p.fvg.high})`
      : "No clear FVG";

  return [
    `📊 ${pair} • ${p.action}`,
    `💰 Entry: ${p.entry}`,
    `🎯 TP1: ${p.tp1}  |  TP2: ${p.tp2}`,
    `🛑 SL: ${p.sl}`,
    ``,
    `🧠 Chart Analysis`,
    `• Trend: ${p.trend}`,
    `• Structure: ${p.bos}`,
    `• Trendline: ${p.trendline}`,
    `• FVG: ${fvgText}`,
    `• Order Block: ${p.orderBlock}`,
    ``,
    `⚠️ Risk Disclaimer: Manage your risk accordingly.`,
  ].join("\n");
}

/* =========================================================
   UPLOAD CHART
========================================================= */

async function uploadSvg(
  supabase: any,
  svg: string,
  filename: string
): Promise<string | null> {
  try {
    const bytes =
      new TextEncoder().encode(
        svg
      );

    const {
      error,
    } = await supabase.storage
      .from("chart-images")
      .upload(
        filename,
        bytes,
        {
          contentType:
            "image/svg+xml",
          upsert: true,
        }
      );

    if (error) {
      console.error(
        "Chart upload error:",
        error
      );

      return null;
    }

    return supabase.storage
      .from("chart-images")
      .getPublicUrl(
        filename
      )
      .data.publicUrl;
  } catch (e) {
    console.error(
      "Chart upload exception:",
      e
    );

    return null;
  }
}

/* =========================================================
   TELEGRAM AUTO POST
   ---------------------------------------------------------
   IMPORTANT:
   This is the part missing from your old file.
========================================================= */

async function sendIdeaToTelegram(
  supabaseUrl: string,
  serviceRoleKey: string,
  idea: any
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const telegramFunctionUrl =
      `${supabaseUrl}/functions/v1/telegram-signal-post`;

    const payload = {
      action: "new_idea",

      idea: {
        id: idea.id,

        title:
          idea.title || "",

        description:
          idea.description || "",

        image_url:
          idea.image_url || null,

        category:
          idea.category ||
          idea.main_category ||
          "Market Ideas",

        main_category:
          idea.main_category ||
          idea.category ||
          "Market Ideas",

        pair:
          idea.pair || "",

        symbol:
          idea.symbol || "",

        type:
          idea.type || "",

        direction:
          idea.direction || "",

        entry:
          idea.entry || "",

        tp:
          idea.tp || "",

        tp1:
          idea.tp1 || "",

        tp2:
          idea.tp2 || "",

        sl:
          idea.sl || "",

        analysis:
          idea.analysis || "",

        analysis_reason:
          idea.analysis_reason ||
          "",

        timeframe:
          idea.timeframe ||
          "H1",

        risk_level:
          idea.risk_level ||
          "",
      },
    };

    console.log(
      "Sending auto idea to Telegram:",
      JSON.stringify(
        payload
      )
    );

    const response =
      await fetch(
        telegramFunctionUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${serviceRoleKey}`,

            apikey:
              serviceRoleKey,
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const result =
      await response.json();

    console.log(
      "Telegram auto idea response:",
      JSON.stringify(
        result
      )
    );

    if (
      response.ok &&
      result?.success === true
    ) {
      return {
        success: true,
      };
    }

    return {
      success: false,
      error:
        result?.error ||
        result?.message ||
        `Telegram function HTTP ${response.status}`,
    };
  } catch (error) {
    console.error(
      "Telegram auto idea exception:",
      error
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}

/* =========================================================
   MAIN
========================================================= */

Deno.serve(
  async (req) => {
    if (
      req.method ===
      "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            corsHeaders,
        }
      );
    }

    try {
      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL"
        );

      const serviceRoleKey =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY"
        );

      if (
        !supabaseUrl ||
        !serviceRoleKey
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Supabase environment variables are missing",
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      const supabase =
        createClient(
          supabaseUrl,
          serviceRoleKey
        );

      const url =
        new URL(req.url);

      const requestedPair =
        url.searchParams.get(
          "pair"
        );

      const cfg =
        PAIRS.find(
          (x) =>
            x.pair ===
            requestedPair
        ) ||
        pickScheduledPair(
          new Date()
        );

      console.log(
        "Selected pair:",
        cfg.pair
      );

      /* =====================================================
         LIVE MT5 PRICE
      ===================================================== */

      const prices =
        await fetchMt5Prices(
          PAIRS.map(
            (x) => x.pair
          ),
          supabaseUrl,
          serviceRoleKey
        );

      const livePrice =
        prices[cfg.pair];

      if (!livePrice) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              `No live MT5 price for ${cfg.pair}`,
          }),
          {
            status: 503,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      /* =====================================================
         CANDLES
      ===================================================== */

      const candles =
        await fetchCandles(
          cfg.yahoo,
          "H1"
        );

      if (
        candles.length <
        12
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error:
              "Not enough chart candles",
          }),
          {
            status: 503,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "application/json",
            },
          }
        );
      }

      /* =====================================================
         USE LIVE PRICE IN LAST CANDLE
      ===================================================== */

      const last =
        candles[
          candles.length - 1
        ];

      candles[
        candles.length - 1
      ] = {
        ...last,
        c: livePrice,
        h: Math.max(
          last.h,
          livePrice
        ),
        l: Math.min(
          last.l,
          livePrice
        ),
      };

      /* =====================================================
         ANALYSIS
      ===================================================== */

      const analysis =
        analyze(
          candles,
          livePrice,
          cfg.decimals
        );

      console.log(
        "Analysis:",
        JSON.stringify(
          analysis
        )
      );

      /* =====================================================
         CHART
      ===================================================== */

      const svg =
        buildChartSVG(
          {
            candles,
            symbol:
              cfg.pair,
            timeframe:
              "H1",
            price:
              livePrice,
          },
          analysis,
          `${analysis.action} Analysis`,
          cfg.decimals
        );

      const filename =
        `auto-ideas/${Date.now()}-${cfg.pair.replace(
          /[^A-Za-z0-9]/g,
          "_"
        )}.svg`;

      const imageUrl =
        await uploadSvg(
          supabase,
          svg,
          filename
        );

      console.log(
        "Chart URL:",
        imageUrl
      );

      /* =====================================================
         CATEGORY
      ===================================================== */

      const category =
        cfg.category ===
        "commodity"
          ? "Commodities"
          : "Forex & Crypto";

      /* =====================================================
         BUILD IDEA
      ===================================================== */

      const title =
        `${analysis.action === "BUY" ? "🟢" : "🔴"} ${analysis.action} ${cfg.pair} @ ${analysis.entry}`;

      const description =
        buildDescription(
          cfg.pair,
          analysis
        );

      /*
       * Extra fields are included in the row.
       * If your table doesn't have these optional columns,
       * the fallback below will insert the basic fields.
       */

      const fullRow = {
        title,
        description,
        published: true,
        image_url:
          imageUrl,

        category,

        main_category:
          category,

        pair:
          cfg.pair,

        symbol:
          cfg.pair,

        type:
          analysis.action,

        direction:
          analysis.action,

        entry:
          String(
            analysis.entry
          ),

        tp1:
          String(
            analysis.tp1
          ),

        tp2:
          String(
            analysis.tp2
          ),

        sl:
          String(
            analysis.sl
          ),

        timeframe:
          "H1",

        analysis:
          description,

        analysis_reason:
          description,

        risk_level:
          "Medium",
      };

      /* =====================================================
         INSERT INTO MARKET IDEAS
      ===================================================== */

      let data: any = null;

      let error: any = null;

      /*
       * First try full row.
       */
      const insertResult =
        await supabase
          .from(
            "market_ideas"
          )
          .insert(
            fullRow
          )
          .select(
            "*"
          )
          .single();

      data =
        insertResult.data;

      error =
        insertResult.error;

      /*
       * If the database doesn't contain the newer optional
       * columns, fall back to the original safe schema.
       */
      if (
        error
      ) {
        console.error(
          "Full idea insert failed:",
          error
        );

        const basicRow = {
          title,
          description,
          published: true,
          image_url:
            imageUrl,
        };

        const fallback =
          await supabase
            .from(
              "market_ideas"
            )
            .insert(
              basicRow
            )
            .select(
              "*"
            )
            .single();

        data =
          fallback.data;

        error =
          fallback.error;

        if (error) {
          throw error;
        }
      }

      console.log(
        "Idea saved:",
        JSON.stringify(
          data
        )
      );

      /* =====================================================
         TELEGRAM AUTO POST
         -----------------------------------------------------
         IMPORTANT:
         Telegram is called AFTER database save so the
         dashboard idea definitely exists.
      ===================================================== */

      const telegramIdea = {
        ...(data || {}),

        id:
          data?.id,

        title,

        description,

        image_url:
          imageUrl,

        category,

        main_category:
          category,

        pair:
          cfg.pair,

        symbol:
          cfg.pair,

        type:
          analysis.action,

        direction:
          analysis.action,

        entry:
          String(
            analysis.entry
          ),

        tp1:
          String(
            analysis.tp1
          ),

        tp2:
          String(
            analysis.tp2
          ),

        sl:
          String(
            analysis.sl
          ),

        timeframe:
          "H1",

        analysis:
          description,

        analysis_reason:
          description,

        risk_level:
          "Medium",
      };

      const telegramResult =
        await sendIdeaToTelegram(
          supabaseUrl,
          serviceRoleKey,
          telegramIdea
        );

      /* =====================================================
         FINAL RESPONSE
      ===================================================== */

      return new Response(
        JSON.stringify({
          success: true,

          pair:
            cfg.pair,

          category,

          live_price:
            livePrice,

          analysis,

          idea: data,

          telegram: {
            sent:
              telegramResult.success,

            error:
              telegramResult.error ||
              null,
          },
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    } catch (error) {
      console.error(
        "Auto ideas error:",
        error
      );

      return new Response(
        JSON.stringify({
          success: false,

          error:
            error instanceof Error
              ? error.message
              : String(error),
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type":
              "application/json",
          },
        }
      );
    }
  }
);
