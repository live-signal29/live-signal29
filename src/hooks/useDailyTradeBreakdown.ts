import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradeDetail {
  id: string;
  pair: string;
  type: string;
  entry: number;
  exit_price: number;
  hit_type: string;
  pips: number;
  created_at: string;
  is_win: boolean;
}

export interface DailyBreakdownData {
  winRate: number;
  totalPips: number;
  totalTrades: number;
  wins: number;
  losses: number;
  buyCount: number;
  sellCount: number;
  tp1Hits: number;
  tp2Hits: number;
  tp3Hits: number;
  slHits: number;
  trades: TradeDetail[];
}

export const useDailyTradeBreakdown = (dateType: "today" | "yesterday" | "week" | "month", goldOnly: boolean = true) => {
  return useQuery({
    queryKey: ["daily-trade-breakdown", dateType, goldOnly],
    queryFn: async () => {
      let query = supabase.from("signals").select("*").order("created_at", { ascending: false });

      if (goldOnly) {
        query = query.or("pair.ilike.%XAU%,pair.ilike.%GOLD%");
      }

      const { data, error } = await query;
      if (error) throw error;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfYesterday = startOfToday - 86400000;
      const startOfWeek = startOfToday - now.getDay() * 86400000;
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const filtered = (data || []).filter((sig) => {
        const t = new Date(sig.created_at).getTime();
        if (dateType === "today") return t >= startOfToday;
        if (dateType === "yesterday") return t >= startOfYesterday && t < startOfToday;
        if (dateType === "week") return t >= startOfWeek;
        if (dateType === "month") return t >= startOfMonth;
        return true;
      });

      let buyCount = 0;
      let sellCount = 0;
      let tp1Hits = 0;
      let tp2Hits = 0;
      let tp3Hits = 0;
      let slHits = 0;
      let wins = 0;
      let losses = 0;
      let totalPips = 0;

      const processedTrades: TradeDetail[] = filtered.map((sig) => {
        const pair = (sig.pair || "").toUpperCase();
        const entry = Number(sig.entry || 0);
        const exit = Number(sig.exit_price || sig.current_price || entry);
        const action = (sig.type || sig.action || "BUY").toUpperCase();

        if (action === "BUY") buyCount++;
        else sellCount++;

        // Correct Pip Calculation Formula
        let diff = action === "BUY" ? exit - entry : entry - exit;
        let calculatedPips = 0;

        if (pair.includes("XAU") || pair.includes("GOLD")) {
          calculatedPips = Math.round(diff * 10); // $1 Move = 10 Pips
        } else if (pair.includes("JPY")) {
          calculatedPips = Math.round(diff * 100);
        } else {
          calculatedPips = Math.round(diff * 10000);
        }

        const hit = (sig.hit_type || "").toUpperCase();
        const isWin = sig.tp1_hit || sig.tp2_hit || sig.tp3_hit || ["TP1", "TP2", "TP3", "WIN"].includes(hit) || calculatedPips > 0;

        if (sig.tp1_hit || hit === "TP1") tp1Hits++;
        if (sig.tp2_hit || hit === "TP2") tp2Hits++;
        if (sig.tp3_hit || hit === "TP3") tp3Hits++;
        if (sig.sl_hit || hit === "SL") slHits++;

        if (isWin) wins++;
        else losses++;

        totalPips += calculatedPips;

        return {
          id: sig.id,
          pair: sig.pair,
          type: action,
          entry,
          exit_price: exit,
          hit_type: sig.hit_type || (isWin ? "TP Hit" : "SL Hit"),
          pips: calculatedPips,
          created_at: sig.created_at,
          is_win: isWin,
        };
      });

      const totalTrades = processedTrades.length;
      const winRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;

      return {
        winRate,
        totalPips,
        totalTrades,
        wins,
        losses,
        buyCount,
        sellCount,
        tp1Hits,
        tp2Hits,
        tp3Hits,
        slHits,
        trades: processedTrades,
      } as DailyBreakdownData;
    },
    staleTime: 10000,
  });
};
