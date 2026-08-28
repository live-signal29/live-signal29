import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Candle = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
};

type FVG = {
  type: "bullish" | "bearish";
  low: number;
  high: number;
};

type Analysis = {
  action: "BUY" | "SELL";
  entry: number;
  tp1: number;
  tp2: number;
  sl: number;

  support: number | null;
  resistance: number | null;

  fvg: FVG | null;

  bos: "Bullish BOS" | "Bearish BOS" | "No clear BOS";
  trend: "Bullish" | "Bearish" | "Range";
  trendline: "Rising" | "Falling" | "Flat";
  orderBlock: "Bullish OB" | "Bearish OB" | "None";

  ideaText: string;
};

type PairCfg = {
  pair: string;
  yahoo: string;
  decimals: number;
  category: "commodity" | "forex" | "crypto";
};

/* =========================================================
   PAIRS
========================================================= */

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
    category: "forex",
  },
  {
    pair: "GBP/USD",
    yahoo: "GBPUSD=X",
    decimals: 5,
    category: "forex",
  },
  {
    pair: "USD/JPY",
    yahoo: "JPY=X",
    decimals: 3,
    category: "forex",
  },
  {
    pair: "AUD/USD",
    yahoo: "AUDUSD=X",
    decimals: 5,
    category: "forex",
  },
  {
    pair: "USD/CAD",
    yahoo: "CAD=X",
    decimals: 5,
    category: "forex",
  },
  {
    pair: "USD/CHF",
    yahoo: "CHF=X",
    decimals: 5,
    category: "forex",
  },
  {
    pair: "BTC/USD",
    yahoo: "BTC-USD",
    decimals: 2,
    category: "crypto",
  },
  {
    pair: "ETH/USD",
    yahoo: "ETH-USD",
    decimals: 2,
    category: "crypto",
  },
];

/* =========================================================
   HOURLY PAIR ROTATION
   ---------------------------------------------------------
   XAU gets the highest weight.

   10 slots:
   XAU x 6
   XAG x 1
   Other pairs x 3

   So XAU appears approximately 60% of the ideas.
========================================================= */

const HOURLY_WEIGHTED_PAIRS = [
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",
  "XAU/USD (Gold)",

  "XAG/USD (Silver)",

  "EUR/USD",
  "GBP/USD",
  "BTC/USD",
];

function pickScheduledPair(now: Date): PairCfg {
  const hourSlot =
    now.getUTCFullYear() * 1000000 +
    (now.getUTCMonth() + 1) * 10000 +
    now.getUTCDate() * 100 +
    now.getUTCHours();

  const index =
    Math.abs(hourSlot) % HOURLY_WEIGHTED_PAIRS.length;

  const pairName = HOURLY_WEIGHTED_PAIRS[index];

  return (
    PAIRS.find((p) => p.pair === pairName) ||
    PAIRS[0]
  );
}

/* =========================================================
   TIMEFRAME
========================================================= */

const TF_MAP: Record<
  string,
  { interval: string; range: string }
> = {
  H1: {
    interval: "60m",
    range: "5d",
  },
};

function roundPrice(
  n: number,
  decimals: number
): number {
  return Number(n.toFixed(decimals));
}

/* =========================================================
   FETCH CANDLES
========================================================= */

async function fetchCandles(
  symbol: string,
  tf = "H1"
): Promise<Candle[]> {
  const cfg = TF_MAP[tf] || TF_MAP.H1;

  try {
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/` +
      `${encodeURIComponent(symbol)}` +
      `?interval=${cfg.interval}&range=${cfg.range}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!res.ok) {
      console.error(
        "Yahoo candle request failed:",
        res.status
      );
      return [];
    }

    const data = await res.json();

    const result =
      data?.chart?.result?.[0];

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

    return candles.slice(-60);
  } catch (error) {
    console.error(
      "Candle fetch exception:",
      symbol,
      error
    );

    return [];
  }
}

