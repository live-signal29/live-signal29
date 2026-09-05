import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export interface DailyTradeSummary {
  total_trades: number;
  buy_count: number;
  sell_count: number;
  wins: number;
  losses: number;
  breakevens: number;
  tp1_count: number;
  tp2_count: number;
  tp3_count: number;
  tp4_count: number;
  sl_count: number;
  total_pips: number;
  win_rate: number;
}

export interface DailyTradeDetail {
  id: string;
  pair: string;
  category: string | null;
  type: string;
  entry: string;
  sl: string;
  tp1: string;
  tp2: string | null;
  tp3: string | null;
  tp4: string | null;
  result: "win" | "loss" | "breakeven";
  tp_hit_level: number | null;
  sl_hit: boolean;
  pips_gained: number;
  closed_at: string;
}

const emptySummary: DailyTradeSummary = {
  total_trades: 0,
  buy_count: 0,
  sell_count: 0,
  wins: 0,
  losses: 0,
  breakevens: 0,
  tp1_count: 0,
  tp2_count: 0,
  tp3_count: 0,
  tp4_count: 0,
  sl_count: 0,
  total_pips: 0,
  win_rate: 0,
};

/**
 * Fetches the trade summary + full trade list for one calendar day,
 * optionally filtered to a single category (e.g. "COMMODITIES") or
 * a single exact pair (e.g. "XAU/USD (Gold)"). Pass both as
 * undefined/null for "all pairs, all categories".
 */
export const useDailyTradeBreakdown = (
  date: Date | null,
  category?: string | null,
  pair?: string | null
) => {
  const dateStr = date ? format(date, "yyyy-MM-dd") : null;

  const summaryQuery = useQuery({
    queryKey: ["daily-trade-summary", dateStr, category, pair],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_daily_trade_summary" as any,
        {
          p_date: dateStr,
          p_category: category || null,
          p_pair: pair || null,
        }
      );
      if (error) throw error;
      const row = data?.[0];
      if (!row) return emptySummary;
      return {
        total_trades: Number(row.total_trades) || 0,
        buy_count: Number(row.buy_count) || 0,
        sell_count: Number(row.sell_count) || 0,
        wins: Number(row.wins) || 0,
        losses: Number(row.losses) || 0,
        breakevens: Number(row.breakevens) || 0,
        tp1_count: Number(row.tp1_count) || 0,
        tp2_count: Number(row.tp2_count) || 0,
        tp3_count: Number(row.tp3_count) || 0,
        tp4_count: Number(row.tp4_count) || 0,
        sl_count: Number(row.sl_count) || 0,
        total_pips: Number(row.total_pips) || 0,
        win_rate: Number(row.win_rate) || 0,
      } as DailyTradeSummary;
    },
    enabled: !!dateStr,
    staleTime: 30000,
  });

  const detailsQuery = useQuery({
    queryKey: ["daily-trade-details", dateStr, category, pair],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_daily_trade_details" as any,
        {
          p_date: dateStr,
          p_category: category || null,
          p_pair: pair || null,
        }
      );
      if (error) throw error;
      return (data || []) as DailyTradeDetail[];
    },
    enabled: !!dateStr,
    staleTime: 30000,
  });

  return {
    summary: summaryQuery.data || emptySummary,
    details: detailsQuery.data || [],
    isLoading: summaryQuery.isLoading || detailsQuery.isLoading,
  };
};
