import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  Megaphone,
  Radio,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Headline {
  id: string;
  text: string;
  headline_type: "normal" | "high_alert";
  is_active: boolean;
  created_at: string;
}

// Render headline with the first word highlighted
const renderHeadlineText = (
  text: string,
  isHighAlert: boolean
) => {
  const words = text.trim().split(/\s+/);

  if (!words.length) return null;

  const firstWord = words[0];
  const restOfText = words.slice(1).join(" ");

  return (
    <span
      className={cn(
        "text-[11px] sm:text-xs md:text-sm",
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

      {restOfText && (
        <span className="text-foreground/75 dark:text-foreground/70">
          {" "}
          {restOfText}
        </span>
      )}
    </span>
  );
};

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

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as Headline | null;
    },
    staleTime: 30000,
  });

  // Realtime headline updates
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

  const isHighAlert =
    headline.headline_type === "high_alert";

  /*
   * Keep the same content in multiple copies so the
   * ticker remains continuously moving.
   */
  const HeadlineContent = () => (
    <div className="flex items-center gap-2.5 whitespace-nowrap px-5 sm:px-7">
      {/* Status indicator */}
      <div
        className={cn(
          "relative flex h-6 w-6 shrink-0 items-center justify-center",
          "rounded-full border",
          isHighAlert
            ? "border-red-500/25 bg-red-500/10 dark:border-red-400/25 dark:bg-red-400/10"
            : "border-primary/20 bg-primary/10 dark:border-primary/25 dark:bg-primary/10"
        )}
      >
        {isHighAlert ? (
          <>
            <span className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
            <AlertTriangle
              className="relative z-[1] h-3.5 w-3.5 text-red-500 dark:text-red-400"
              strokeWidth={2.5}
            />
          </>
        ) : (
          <Megaphone
            className="h-3.5 w-3.5 text-primary"
            strokeWidth={2.3}
          />
        )}
      </div>

      {/* LIVE / UPDATE label */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span
          className={cn(
            "text-[7px] sm:text-[8px]",
            "font-black uppercase tracking-[0.16em]",
            isHighAlert
              ? "text-red-500 dark:text-red-400"
              : "text-primary"
          )}
        >
          {isHighAlert ? "Alert" : "Update"}
        </span>

        <span
          className={cn(
            "h-1 w-1 rounded-full",
            isHighAlert
              ? "bg-red-500 dark:bg-red-400 animate-pulse"
              : "bg-primary"
          )}
        />
      </div>

      {/* Headline */}
      {renderHeadlineText(headline.text, isHighAlert)}
    </div>
  );

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        "border-y",
        "py-1.5 sm:py-2",
        "backdrop-blur-xl",

        isHighAlert
          ? [
              "border-red-500/15",
              "bg-red-500/[0.035]",
              "dark:border-red-400/15",
              "dark:bg-red-400/[0.035]",
            ]
          : [
              "border-border/50",
              "bg-background/70",
              "dark:bg-background/45",
            ]
      )}
    >
      {/* Soft premium glow */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          "opacity-70 dark:opacity-50",
          isHighAlert
            ? "bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.10),transparent_55%)]"
            : "bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08),transparent_55%)]"
        )}
      />

      {/* Left edge fade */}
      <div
        className={cn(
          "pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-10 sm:w-16",
          "bg-gradient-to-r",
          "from-background via-background/70 to-transparent",
          "dark:from-background dark:via-background/60"
        )}
      />

      {/* Right edge fade */}
      <div
        className={cn(
          "pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-10 sm:w-16",
          "bg-gradient-to-l",
          "from-background via-background/70 to-transparent",
          "dark:from-background dark:via-background/60"
        )}
      />

      {/* Small decorative live indicator */}
      <div className="pointer-events-none absolute left-1.5 top-1/2 z-20 -translate-y-1/2">
        <div
          className={cn(
            "flex h-3 w-3 items-center justify-center rounded-full",
            isHighAlert
              ? "bg-red-500/10"
              : "bg-primary/10"
          )}
        >
          {isHighAlert ? (
            <Radio
              className="h-2 w-2 text-red-500 dark:text-red-400 animate-pulse"
            />
          ) : (
            <Sparkles
              className="h-2 w-2 text-primary"
            />
          )}
        </div>
      </div>

      {/* Ticker */}
      <div className="relative z-[2] flex items-center animate-ticker">
        <HeadlineContent />
        <HeadlineContent />
        <HeadlineContent />
        <HeadlineContent />
      </div>
    </div>
  );
};

export default HeadlineTicker;
