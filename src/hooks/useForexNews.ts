import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ForexNewsAlert {
  id: string;
  title: string;
  impact: "high" | "medium" | "low";
  currency: string;
  event_time: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  is_notified: boolean;
  created_at: string;
}

export const useForexNews = (upcoming = true) => {
  return useQuery({
    queryKey: ["forex-news", upcoming],
    queryFn: async () => {
      const now = new Date().toISOString();
      
      let query = supabase
        .from("forex_news_alerts")
        .select("*")
        .order("event_time", { ascending: upcoming });
      
      if (upcoming) {
        query = query.gte("event_time", now);
      } else {
        query = query.lt("event_time", now);
      }
      
      const { data, error } = await query.limit(20);

      if (error) throw error;
      return data as ForexNewsAlert[];
    },
    refetchInterval: 60000, // Refetch every minute
  });
};

export const useUpcomingHighImpactNews = () => {
  return useQuery({
    queryKey: ["forex-news-high-impact"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const next24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("forex_news_alerts")
        .select("*")
        .eq("impact", "high")
        .gte("event_time", now)
        .lte("event_time", next24h)
        .order("event_time", { ascending: true });

      if (error) throw error;
      return data as ForexNewsAlert[];
    },
    refetchInterval: 300000, // Refetch every 5 minutes
  });
};
