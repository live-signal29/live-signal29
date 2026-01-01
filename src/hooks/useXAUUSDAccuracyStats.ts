import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface XAUUSDDayData {
  date: string;
  total: number;
  wins: number;
  losses: number;
  pips: number;
}

export interface XAUUSDAccuracyStats {
  total_signals: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  total_pips: number;
  avg_win_pips: number;
  avg_loss_pips: number;
  last_7_days: XAUUSDDayData[];
}

const defaultStats: XAUUSDAccuracyStats = {
  total_signals: 0,
  total_wins: 0,
  total_losses: 0,
  win_rate: 0,
  total_pips: 0,
  avg_win_pips: 0,
  avg_loss_pips: 0,
  last_7_days: [],
};

export const useXAUUSDAccuracyStats = () => {
  const queryClient = useQueryClient();

  // Auto-refresh when any XAUUSD signal is updated
  useEffect(() => {
    const channel = supabase
      .channel("xauusd-accuracy-stats")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "signals",
        },
        (payload: any) => {
          const next = payload?.new;
          const pair = next?.pair?.toUpperCase() || "";
          // Refresh when XAUUSD/Gold signal is closed
          if ((pair.includes("XAUUSD") || pair.includes("GOLD")) && 
              (next?.signal_status === "CLOSE" || next?.tp1_hit || next?.tp2_hit || next?.tp3_hit || next?.tp4_hit || next?.sl_hit)) {
            queryClient.invalidateQueries({ queryKey: ["xauusd-accuracy-stats"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["xauusd-accuracy-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_xauusd_accuracy_stats" as any);

      if (error) throw error;

      const stats = data?.[0] || defaultStats;

      return {
        total_signals: Number(stats.total_signals) || 0,
        total_wins: Number(stats.total_wins) || 0,
        total_losses: Number(stats.total_losses) || 0,
        win_rate: Number(stats.win_rate) || 0,
        total_pips: Number(stats.total_pips) || 0,
        avg_win_pips: Number(stats.avg_win_pips) || 0,
        avg_loss_pips: Number(stats.avg_loss_pips) || 0,
        last_7_days: (stats.last_7_days || []) as XAUUSDDayData[],
      } as XAUUSDAccuracyStats;
    },
    staleTime: 30000,
  });
};
