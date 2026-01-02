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
  today_total: number;
  today_wins: number;
  today_losses: number;
  today_accuracy: number | null;
  yesterday_total: number;
  yesterday_wins: number;
  yesterday_losses: number;
  yesterday_accuracy: number | null;
  week_total: number;
  week_wins: number;
  week_losses: number;
  week_accuracy: number | null;
  weekend_total: number;
  weekend_wins: number;
  weekend_losses: number;
  weekend_accuracy: number | null;
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
  today_total: 0,
  today_wins: 0,
  today_losses: 0,
  today_accuracy: null,
  yesterday_total: 0,
  yesterday_wins: 0,
  yesterday_losses: 0,
  yesterday_accuracy: null,
  week_total: 0,
  week_wins: 0,
  week_losses: 0,
  week_accuracy: null,
  weekend_total: 0,
  weekend_wins: 0,
  weekend_losses: 0,
  weekend_accuracy: null,
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
        today_total: Number(stats.today_total) || 0,
        today_wins: Number(stats.today_wins) || 0,
        today_losses: Number(stats.today_losses) || 0,
        today_accuracy: stats.today_accuracy !== null ? Number(stats.today_accuracy) : null,
        yesterday_total: Number(stats.yesterday_total) || 0,
        yesterday_wins: Number(stats.yesterday_wins) || 0,
        yesterday_losses: Number(stats.yesterday_losses) || 0,
        yesterday_accuracy: stats.yesterday_accuracy !== null ? Number(stats.yesterday_accuracy) : null,
        week_total: Number(stats.week_total) || 0,
        week_wins: Number(stats.week_wins) || 0,
        week_losses: Number(stats.week_losses) || 0,
        week_accuracy: stats.week_accuracy !== null ? Number(stats.week_accuracy) : null,
        weekend_total: Number(stats.weekend_total) || 0,
        weekend_wins: Number(stats.weekend_wins) || 0,
        weekend_losses: Number(stats.weekend_losses) || 0,
        weekend_accuracy: stats.weekend_accuracy !== null ? Number(stats.weekend_accuracy) : null,
      } as XAUUSDAccuracyStats;
    },
    staleTime: 30000,
  });
};
