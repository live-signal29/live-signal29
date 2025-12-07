import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TradeHistoryItem {
  id: string;
  signal_id: string | null;
  pair: string;
  type: string;
  category: string | null;
  entry: string;
  close_price: string | null;
  tp1: string | null;
  tp2: string | null;
  tp3: string | null;
  tp4: string | null;
  sl: string;
  result: "win" | "loss" | "breakeven";
  pips_gained: number;
  closed_at: string;
  tp_hit_level: number;
  sl_hit: boolean;
  risk_level: string | null;
  signal_type: string | null;
  notes: string | null;
}

export const useTradeHistory = (limit = 50) => {
  return useQuery({
    queryKey: ["trade-history", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_history")
        .select("*")
        .order("closed_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as TradeHistoryItem[];
    },
  });
};

export const useTradeStats = (days = 7) => {
  return useQuery({
    queryKey: ["trade-stats", days],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase.rpc("calculate_signal_stats", {
        p_start_date: startDate.toISOString().split("T")[0],
        p_end_date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;
      
      // The RPC returns an array with one row
      return data?.[0] || {
        total_signals: 0,
        total_wins: 0,
        total_losses: 0,
        total_breakeven: 0,
        total_pips: 0,
        win_rate: 0,
        top_symbols: [],
      };
    },
  });
};
