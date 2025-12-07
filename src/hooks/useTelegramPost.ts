import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Signal {
  id: string;
  pair: string;
  type: string;
  entry: string;
  tp1: string;
  tp2?: string;
  tp3?: string;
  tp4?: string;
  sl: string;
  risk_level?: string;
  signal_type?: string;
  analysis_reason?: string;
}

export const useTelegramPost = () => {
  const postNewSignal = useMutation({
    mutationFn: async (signal: Signal) => {
      const { data, error } = await supabase.functions.invoke("telegram-signal-post", {
        body: { signal, action: "new_signal" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Signal posted to Telegram");
    },
    onError: (error) => {
      console.error("Telegram post error:", error);
      toast.error("Failed to post to Telegram");
    },
  });

  const postUpdate = useMutation({
    mutationFn: async ({ signal, updateType }: { signal: Signal; updateType: string }) => {
      const { data, error } = await supabase.functions.invoke("telegram-signal-post", {
        body: { signal, action: "update", update_type: updateType },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Update posted to Telegram");
    },
    onError: (error) => {
      console.error("Telegram update error:", error);
    },
  });

  return {
    postNewSignal,
    postUpdate,
  };
};
