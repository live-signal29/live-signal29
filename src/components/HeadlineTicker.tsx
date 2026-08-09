import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Megaphone,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Headline {
  id: string;
  text: string;
  headline_type: "normal" | "high_alert";
  is_active: boolean;
  created_at: string;
}

const HeadlineTicker = () => {
  const {
    data: headline,
    refetch,
  } = useQuery({
    queryKey: ["active-headline"],

    queryFn: async (): Promise<Headline | null> => {
      const { data, error } = await supabase
        .from("headlines")
        .select("id, text, headline_type, is_active, created_at")
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (error) {
        console.error("Headline fetch error:", error);
        return null;
      }

      return data?.[0] ? (data[0] as Headline) : null;
    },

    staleTime: 30000,
    retry: 2,
  });

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("headline-ticker-realtime")
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

  const words = headline.text.trim().split(/\s+/);
  const firstWord = words[0] || "";
  const remainingText = words.slice(1).join(" ");

  const TickerContent = () => (
    <div className="flex items-center gap-3 whitespace-nowrap px-6 sm:px-8">
      {/* Icon Badge */}
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border shadow-sm transition-colors",
          isHighAlert
            ? "border-red-300 bg-red-100 text-red-600 dark:border-red-500/40 dark:bg-red-500/20 dark:text-red-400"
            : "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-400"
        )}
      >
        {isHighAlert ? (
          <AlertTriangle className="h-3.5 w-3.5 animate-pulse" strokeWidth={2.5} />
        ) : (
          <Megaphone className="h-3.5 w-3.5" strokeWidth={2.4} />
        )}
      </div>

      {/* Ticker Tag */}
      <span
        className={cn(
          "text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border",
          isHighAlert
            ? "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400"
            : "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400"
        )}
      >
        {isHighAlert ? "HIGH ALERT" : "MARKET UPDATE"}
      </span>

      {/* Mini Sparkline Chart SVG */}
      <div className="h-4 w-12 shrink-0 opacity-80">
        <svg viewBox="0 0 50 15" className="h-full w-full overflow-visible">
          <path
            d={isHighAlert ? "M 0 3 L 12 12 L 25 5 L 38 14 L 50 2" : "M 0 12 L 12 4 L 25 9 L 38 2 L 50 10"}
            fill="none"
            stroke={isHighAlert ? "#ef4444" : "#f59e0b"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Main Text Content */}
      <span className="text-xs tracking-wide leading-none text-slate-800 dark:text-slate-100 font-medium">
        <span
          className={cn(
            "font-black uppercase tracking-wider mr-1",
            isHighAlert
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400"
          )}
        >
          {firstWord}
        </span>
        {remainingText && (
          <span className="text-slate-700 dark:text-slate-300">
            {remainingText}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden border-y py-2.5 backdrop-blur-md transition-all duration-300",
        // Light Theme styling
        !isHighAlert && "border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 dark:border-amber-500/20 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-900",
        // Dark & Alert styling
        isHighAlert && "border-red-300/80 bg-gradient-to-r from-red-50/90 via-rose-50/50 to-red-50/90 dark:border-red-500/30 dark:from-red-950/40 dark:via-slate-900 dark:to-red-950/40"
      )}
    >
      {/* Top / Bottom Accents */}
      <div className={cn("absolute left-0 right-0 top-0 h-[1px]", isHighAlert ? "bg-red-400/40" : "bg-amber-400/40")} />
      <div className={cn("absolute left-0 right-0 bottom-0 h-[1px]", isHighAlert ? "bg-red-300/40" : "bg-amber-300/40")} />

      {/* Left/Right Faders for seamless animation */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-white dark:from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-white dark:from-slate-950 to-transparent" />

      {/* Continuous Moving Ticker */}
      <div className="relative z-[2] flex items-center animate-ticker">
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
      </div>
    </div>
  );
};

export default HeadlineTicker;
