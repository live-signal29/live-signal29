import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Megaphone,
  Activity,
  Radio,
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
  const { data: headline, refetch } = useQuery({
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

  // Realtime headline updates
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

  /*
   * Individual ticker item
   */
  const TickerContent = () => (
    <div className="flex h-9 shrink-0 items-center gap-3 px-5 sm:px-8">

      {/* Live Pulse */}
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center">
        <span
          className={cn(
            "absolute h-5 w-5 rounded-full opacity-30 animate-ping",
            isHighAlert
              ? "bg-red-500"
              : "bg-amber-500"
          )}
        />

        <span
          className={cn(
            "relative h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]",
            isHighAlert
              ? "bg-red-500 text-red-500"
              : "bg-amber-500 text-amber-500"
          )}
        />
      </div>

      {/* Live Label */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2 py-1",
          "text-[9px] font-black tracking-[0.16em]",
          "backdrop-blur-md",

          isHighAlert
            ? [
                "border-red-300/70",
                "bg-red-500/10",
                "text-red-600",
                "dark:border-red-500/30",
                "dark:bg-red-500/10",
                "dark:text-red-400",
              ]
            : [
                "border-amber-300/70",
                "bg-amber-500/10",
                "text-amber-700",
                "dark:border-amber-500/30",
                "dark:bg-amber-500/10",
                "dark:text-amber-400",
              ]
        )}
      >
        <Radio
          className="h-3 w-3 animate-pulse"
          strokeWidth={2.5}
        />

        <span>LIVE</span>
      </div>

      {/* Category Badge */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full px-2.5 py-1",
          "border text-[9px] font-extrabold uppercase tracking-wider",

          isHighAlert
            ? [
                "border-red-400/30",
                "bg-red-500/10",
                "text-red-600",
                "dark:border-red-500/30",
                "dark:bg-red-500/15",
                "dark:text-red-400",
              ]
            : [
                "border-amber-400/30",
                "bg-amber-500/10",
                "text-amber-700",
                "dark:border-amber-500/30",
                "dark:bg-amber-500/15",
                "dark:text-amber-400",
              ]
        )}
      >
        {isHighAlert ? (
          <AlertTriangle
            className="h-3 w-3 animate-pulse"
            strokeWidth={2.5}
          />
        ) : (
          <Megaphone
            className="h-3 w-3"
            strokeWidth={2.4}
          />
        )}

        {isHighAlert ? "HIGH ALERT" : "MARKET UPDATE"}
      </div>

      {/* Mini Market Graph */}
      <div className="relative flex h-6 w-14 shrink-0 items-center opacity-90">
        <svg
          viewBox="0 0 56 20"
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id={`tickerGradient-${headline.id}`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop
                offset="0%"
                stopColor={isHighAlert ? "#ef4444" : "#f59e0b"}
                stopOpacity="0.2"
              />
              <stop
                offset="50%"
                stopColor={isHighAlert ? "#ef4444" : "#f59e0b"}
                stopOpacity="1"
              />
              <stop
                offset="100%"
                stopColor={isHighAlert ? "#ef4444" : "#f59e0b"}
                stopOpacity="0.2"
              />
            </linearGradient>
          </defs>

          {/* Glow */}
          <path
            d={
              isHighAlert
                ? "M0 5 L8 14 L17 7 L27 16 L38 8 L47 13 L56 3"
                : "M0 15 L8 7 L17 12 L27 5 L38 11 L47 4 L56 9"
            }
            fill="none"
            stroke={isHighAlert ? "#ef4444" : "#f59e0b"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.15"
          />

          {/* Main Line */}
          <path
            d={
              isHighAlert
                ? "M0 5 L8 14 L17 7 L27 16 L38 8 L47 13 L56 3"
                : "M0 15 L8 7 L17 12 L27 5 L38 11 L47 4 L56 9"
            }
            fill="none"
            stroke={`url(#tickerGradient-${headline.id})`}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* End Dot */}
          <circle
            cx="56"
            cy={isHighAlert ? "3" : "9"}
            r="2"
            fill={isHighAlert ? "#ef4444" : "#f59e0b"}
            className="animate-pulse"
          />
        </svg>
      </div>

      {/* Divider */}
      <div
        className={cn(
          "h-5 w-px",
          isHighAlert
            ? "bg-red-500/20"
            : "bg-amber-500/20"
        )}
      />

      {/* Headline */}
      <span className="text-xs leading-none tracking-wide text-slate-700 dark:text-slate-200 sm:text-[13px]">

        <span
          className={cn(
            "mr-1.5 font-black uppercase tracking-wider",

            isHighAlert
              ? "text-red-600 dark:text-red-400"
              : "text-amber-700 dark:text-amber-400"
          )}
        >
          {firstWord}
        </span>

        {remainingText && (
          <span className="font-medium text-slate-600 dark:text-slate-300">
            {remainingText}
          </span>
        )}
      </span>

      {/* Activity Icon */}
      <Activity
        className={cn(
          "h-3.5 w-3.5 shrink-0",
          isHighAlert
            ? "text-red-500/60"
            : "text-amber-500/60"
        )}
      />
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "border-y backdrop-blur-xl",
        "transition-all duration-500",

        /*
         * NORMAL / MARKET UPDATE
         */
        !isHighAlert && [
          "border-amber-200/70",
          "bg-gradient-to-r",
          "from-amber-50",
          "via-white",
          "to-amber-50",

          "dark:border-amber-500/20",
          "dark:from-slate-950",
          "dark:via-slate-900",
          "dark:to-slate-950",
        ],

        /*
         * HIGH ALERT
         */
        isHighAlert && [
          "border-red-200/80",
          "bg-gradient-to-r",
          "from-red-50",
          "via-white",
          "to-red-50",

          "dark:border-red-500/25",
          "dark:from-red-950/30",
          "dark:via-slate-950",
          "dark:to-red-950/30",
        ]
      )}
    >

      {/* Top Glow Line */}
      <div
        className={cn(
          "absolute left-0 right-0 top-0 h-px",
          isHighAlert
            ? "bg-gradient-to-r from-transparent via-red-500/70 to-transparent"
            : "bg-gradient-to-r from-transparent via-amber-500/70 to-transparent"
        )}
      />

      {/* Bottom Glow Line */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 h-px",
          isHighAlert
            ? "bg-gradient-to-r from-transparent via-red-400/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-amber-400/40 to-transparent"
        )}
      />

      {/* Left Fade */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-16",
          isHighAlert
            ? "bg-gradient-to-r from-red-50 via-red-50/80 to-transparent dark:from-red-950/30 dark:via-slate-950/50"
            : "bg-gradient-to-r from-amber-50 via-amber-50/80 to-transparent dark:from-slate-950 dark:via-slate-950/70"
        )}
      />

      {/* Right Fade */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-16",
          isHighAlert
            ? "bg-gradient-to-l from-red-50 via-red-50/80 to-transparent dark:from-red-950/30 dark:via-slate-950/50"
            : "bg-gradient-to-l from-amber-50 via-amber-50/80 to-transparent dark:from-slate-950 dark:via-slate-950/70"
        )}
      />

      {/* Moving Ticker */}
      <div
        className={cn(
          "relative z-[2] flex w-max items-center",
          "animate-ticker",
          "will-change-transform"
        )}
      >
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
        <TickerContent />
      </div>
    </div>
  );
};

export default HeadlineTicker;
