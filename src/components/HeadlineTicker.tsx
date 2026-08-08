import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Megaphone,
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
        .select(
          "id, text, headline_type, is_active, created_at"
        )
        .eq("is_active", true)
        .order("created_at", {
          ascending: false,
        })
        .limit(1);

      if (error) {
        console.error("Headline fetch error:", error);
        return null;
      }

      return data?.[0]
        ? (data[0] as Headline)
        : null;
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

  const isHighAlert =
    headline.headline_type === "high_alert";

  const words = headline.text
    .trim()
    .split(/\s+/);

  const firstWord = words[0] || "";
  const remainingText = words
    .slice(1)
    .join(" ");

  const TickerContent = () => (
    <div className="flex items-center gap-2 whitespace-nowrap px-5 sm:px-7">
      {/* Icon */}
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center",
          "rounded-full border shadow-sm",

          isHighAlert
            ? [
                "border-red-300",
                "bg-red-100",
                "text-red-600",
                "dark:border-red-500/40",
                "dark:bg-red-500/15",
                "dark:text-red-400",
              ]
            : [
                "border-blue-200",
                "bg-blue-100",
                "text-blue-600",
                "dark:border-blue-500/40",
                "dark:bg-blue-500/15",
                "dark:text-blue-400",
              ]
        )}
      >
        {isHighAlert ? (
          <AlertTriangle
            className="h-3.5 w-3.5"
            strokeWidth={2.6}
          />
        ) : (
          <Megaphone
            className="h-3.5 w-3.5"
            strokeWidth={2.4}
          />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[8px] font-black uppercase",
          "tracking-[0.16em]",

          isHighAlert
            ? "text-red-600 dark:text-red-400"
            : "text-blue-600 dark:text-blue-400"
        )}
      >
        {isHighAlert ? "HIGH ALERT" : "MARKET UPDATE"}
      </span>

      {/* Divider */}
      <span
        className={cn(
          "h-1 w-1 shrink-0 rounded-full",

          isHighAlert
            ? "bg-red-500 dark:bg-red-400 animate-pulse"
            : "bg-blue-500 dark:bg-blue-400"
        )}
      />

      {/* Headline text */}
      <span
        className={cn(
          "text-[11px] sm:text-xs",
          "leading-none tracking-wide",

          isHighAlert
            ? "font-semibold"
            : "font-medium",

          "text-slate-700 dark:text-slate-200"
        )}
      >
        <span
          className={cn(
            "font-extrabold",

            isHighAlert
              ? "text-red-600 dark:text-red-400"
              : "text-blue-600 dark:text-blue-400"
          )}
        >
          {firstWord}
        </span>

        {remainingText && (
          <span className="text-slate-600 dark:text-slate-300">
            {" "}
            {remainingText}
          </span>
        )}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "border-y",
        "py-2",

        // NORMAL
        !isHighAlert && [
          "border-blue-200",
          "bg-blue-50",
          "dark:border-blue-500/20",
          "dark:bg-slate-900/80",
        ],

        // HIGH ALERT
        isHighAlert && [
          "border-red-200",
          "bg-red-50",
          "dark:border-red-500/25",
          "dark:bg-red-950/30",
        ]
      )}
    >
      {/* Top highlight */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 right-0 top-0 h-px",

          isHighAlert
            ? "bg-red-400/40 dark:bg-red-500/30"
            : "bg-blue-400/40 dark:bg-blue-500/30"
        )}
      />

      {/* Bottom highlight */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 right-0 bottom-0 h-px",

          isHighAlert
            ? "bg-red-300/50 dark:bg-red-500/20"
            : "bg-blue-300/50 dark:bg-blue-500/20"
        )}
      />

      {/* Left fade */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10",
          "bg-gradient-to-r",

          isHighAlert
            ? "from-red-50 dark:from-red-950/80"
            : "from-blue-50 dark:from-slate-900"
        )}
      />

      {/* Right fade */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10",
          "bg-gradient-to-l",

          isHighAlert
            ? "from-red-50 dark:from-red-950/80"
            : "from-blue-50 dark:from-slate-900"
        )}
      />

      {/* Moving ticker */}
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
