import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface JournalEntry {
  id: string;
  pair: string;
  trade_type: "BUY" | "SELL";
  entry_price: number;
  exit_price: number | null;
  lot_size: number;
  stop_loss: number | null;
  take_profit: number | null;
  result: "win" | "loss" | "breakeven" | "open" | null;
  pnl: number | null;
  pips: number | null;
  notes: string | null;
  opened_at: string;
  closed_at: string | null;
}

export const useTradeJournal = () => {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["trade-journal"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("trade_journal")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return (data || []) as JournalEntry[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<JournalEntry>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("trade_journal").insert({ ...input, user_id: auth.user.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Trade logged");
      qc.invalidateQueries({ queryKey: ["trade-journal"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trade_journal").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trade-journal"] }),
  });

  const stats = (entries: JournalEntry[]) => {
    const closed = entries.filter((e) => e.result && e.result !== "open");
    const wins = closed.filter((e) => e.result === "win").length;
    const totalPnl = closed.reduce((s, e) => s + (Number(e.pnl) || 0), 0);
    return {
      total: entries.length,
      closed: closed.length,
      wins,
      losses: closed.filter((e) => e.result === "loss").length,
      winRate: closed.length ? (wins / closed.length) * 100 : 0,
      totalPnl,
    };
  };

  return { list, create, remove, stats };
};
