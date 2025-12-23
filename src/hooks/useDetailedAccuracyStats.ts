import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface DetailedAccuracyStats {
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

export const useDetailedAccuracyStats = () => {
  const queryClient = useQueryClient();

  // Auto-refresh accuracy when any signal is CLOSED
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
          if (next?.signal_status === "CLOSE") {
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
      const stats = data?.[0] || {
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

      return stats as DetailedAccuracyStats;
    },
    staleTime: 30000, // 30 seconds
  });
};
