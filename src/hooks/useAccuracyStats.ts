import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AccuracyStats {
  free_total: number;
  free_wins: number;
  free_accuracy: number;
  premium_total: number;
  premium_wins: number;
  premium_accuracy: number;
}

export const useAccuracyStats = () => {
  return useQuery({
    queryKey: ["accuracy-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_accuracy_stats");

      if (error) throw error;

      // RPC returns array, get first item
      const stats = data?.[0] || {
        free_total: 0,
        free_wins: 0,
        free_accuracy: 0,
        premium_total: 0,
        premium_wins: 0,
        premium_accuracy: 0,
      };

      return stats as AccuracyStats;
    },
  });
};
