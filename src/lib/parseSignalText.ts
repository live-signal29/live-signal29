/* =========================================================
   PARSE PASTED SIGNAL TEXT

   Example:
     Gold buy now 4154-4152

     Tp 4161
     Tp 4169-4179
     Sl 4144

   -> pair "XAU/USD (Gold)", Buy, entry 4154, tp1 4161,
      tp2 4169, sl 4144

   Rule: wherever a range like 4154-4152 is written, only the
   FIRST price is used.
========================================================= */

export interface ParsedSignal {
  pair: string;
  category: string;
  type: "Buy" | "Sell" | "";
  entry_mode: "market" | "limit";
  entry: string;
  tp1: string;
  tp2: string;
  tp3: string;
  sl: string;
  warnings: string[];
}

type PairRule = { re: RegExp; label: string; category: string };

const PAIR_RULES: PairRule[] = [
  // COMMODITIES
  { re: /\b(xau\s*\/?\s*usd|xau|gold)\b/i, label: "XAU/USD (Gold)", category: "COMMODITIES" },
  { re: /\b(xag\s*\/?\s*usd|xag|silver)\b/i, label: "XAG/USD (Silver)", category: "COMMODITIES" },
  { re: /\b(brent|ukoil)\b/i, label: "Oil - Brent", category: "COMMODITIES" },
  { re: /\b(crude|wti|usoil|oil)\b/i, label: "Oil - Crude", category: "COMMODITIES" },
  { re: /\b(natural\s*gas|natgas)\b/i, label: "Natural Gas", category: "COMMODITIES" },
  { re: /\b(us30|dow\s*jones|dow)\b/i, label: "US30", category: "COMMODITIES" },
  { re: /\b(nasdaq|nas100|us100)\b/i, label: "NASDAQ", category: "COMMODITIES" },
  { re: /\b(s&p\s*500|sp500|spx|us500)\b/i, label: "S&P500", category: "COMMODITIES" },
  { re: /\b(dax|ger40|de40)\b/i, label: "DAX", category: "COMMODITIES" },
  { re: /\b(ftse\s*100|ftse)\b/i, label: "FTSE100", category: "COMMODITIES" },
  { re: /\b(nikkei|jp225)\b/i, label: "Nikkei", category: "COMMODITIES" },

  // CRYPTO
  { re: /\b(btc\s*\/?\s*usd[t]?|btc|bitcoin)\b/i, label: "BTC/USD", category: "CRYPTO" },
  { re: /\b(eth\s*\/?\s*usd[t]?|eth|ethereum)\b/i, label: "ETH/USD", category: "CRYPTO" },
  { re: /\b(xrp\s*\/?\s*usd[t]?|xrp)\b/i, label: "XRP/USD", category: "CRYPTO" },
  { re: /\b(ltc\s*\/?\s*usd[t]?|ltc)\b/i, label: "LTC/USD", category: "CRYPTO" },
  { re: /\b(ada\s*\/?\s*usd[t]?|ada)\b/i, label: "ADA/USD", category: "CRYPTO" },
  { re: /\b(sol\s*\/?\s*usd[t]?|sol)\b/i, label: "SOL/USD", category: "CRYPTO" },
];

const FOREX_CCY = "eur|gbp|usd|jpy|chf|cad|aud|nzd";
const FOREX_RE = new RegExp(`\\b(${FOREX_CCY})\\s*\\/?\\s*(${FOREX_CCY})\\b`, "i");
const DERIV_RE = /\b(boom|crash)\s*(1000|500)\b|\bvol(?:atility)?\s*(10|25|50|75|100)\b/i;

// Markers that start a price segment
const MARKER_RE =
  /\b(take\s*profit|target|tp|stop\s*loss|sl)\s*-?\s*([1-3])?(?![\d.,])/gi;

const firstNumber = (s: string): string => {
  const m = s.match(/\d+(?:[.,]\d+)?/);
  return m ? m[0].replace(",", ".") : "";
};

