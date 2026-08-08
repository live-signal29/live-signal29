import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Megaphone } from "lucide-react";
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

      // No active headline is NOT an error
      if (error) {
        console.error(
          "Headline fetch error:",
          error
        );
        return null;
      }

      return data && data.length > 0
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

  // No active headline
  if (!headline) {
    return null;
  }

  const isHighAlert =
    headline.headline_type === "high_alert";

  const words = headline.text
    .trim()
    .split(/\s+/);

  const firstWord = words[0] || "";
  const remainingText = words
    .slice(1)
    .join(" ");

  const Content = () => (
    <div className="flex items-center gap-2.5 whitespace-nowrap px-6">
      {/* Icon */}
      <div
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center",
          "rounded-full border",
          isHighAlert
            ? "border-red-500/30 bg-red-500/10"
            : "border-primary/25 bg-primary/10"
        )}
      >
        {isHighAlert ? (
          <AlertTriangle
            className="h-3.5 w-3.5 text-red-500 dark:text-red-400"
            strokeWidth={2.5}
          />
        ) : (
          <Megaphone
            className="h-3.5 w-3.5 text-primary"
            strokeWidth={2.3}
          />
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          "text-[8px] font-extrabold uppercase",
          "tracking-[0.15em]",
          isHighAlert
            ? "text-red-500 dark:text-red-400"
            : "text-primary"
        )}
      >
        {isHighAlert ? "Alert" : "Update"}
      </span>

      {/* Separator */}
      <span
        className={cn(
          "h-1 w-1 rounded-full shrink-0",
          isHighAlert
            ? "bg-red-500 dark:bg-red-400 animate-pulse"
            : "bg-primary"
        )}
      />

      {/* Text */}
      <span
        className={cn(
          "text-[11px] sm:text-xs",
          "leading-none tracking-wide",
          isHighAlert
            ? "font-semibold"
            : "font-medium"
        )}
      >
        <span
          className={cn(
            "font-extrabold",
            isHighAlert
              ? "text-red-500 dark:text-red-400"
              : "text-primary"
          )}
        >
          {firstWord}
        </span>

        {remainingText && (
          <span className="text-foreground/75">
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
        "border-y py-1.5",
        "backdrop-blur-xl",

        isHighAlert
          ? [
              "border-red-500/20",
              "bg-red-500/[0.04]",
              "dark:border-red-400/20",
              "dark:bg-red-400/[0.05]",
            ]
          : [
              "border-border/50",
              "bg-muted/30",
              "dark:bg-muted/20",
            ]
      )}
    >
      {/* Left fade */}
      <div
        className="
          pointer-events-none
          absolute left-0 top-0 bottom-0
          z-10 w-8
          bg-gradient-to-r
          from-background
          to-transparent
        "
      />

      {/* Right fade */}
      <div
        className="
          pointer-events-none
          absolute right-0 top-0 bottom-0
          z-10 w-8
          bg-gradient-to-l
          from-background
          to-transparent
        "
      />

      {/* Moving ticker */}
      <div className="flex items-center animate-ticker">
        <Content />
        <Content />
        <Content />
        <Content />
      </div>
    </div>
  );
};

export default HeadlineTicker;
