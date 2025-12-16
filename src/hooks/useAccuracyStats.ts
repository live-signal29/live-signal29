import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface AccuracyStats {
  free_total: number;
  free_wins: number;
  free_accuracy: number | null;
  premium_total: number;
  premium_wins: number;
  premium_accuracy: number | null;
}

export const useAccuracyStats = () => {
  const queryClient = useQueryClient();

  // Subscribe to trade_history changes for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel("trade-history-accuracy")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trade_history",
        },
        () => {
          // Auto-refresh accuracy when trade history changes
          queryClient.invalidateQueries({ queryKey: ["accuracy-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ["accuracy-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_accuracy_stats");

      if (error) throw error;

      // RPC returns array, get first item
      const stats = data?.[0] || {
        free_total: 0,
        free_wins: 0,
        free_accuracy: null,
        premium_total: 0,
        premium_wins: 0,
        premium_accuracy: null,
      };

      return stats as AccuracyStats;
    },
    staleTime: 30000, // 30 seconds
  });
};
