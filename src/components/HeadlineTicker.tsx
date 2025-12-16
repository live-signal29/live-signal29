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

// Function to render headline text with first word in red
const renderHeadlineText = (text: string, isHighAlert: boolean) => {
  const words = text.split(" ");
  if (words.length === 0) return null;
  
  const firstWord = words[0];
  const restOfText = words.slice(1).join(" ");
  
  return (
    <span className={cn("text-sm", isHighAlert && "font-semibold")}>
      <span className="text-destructive font-bold">{firstWord}</span>
      {restOfText && <span className="text-foreground/80"> {restOfText}</span>}
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

  const HeadlineContent = () => (
    <div className="flex items-center gap-3 whitespace-nowrap px-6">
      {isHighAlert ? (
        <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 animate-pulse" />
      ) : (
        <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
      )}
      {renderHeadlineText(headline.text, isHighAlert)}
    </div>
  );

  return (
    <div
      className={cn(
        "w-full overflow-hidden py-2.5",
        isHighAlert
          ? "bg-destructive/5 dark:bg-destructive/10 border-y border-destructive/20"
          : "bg-muted/50 dark:bg-muted/30 border-y border-border/50"
      )}
    >
      <div className="flex items-center animate-ticker">
        <HeadlineContent />
        <HeadlineContent />
        <HeadlineContent />
      </div>
    </div>
  );
};

export default HeadlineTicker;
