import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PairStats {
  pair: string;
  total_signals: number;
  total_wins: number;
  total_losses: number;
  win_rate: number;
  total_pips: number;
}

export const usePerPairStats = () => {
  return useQuery({
    queryKey: ["per-pair-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_per_pair_stats");
      if (error) throw error;
      return (data as PairStats[]) || [];
    },
    staleTime: 60_000,
  });
};