/* =========================================================
   MT5 LIVE PRICES
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
          Authorization:
            `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "MT5 prices failed:",
        response.status
      );

      return {};
    }

    const json = await response.json();

    const raw = json?.prices || {};

    const out: Record<string, number> = {};

    for (const pair of pairs) {
      const n = Number(raw[pair]);

      if (
        Number.isFinite(n) &&
        n > 0
      ) {
        out[pair] = n;
      }
    }

    return out;
  } catch (error) {
    console.error(
      "MT5 price fetch exception:",
      error
    );

    return {};
  }
}

/* =========================================================
   SWING DETECTION
========================================================= */

function findSwingHigh(
  candles: Candle[],
  i: number,
  w = 2
): boolean {
  if (
    i < w ||
    i + w >= candles.length
  ) {
    return false;
  }

  for (let j = 1; j <= w; j++) {
    if (
      candles[i].h <= candles[i - j].h ||
      candles[i].h <= candles[i + j].h
    ) {
      return false;
    }
  }

  return true;
}

function findSwingLow(
  candles: Candle[],
  i: number,
  w = 2
): boolean {
  if (
    i < w ||
    i + w >= candles.length
  ) {
    return false;
  }

  for (let j = 1; j <= w; j++) {
    if (
      candles[i].l >= candles[i - j].l ||
      candles[i].l >= candles[i + j].l
    ) {
      return false;
    }
  }

  return true;
}

/* =========================================================
   HTML SAFE TEXT
========================================================= */

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/* =========================================================
   MARKET ANALYSIS
========================================================= */