export function parseSignalText(raw: string): ParsedSignal {
  const out: ParsedSignal = {
    pair: "",
    category: "",
    type: "",
    entry_mode: "market",
    entry: "",
    tp1: "",
    tp2: "",
    tp3: "",
    sl: "",
    warnings: [],
  };

  const text = String(raw || "").replace(/[\u2013\u2014]/g, "-").trim();
  if (!text) return out;

  /* ---------- split header / marker segments ---------- */

  const markers: { index: number; end: number; kind: "tp" | "sl"; n: number }[] = [];
  MARKER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = MARKER_RE.exec(text)) !== null) {
    const word = m[1].toLowerCase().replace(/\s+/g, "");
    const kind = word === "sl" || word === "stoploss" ? "sl" : "tp";
    markers.push({
      index: m.index,
      end: m.index + m[0].length,
      kind,
      n: m[2] ? parseInt(m[2], 10) : 0,
    });
  }

  const headerEnd = markers.length ? markers[0].index : text.length;
  let header = text.slice(0, headerEnd);

  /* ---------- pair ---------- */

  let pairSpan: string | null = null;

  const deriv = header.match(DERIV_RE);
  if (deriv) {
    const name = deriv[1]
      ? `${deriv[1].toUpperCase()} ${deriv[2]}`
      : `VOL ${deriv[3]}`;
    out.pair = name;
    out.category = "DERIV/BINARY";
    pairSpan = deriv[0];
  } else {
    // earliest match in the header wins
    let best: { idx: number; rule: PairRule; span: string } | null = null;

    for (const rule of PAIR_RULES) {
      const r = header.match(rule.re);
      if (r && r.index !== undefined && (!best || r.index < best.idx)) {
        best = { idx: r.index, rule, span: r[0] };
      }
    }

    if (best) {
      out.pair = best.rule.label;
      out.category = best.rule.category;
      pairSpan = best.span;
    } else {
      const fx = header.match(FOREX_RE);
      if (fx) {
        out.pair = `${fx[1].toUpperCase()}/${fx[2].toUpperCase()}`;
        out.category = "FOREX";
        pairSpan = fx[0];
      }
    }
  }

  if (pairSpan) header = header.replace(pairSpan, " ");

  /* ---------- type & entry mode ---------- */

  const t = header.match(/\b(buy|long|sell|short)\b/i);
  if (t) {
    out.type = /buy|long/i.test(t[1]) ? "Buy" : "Sell";
  }

  if (/\b(limit|stop)\b/i.test(header)) out.entry_mode = "limit";

  /* ---------- entry ---------- */

  const afterType = t && t.index !== undefined ? header.slice(t.index + t[0].length) : header;
  out.entry = firstNumber(afterType) || firstNumber(header);

  /* ---------- TP / SL ---------- */

  let nextTp = 1;

  markers.forEach((mk, i) => {
    const segEnd = i + 1 < markers.length ? markers[i + 1].index : text.length;
    const value = firstNumber(text.slice(mk.end, segEnd));
    if (!value) return;

    if (mk.kind === "sl") {
      if (!out.sl) out.sl = value;
      return;
    }

    const slot = mk.n || nextTp;
    nextTp = slot + 1;

    if (slot === 1) out.tp1 = out.tp1 || value;
    else if (slot === 2) out.tp2 = out.tp2 || value;
    else if (slot === 3) out.tp3 = out.tp3 || value;
    else out.warnings.push(`TP${slot} ignored (max 3 targets).`);
  });

  /* ---------- checks ---------- */

  if (!out.pair) out.warnings.push("Pair not detected - please type it.");
  if (!out.type) out.warnings.push("Buy/Sell not detected.");
  if (!out.entry) out.warnings.push("Entry price not found.");
  if (!out.tp1) out.warnings.push("TP1 not found.");
  if (!out.sl) out.warnings.push("Stop loss not found.");

  const e = parseFloat(out.entry);
  const sl = parseFloat(out.sl);
  const tps = [out.tp1, out.tp2, out.tp3]
    .filter(Boolean)
    .map((v) => parseFloat(v));

  if (out.type && Number.isFinite(e) && Number.isFinite(sl) && tps.length) {
    const buy = out.type === "Buy";
    const slOk = buy ? sl < e : sl > e;
    const tpOk = tps.every((v) => (buy ? v > e : v < e));

    if (!slOk) out.warnings.push("Stop loss is on the wrong side of entry.");
    if (!tpOk) out.warnings.push("A TP is on the wrong side of entry.");
  }

  return out;
}
