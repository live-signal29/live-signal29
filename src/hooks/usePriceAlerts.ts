import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PriceAlert {
  id: string;
  pair: string;
  target_price: number;
  condition: "above" | "below";
  is_active: boolean;
  triggered_at: string | null;
  note: string | null;
  created_at: string;
}

export const usePriceAlerts = () => {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["price-alerts"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("price_alerts")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as PriceAlert[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { pair: string; target_price: number; condition: "above" | "below"; note?: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("price_alerts").insert({ ...input, user_id: auth.user.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert added");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("price_alerts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert removed");
      qc.invalidateQueries({ queryKey: ["price-alerts"] });
    },
  });

  return { list, create, remove };
};