function analyze(
  candles: Candle[],
  livePrice: number,
  decimals: number
): Analysis {
  const c = candles.slice(-45);

  const recent = c.slice(-20);

  const closes = recent.map(
    (x) => x.c
  );

  const first =
    closes[0] || livePrice;

  const last =
    livePrice ||
    closes[closes.length - 1] ||
    first;

  const pct =
    first !== 0
      ? ((last - first) / first) * 100
      : 0;

  const trend: Analysis["trend"] =
    pct > 0.15
      ? "Bullish"
      : pct < -0.15
      ? "Bearish"
      : "Range";

  /* -------------------------------------------------------
     SWINGS
  ------------------------------------------------------- */

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
    if (findSwingHigh(c, i)) {
      highs.push({
        i,
        p: c[i].h,
      });
    }

    if (findSwingLow(c, i)) {
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

  /* -------------------------------------------------------
     SUPPORT / RESISTANCE
  ------------------------------------------------------- */

  let support:
    number | null =
    lastLow?.p || null;

  let resistance:
    number | null =
    lastHigh?.p || null;

  if (!support) {
    support = Math.min(
      ...recent.map((x) => x.l)
    );
  }

  if (!resistance) {
    resistance = Math.max(
      ...recent.map((x) => x.h)
    );
  }

  /* -------------------------------------------------------
     BOS
  ------------------------------------------------------- */

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

  /* -------------------------------------------------------
     TRENDLINE
  ------------------------------------------------------- */

  let trendline:
    Analysis["trendline"] =
    "Flat";

  if (
    lastLow &&
    prevLow
  ) {
    if (
      lastLow.p >
      prevLow.p
    ) {
      trendline = "Rising";
    } else if (
      lastLow.p <
      prevLow.p
    ) {
      trendline = "Falling";
    }
  }

  /* -------------------------------------------------------
     FVG
  ------------------------------------------------------- */

  let fvg:
    Analysis["fvg"] = null;

  for (
    let i = c.length - 1;
    i >= 2 && !fvg;
    i--
  ) {
    const a = c[i - 2];
    const d = c[i];

    if (a.h < d.l) {
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

  /* -------------------------------------------------------
     ORDER BLOCK
  ------------------------------------------------------- */

  let orderBlock:
    Analysis["orderBlock"] =
    "None";

  if (
    bos === "Bullish BOS"
  ) {
    orderBlock =
      "Bullish OB";
  }

  if (
    bos === "Bearish BOS"
  ) {
    orderBlock =
      "Bearish OB";
  }

  /* -------------------------------------------------------
     ACTION
  ------------------------------------------------------- */

  let action:
    Analysis["action"] =
    "BUY";

  if (
    bos === "Bearish BOS" ||
    (
      trend === "Bearish" &&
      fvg?.type !== "bullish"
    )
  ) {
    action = "SELL";
  } else if (
    bos === "Bullish BOS" ||
    trend === "Bullish" ||
    fvg?.type === "bullish"
  ) {
    action = "BUY";
  }

  /* -------------------------------------------------------
     TARGET / RISK
  ------------------------------------------------------- */

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
      Math.abs(last) * 0.002
    );

  const entry = last;

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

  /* -------------------------------------------------------
     IDEA DESCRIPTION
     IMPORTANT:
     This is NOT a signal.
     It explains what the chart is suggesting.
  ------------------------------------------------------- */

  let ideaText = "";

  if (
    action === "BUY"
  ) {
    if (
      resistance &&
      last > resistance
    ) {
      ideaText =
        `Price has broken above the recent resistance. ` +
        `If the breakout holds, the pair may continue higher. ` +
        `The bullish structure and ${trendline.toLowerCase()} trendline support the upside idea.`;
    } else if (
      support &&
      Math.abs(last - support) <=
        recentRange * 0.35
    ) {
      ideaText =
        `Price is trading near the recent support zone. ` +
        `A bullish reaction from support could push price higher. ` +
        `The ${trendline.toLowerCase()} trendline and bullish structure add support to this idea.`;
    } else {
      ideaText =
        `The chart structure is currently leaning bullish. ` +
        `Price may continue higher if buyers defend the nearby support and break the next resistance.`;
    }
  } else {
    if (
      support &&
      last < support
    ) {
      ideaText =
        `Price has broken below the recent support. ` +
        `If the breakdown holds, the pair may continue lower. ` +
        `The bearish structure and ${trendline.toLowerCase()} trendline support the downside idea.`;
    } else if (
      resistance &&
      Math.abs(last - resistance) <=
        recentRange * 0.35
    ) {
      ideaText =
        `Price is approaching the recent resistance zone. ` +
        `A rejection from resistance could send price lower. ` +
        `The bearish structure increases the probability of downside movement.`;
    } else {
      ideaText =
        `The chart structure is currently leaning bearish. ` +
        `Price may move lower if sellers defend the nearby resistance and break the next support.`;
    }
  }

  if (fvg) {
    ideaText +=
      fvg.type === "bullish"
        ? ` A bullish FVG is also visible on the chart.`
        : ` A bearish FVG is also visible on the chart.`;
  }

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

    support: support
      ? roundPrice(
          support,
          decimals
        )
      : null,

    resistance: resistance
      ? roundPrice(
          resistance,
          decimals
        )
      : null,

    fvg,

    bos,

    trend,

    trendline,

    orderBlock,

    ideaText,
  };
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
  decimals: number
): string {
  const W = 1000;
  const H = 650;

  const padL = 20;
  const padR = 190;
  const padT = 90;
  const padB = 40;

  const innerW =
    W - padL - padR;

  const innerH =
    H - padT - padB;

  const candles =
    md.candles.slice(-45);

  const highs =
    candles.map(
      (x) => x.h
    );

  const lows =
    candles.map(
      (x) => x.l
    );

  const candleMax =
    Math.max(...highs);

  const candleMin =
    Math.min(...lows);

  const candleRange =
    Math.max(
      candleMax -
        candleMin,
      0.0001
    );

  /* -------------------------------------------------------
     CHART LEVELS
  ------------------------------------------------------- */

  const levelDefs = [
    {
      price: plan.entry,
      color: "#3b82f6",
      label: "LIVE",
    },
    {
      price: plan.tp1,
      color: "#22c55e",
      label: "TP1",
    },
    {
      price: plan.tp2,
      color: "#16a34a",
      label: "TP2",
    },
    {
      price: plan.sl,
      color: "#ef4444",
      label: "RISK",
    },
  ];

  const structureLevels = [
    ...(plan.support
      ? [
          {
            price: plan.support,
            color: "#f59e0b",
            label: "SUPPORT",
          },
        ]
      : []),

    ...(plan.resistance
      ? [
          {
            price: plan.resistance,
            color: "#a855f7",
            label: "RESISTANCE",
          },
        ]
      : []),
  ];

  const maxExtension =
    candleRange * 1.5;

  const validLevels = [
    ...levelDefs,
    ...structureLevels,
  ]
    .map(
      (x) => x.price
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
    ...highs,
    ...lows,
    ...validLevels,
  ];

  const maxP =
    Math.max(...allPrices);

  const minP =
    Math.min(...allPrices);

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
    price: number
  ) =>
    padT +
    ((yMax - price) /
      yRange) *
      innerH;

  const clampY = (
    value: number
  ) =>
    Math.min(
      Math.max(
        value,
        padT
      ),
      H - padB
    );

  /* -------------------------------------------------------
     GRID
  ------------------------------------------------------- */

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
      `<line x1="${padL}" y1="${yy}" ` +
      `x2="${W - padR}" y2="${yy}" ` +
      `stroke="#1e293b" stroke-width="1" ` +
      `stroke-dasharray="2 4"/>`;

    gridLabels +=
      `<text x="${W - padR + 10}" ` +
      `y="${yy + 4}" ` +
      `fill="#64748b" font-size="11" ` +
      `font-family="monospace">` +
      `${p.toFixed(decimals)}` +
      `</text>`;
  }

  /* -------------------------------------------------------
     CANDLESTICKS
  ------------------------------------------------------- */

  let body = "";

  candles.forEach(
    (c, i) => {
      const x =
        padL +
        i * slot +
        (slot - candleW) /
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

      const topY = y(
        Math.max(
          c.o,
          c.c
        )
      );

      const botY = y(
        Math.min(
          c.o,
          c.c
        )
      );

      const hY = y(
        c.h
      );

      const lY = y(
        c.l
      );

      body +=
        `<line x1="${xm}" y1="${hY}" ` +
        `x2="${xm}" y2="${lY}" ` +
        `stroke="${color}" ` +
        `stroke-width="1.5"/>`;

      body +=
        `<rect x="${x}" y="${topY}" ` +
        `width="${candleW}" ` +
        `height="${Math.max(
          2,
          botY - topY
        )}" ` +
        `fill="${color}" rx="1"/>`;
    }
  );

  /* -------------------------------------------------------
     FVG ZONE
  ------------------------------------------------------- */

  let fvgSvg = "";

  if (plan.fvg) {
    const top =
      y(
        Math.max(
          plan.fvg.low,
          plan.fvg.high
        )
      );

    const bottom =
      y(
        Math.min(
          plan.fvg.low,
          plan.fvg.high
        )
      );

    const fvgColor =
      plan.fvg.type ===
      "bullish"
        ? "#22c55e"
        : "#ef4444";

    fvgSvg =
      `<rect x="${padL}" ` +
      `y="${top}" ` +
      `width="${innerW}" ` +
      `height="${Math.max(
        2,
        bottom - top
      )}" ` +
      `fill="${fvgColor}" ` +
      `fill-opacity="0.10" ` +
      `stroke="${fvgColor}" ` +
      `stroke-opacity="0.45" ` +
      `stroke-dasharray="6 4"/>`;
  }

  /* -------------------------------------------------------
     PRICE LEVELS
  ------------------------------------------------------- */

  let levelsSvg = "";

  for (const level of levelDefs) {
    const lineY =
      clampY(
        y(level.price)
      );

    levelsSvg +=
      `<line x1="${padL}" ` +
      `y1="${lineY}" ` +
      `x2="${W - padR}" ` +
      `y2="${lineY}" ` +
      `stroke="${level.color}" ` +
      `stroke-width="2" ` +
      `stroke-dasharray="5 3"/>`;

    levelsSvg +=
      `<rect x="${W - padR}" ` +
      `y="${lineY - 11}" ` +
      `width="175" ` +
      `height="22" ` +
      `rx="4" ` +
      `fill="${level.color}"/>`;

    levelsSvg +=
      `<text x="${W - padR + 8}" ` +
      `y="${lineY + 4}" ` +
      `fill="#ffffff" ` +
      `font-size="11" ` +
      `font-weight="bold" ` +
      `font-family="Arial">` +
      `${level.label}: ` +
      `${level.price.toFixed(
        decimals
      )}` +
      `</text>`;
  }

  /* -------------------------------------------------------
     SUPPORT / RESISTANCE
  ------------------------------------------------------- */

  for (
    const level of structureLevels
  ) {
    const lineY =
      clampY(
        y(level.price)
      );

    levelsSvg +=
      `<line x1="${padL}" ` +
      `y1="${lineY}" ` +
      `x2="${W - padR}" ` +
      `y2="${lineY}" ` +
      `stroke="${level.color}" ` +
      `stroke-width="1.5" ` +
      `stroke-dasharray="8 5"/>`;

    levelsSvg +=
      `<rect x="${W - padR}" ` +
      `y="${lineY - 11}" ` +
      `width="175" ` +
      `height="22" ` +
      `rx="4" ` +
      `fill="${level.color}"/>`;

    levelsSvg +=
      `<text x="${W - padR + 8}" ` +
      `y="${lineY + 4}" ` +
      `fill="#ffffff" ` +
      `font-size="10" ` +
      `font-weight="bold" ` +
      `font-family="Arial">` +
      `${level.label}: ` +
      `${level.price.toFixed(
        decimals
      )}` +
      `</text>`;
  }

  /* -------------------------------------------------------
     ACTION
  ------------------------------------------------------- */

  const actionBg =
    plan.action === "BUY"
      ? "#16a34a"
      : "#dc2626";

  return `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${W}"
  height="${H}"
  viewBox="0 0 ${W} ${H}"
>
  <rect
    width="100%"
    height="100%"
    fill="#0b0f19"
  />

  <text
    x="${padL}"
    y="35"
    fill="#ffffff"
    font-size="22"
    font-weight="800"
    font-family="Arial"
  >
    ${safeText(
      md.symbol
    )} (${md.timeframe})
  </text>

  <rect
    x="${W - padR - 110}"
    y="15"
    width="110"
    height="30"
    rx="6"
    fill="${actionBg}"
  />

  <text
    x="${W - padR - 55}"
    y="35"
    fill="#ffffff"
    font-size="14"
    font-weight="bold"
    text-anchor="middle"
    font-family="Arial"
  >
    ${plan.action}
  </text>

  <text
    x="${padL}"
    y="60"
    fill="#94a3b8"
    font-size="12"
    font-family="Arial"
  >
    Live: ${md.price.toFixed(
      decimals
    )}
    | BOS: ${safeText(
      plan.bos
    )}
    | Trend: ${safeText(
      plan.trend
    )}
    | OB: ${safeText(
      plan.orderBlock
    )}
  </text>

  ${grid}

  ${fvgSvg}

  ${body}

  ${levelsSvg}

  ${gridLabels}

  <rect
    x="0"
    y="${H - 30}"
    width="${W}"
    height="30"
    fill="#030712"
  />

  <text
    x="${padL}"
    y="${H - 10}"
    fill="#64748b"
    font-size="11"
    font-family="Arial"
  >
    Live Market Idea • FVG • SMC • BOS • Trendline
  </text>
</svg>
`;
}

