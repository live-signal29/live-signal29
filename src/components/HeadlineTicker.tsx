import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Megaphone } from "lucide-react";

interface Headline {
  id: string;
  text: string;
  headline_type: "normal" | "high_alert";
  is_active: boolean;
  created_at: string;
}

const HeadlineTicker = () => {
  const { data: headline, refetch } = useQuery({
    queryKey: ["active-headline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("headlines")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as Headline | null;
    },
    staleTime: 30000,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("headlines-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "headlines",
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  if (!headline) return null;

  const isHighAlert = headline.headline_type === "high_alert";

  return (
    <div
      className={`w-full overflow-hidden py-2 ${
        isHighAlert
          ? "bg-destructive/10 border-y border-destructive/30"
          : "bg-primary/5 border-y border-primary/20"
      }`}
    >
      <div className="flex items-center animate-ticker">
        <div className="flex items-center gap-3 whitespace-nowrap px-4">
          {isHighAlert ? (
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 animate-pulse" />
          ) : (
            <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <span
            className={`text-sm font-medium ${
              isHighAlert ? "text-destructive" : "text-foreground"
            }`}
          >
            {headline.text}
          </span>
        </div>
        {/* Duplicate for seamless loop */}
        <div className="flex items-center gap-3 whitespace-nowrap px-4">
          {isHighAlert ? (
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 animate-pulse" />
          ) : (
            <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <span
            className={`text-sm font-medium ${
              isHighAlert ? "text-destructive" : "text-foreground"
            }`}
          >
            {headline.text}
          </span>
        </div>
        {/* Third duplicate */}
        <div className="flex items-center gap-3 whitespace-nowrap px-4">
          {isHighAlert ? (
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 animate-pulse" />
          ) : (
            <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
          )}
          <span
            className={`text-sm font-medium ${
              isHighAlert ? "text-destructive" : "text-foreground"
            }`}
          >
            {headline.text}
          </span>
        </div>
      </div>
    </div>
  );
};

export default HeadlineTicker;
