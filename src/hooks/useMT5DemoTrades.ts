import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MT5DemoTrade {
  id: string;
  signal_id: string | null;
  mt5_ticket: string | null;
  symbol: string;
  trade_type: string;
  entry_price: number | null;
  sl_price: number | null;
  tp_price: number | null;
  lot_size: number;
  status: string;
  open_time: string | null;
  close_time: string | null;
  close_price: number | null;
  profit_loss: number | null;
  result: string | null;
  error_message: string | null;
  created_at: string;
}

export interface MT5DemoStats {
  total_trades: number;
  total_wins: number;
  total_losses: number;
  total_breakeven: number;
  total_profit: number;
  win_rate: number;
  accuracy_percent: number;
}

export const useMT5DemoTrades = () => {
  return useQuery({
    queryKey: ["mt5-demo-trades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mt5_demo_trades")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MT5DemoTrade[];
    },
  });
};

export const useMT5DemoStats = () => {
  return useQuery({
    queryKey: ["mt5-demo-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mt5-demo-trade", {
        body: { action: "stats" },
      });

      if (error) throw error;
      return data as MT5DemoStats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useOpenMT5Trade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      signal_id?: string;
      symbol: string;
      trade_type: "buy" | "sell";
      entry?: number;
      sl?: number;
      tp?: number;
      lot_size?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("mt5-demo-trade", {
        body: { action: "open", ...params },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5-demo-trades"] });
      queryClient.invalidateQueries({ queryKey: ["mt5-demo-stats"] });
      toast.success("Demo trade opened successfully");
    },
    onError: (error) => {
      console.error("Failed to open trade:", error);
      toast.error(`Failed to open trade: ${error.message}`);
    },
  });
};

export const useCheckMT5Trades = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mt5-demo-trade", {
        body: { action: "check" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["mt5-demo-trades"] });
      queryClient.invalidateQueries({ queryKey: ["mt5-demo-stats"] });
      if (data.updated > 0) {
        toast.success(`${data.updated} trades updated`);
      }
    },
    onError: (error) => {
      console.error("Failed to check trades:", error);
      toast.error(`Failed to check trades: ${error.message}`);
    },
  });
};

export const useCloseMT5Trade = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tradeId: string) => {
      const { data, error } = await supabase.functions.invoke("mt5-demo-trade", {
        body: { action: "close", trade_id: tradeId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5-demo-trades"] });
      queryClient.invalidateQueries({ queryKey: ["mt5-demo-stats"] });
      toast.success("Demo trade closed");
    },
    onError: (error) => {
      console.error("Failed to close trade:", error);
      toast.error(`Failed to close trade: ${error.message}`);
    },
  });
};