/* =========================================================
   DASHBOARD IDEA DESCRIPTION
========================================================= */

function buildDescription(
  pair: string,
  p: Analysis,
  decimals: number
): string {
  const supportText =
    p.support !== null
      ? p.support.toFixed(decimals)
      : "N/A";

  const resistanceText =
    p.resistance !== null
      ? p.resistance.toFixed(
          decimals
        )
      : "N/A";

  const fvgText =
    p.fvg
      ? p.fvg.type ===
        "bullish"
        ? "Bullish FVG"
        : "Bearish FVG"
      : "No clear FVG";

  return [
    `💡 ${pair} — Market Idea`,
    ``,
    p.ideaText,
    ``,
    `📌 Support: ${supportText}`,
    `📌 Resistance: ${resistanceText}`,
    `🧠 Trend: ${p.trend}`,
    `📐 Trendline: ${p.trendline}`,
    `📊 Structure: ${p.bos}`,
    `🏦 Order Block: ${p.orderBlock}`,
    `🧩 FVG: ${fvgText}`,
    ``,
    `⚠️ This is a market idea based on current chart structure, not a guaranteed trade.`,
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
      new TextEncoder().encode(svg);

    const { error } =
      await supabase.storage
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

    const publicUrl =
      supabase.storage
        .from("chart-images")
        .getPublicUrl(
          filename
        )
        .data.publicUrl;

    return publicUrl;
  } catch (error) {
    console.error(
      "Chart upload exception:",
      error
    );

    return null;
  }
}

