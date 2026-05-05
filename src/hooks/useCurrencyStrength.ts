import { useEffect, useState } from "react";
import { useLivePricesFetch } from "@/hooks/useLivePrices";

const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF"];

// Pairs we'll fetch and their direction relative to base/quote
const PAIRS: { pair: string; base: string; quote: string }[] = [
  { pair: "EURUSD", base: "EUR", quote: "USD" },
  { pair: "GBPUSD", base: "GBP", quote: "USD" },
  { pair: "AUDUSD", base: "AUD", quote: "USD" },
  { pair: "NZDUSD", base: "NZD", quote: "USD" },
  { pair: "USDJPY", base: "USD", quote: "JPY" },
  { pair: "USDCHF", base: "USD", quote: "CHF" },
  { pair: "USDCAD", base: "USD", quote: "CAD" },
  { pair: "EURGBP", base: "EUR", quote: "GBP" },
  { pair: "EURJPY", base: "EUR", quote: "JPY" },
  { pair: "GBPJPY", base: "GBP", quote: "JPY" },
];

export interface StrengthScore {
  currency: string;
  score: number; // -100..100 (relative)
}

export const useCurrencyStrength = () => {
  const pairList = PAIRS.map((p) => p.pair);
  const { prices, loading } = useLivePricesFetch(pairList, true);
  const [previous, setPrevious] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<StrengthScore[]>([]);

  useEffect(() => {
    if (!prices || Object.keys(prices).length === 0) return;
    // Initialize previous on first load
    setPrevious((prev) => {
      if (Object.keys(prev).length === 0) {
        const init: Record<string, number> = {};
        for (const k of Object.keys(prices)) init[k] = parseFloat(prices[k]);
        return init;
      }
      return prev;
    });
  }, [prices]);

  useEffect(() => {
    if (Object.keys(previous).length === 0) return;
    // For each currency sum % change across pairs where it appears
    const totals: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const c of CURRENCIES) { totals[c] = 0; counts[c] = 0; }

    for (const p of PAIRS) {
      const cur = parseFloat(prices[p.pair] || "0");
      const prev = previous[p.pair] || cur;
      if (!cur || !prev) continue;
      const pct = ((cur - prev) / prev) * 100;
      // Base gains pct, Quote loses pct
      totals[p.base] += pct; counts[p.base]++;
      totals[p.quote] -= pct; counts[p.quote]++;
    }

    const raw = CURRENCIES.map((c) => ({
      currency: c,
      score: counts[c] ? totals[c] / counts[c] : 0,
    }));
    // Normalize to -100..100 based on max abs
    const maxAbs = Math.max(0.0001, ...raw.map((r) => Math.abs(r.score)));
    const normalized = raw.map((r) => ({
      currency: r.currency,
      score: Math.round((r.score / maxAbs) * 100),
    })).sort((a, b) => b.score - a.score);

    setScores(normalized);
  }, [prices, previous]);

  return { scores, loading };
};
