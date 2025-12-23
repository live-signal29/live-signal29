import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface DetailedAccuracyStats {
  today_total: number;
  today_wins: number;
  today_losses: number;
  today_accuracy: number | null;
  today_free_total: number;
  today_free_wins: number;
  today_free_accuracy: number | null;
  today_premium_total: number;
  today_premium_wins: number;
  today_premium_accuracy: number | null;
  yesterday_total: number;
  yesterday_wins: number;
  yesterday_losses: number;
  yesterday_accuracy: number | null;
  yesterday_free_total: number;
  yesterday_free_wins: number;
  yesterday_free_accuracy: number | null;
  yesterday_premium_total: number;
  yesterday_premium_wins: number;
  yesterday_premium_accuracy: number | null;
  week_total: number;
  week_wins: number;
  week_losses: number;
  week_accuracy: number | null;
  week_free_total: number;
  week_free_wins: number;
  week_free_accuracy: number | null;
  week_premium_total: number;
  week_premium_wins: number;
  week_premium_accuracy: number | null;
  weekend_total: number;
  weekend_wins: number;
  weekend_losses: number;
  weekend_accuracy: number | null;
  weekend_free_total: number;
  weekend_free_wins: number;
  weekend_free_accuracy: number | null;
  weekend_premium_total: number;
  weekend_premium_wins: number;
  weekend_premium_accuracy: number | null;
}

const defaultStats: DetailedAccuracyStats = {
  today_total: 0,
  today_wins: 0,
  today_losses: 0,
  today_accuracy: null,
  today_free_total: 0,
  today_free_wins: 0,
  today_free_accuracy: null,
  today_premium_total: 0,
  today_premium_wins: 0,
  today_premium_accuracy: null,
  yesterday_total: 0,
  yesterday_wins: 0,
  yesterday_losses: 0,
  yesterday_accuracy: null,
  yesterday_free_total: 0,
  yesterday_free_wins: 0,
  yesterday_free_accuracy: null,
  yesterday_premium_total: 0,
  yesterday_premium_wins: 0,
  yesterday_premium_accuracy: null,
  week_total: 0,
  week_wins: 0,
  week_losses: 0,
  week_accuracy: null,
  week_free_total: 0,
  week_free_wins: 0,
  week_free_accuracy: null,
  week_premium_total: 0,
  week_premium_wins: 0,
  week_premium_accuracy: null,
  weekend_total: 0,
  weekend_wins: 0,
  weekend_losses: 0,
  weekend_accuracy: null,
  weekend_free_total: 0,
  weekend_free_wins: 0,
  weekend_free_accuracy: null,
  weekend_premium_total: 0,
  weekend_premium_wins: 0,
  weekend_premium_accuracy: null,
};

export const useDetailedAccuracyStats = () => {
  const queryClient = useQueryClient();

  // Auto-refresh accuracy when any signal is updated (status change)
  useEffect(() => {
    const channel = supabase
      .channel("signals-detailed-accuracy")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "signals",
        },
        (payload: any) => {
          const next = payload?.new;
          // Refresh when signal is closed or TP/SL status changes
          if (next?.signal_status === "CLOSE" || next?.tp1_hit || next?.tp2_hit || next?.tp3_hit || next?.tp4_hit || next?.sl_hit) {
            queryClient.invalidateQueries({ queryKey: ["detailed-accuracy-stats"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["detailed-accuracy-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_detailed_accuracy_stats" as any);

      if (error) throw error;

      // RPC returns array, get first item
      const stats = data?.[0] || defaultStats;

      return stats as DetailedAccuracyStats;
    },
    staleTime: 30000, // 30 seconds
  });
};