/* =========================================================
   TELEGRAM AUTO IDEA POST
   ---------------------------------------------------------
   IMPORTANT:
   This calls the EXISTING telegram-signal-post function
   ONLY with action = new_idea.

   Existing new_signal/update actions remain untouched.
========================================================= */

async function postIdeaToTelegram(
  supabaseUrl: string,
  serviceRoleKey: string,
  idea: {
    title: string;
    description: string;
    image_url: string | null;
  }
): Promise<boolean> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/telegram-signal-post`,
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
        body: JSON.stringify({
          action: "new_idea",

          idea: {
            title: idea.title,
            description:
              idea.description,
            image_url:
              idea.image_url,
          },
        }),
      }
    );

    const result =
      await response.json();

    console.log(
      "Telegram idea response:",
      result
    );

    return (
      response.ok &&
      result?.success === true
    );
  } catch (error) {
    console.error(
      "Telegram idea post failed:",
      error
    );

    return false;
  }
}

/* =========================================================
   MAIN
========================================================= */

Deno.serve(async (req) => {
  if (
    req.method === "OPTIONS"
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
      )!;

    const serviceRoleKey =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY"
      )!;

    const supabase =
      createClient(
        supabaseUrl,
        serviceRoleKey
      );

    const url =
      new URL(req.url);

    /* -------------------------------------------------------
       MANUAL PAIR OPTION
    ------------------------------------------------------- */

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
      "Selected idea pair:",
      cfg.pair
    );

    /* -------------------------------------------------------
       LIVE MT5 PRICE
    ------------------------------------------------------- */

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

    /* -------------------------------------------------------
       CANDLES
    ------------------------------------------------------- */

    const candles =
      await fetchCandles(
        cfg.yahoo,
        "H1"
      );

    if (
      candles.length < 12
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

    /* -------------------------------------------------------
       REPLACE LAST CLOSE WITH LIVE MT5 PRICE
    ------------------------------------------------------- */

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

    /* -------------------------------------------------------
       ANALYSIS
    ------------------------------------------------------- */

    const analysis =
      analyze(
        candles,
        livePrice,
        cfg.decimals
      );

    console.log(
      "Idea analysis:",
      analysis
    );

    /* -------------------------------------------------------
       CHART
    ------------------------------------------------------- */

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

    /* -------------------------------------------------------
       IDEA TEXT
    ------------------------------------------------------- */

    const title =
      `${analysis.action === "BUY" ? "🟢" : "🔴"} ` +
      `Market Idea — ${cfg.pair}`;

    const description =
      buildDescription(
        cfg.pair,
        analysis,
        cfg.decimals
      );

    /* -------------------------------------------------------
       SAVE TO DASHBOARD
    ------------------------------------------------------- */

    const row = {
      title,
      description,
      published: true,
      image_url:
        imageUrl,
    };

    const {
      data,
      error,
    } =
      await supabase
        .from(
          "market_ideas"
        )
        .insert(row)
        .select(
          "id,title,description,image_url"
        )
        .single();

    if (error) {
      throw error;
    }

    /* -------------------------------------------------------
       TELEGRAM
    ------------------------------------------------------- */

    const telegramSent =
      await postIdeaToTelegram(
        supabaseUrl,
        serviceRoleKey,
        {
          title,
          description,
          image_url:
            imageUrl,
        }
      );

    /* -------------------------------------------------------
       RESPONSE
    ------------------------------------------------------- */

    return new Response(
      JSON.stringify({
        success: true,

        pair:
          cfg.pair,

        live_price:
          livePrice,

        analysis,

        idea: data,

        telegram_sent:
          telegramSent,
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
});
