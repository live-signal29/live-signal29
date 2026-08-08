import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, Megaphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface Headline {
  id: string;
  text: string;
  headline_type: "normal" | "high_alert";
  is_active: boolean;
  created_at: string;
}

// Function to render headline text with first word in specific color
const renderHeadlineText = (text: string, isHighAlert: boolean) => {
  const words = text.split(" ");
  if (words.length === 0) return null;
  
  const firstWord = words[0];
  const restOfText = words.slice(1).join(" ");
  
  return (
    <span className={cn("text-[13px] tracking-wide", isHighAlert && "font-bold")}>
      <span className={cn(
        "font-extrabold mr-1",
        isHighAlert 
          ? "bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" 
          : "text-primary"
      )}>
        {firstWord}
      </span>
      <span className="text-slate-300/90">{restOfText}</span>
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

  const renderTickerItem = useCallback((isHighAlert: boolean, text: string) => (
    <div className="flex items-center gap-3 whitespace-nowrap px-6 shrink-0 h-full">
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-lg",
        isHighAlert 
          ? "border-red-500/40 bg-red-500/10 shadow-red-500/20" 
          : "border-blue-500/30 bg-blue-500/10 shadow-blue-500/20"
      )}>
        {isHighAlert ? (
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 animate-pulse" />
        ) : (
          <Zap className="h-3.5 w-3.5 text-blue-400" />
        )}
      </div>
      {renderHeadlineText(text, isHighAlert)}
    </div>
  ), []);

  if (!headline) return null;

  const isHighAlert = headline.headline_type === "high_alert";

  return (
    <div
      className={cn(
        "w-full overflow-hidden py-3 relative",
        isHighAlert
          ? "bg-gradient-to-r from-red-950/30 via-red-900/10 to-red-950/30 border-y border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.05)]"
          : "bg-[#0e101c]/80 border-y border-white/5 backdrop-blur-sm shadow-[inset_0_0_20px_rgba(59,130,246,0.02)]"
      )}
    >
      {/* Glowing line at top edge */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[1px]",
        isHighAlert 
          ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent" 
          : "bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"
      )} />

      {/* Marquee Container */}
      <div className="flex items-center overflow-hidden relative h-7">
        
        {/* CSS Keyframes for the ticker animation */}
        <style>{`
          @keyframes ticker {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-33.33%); }
          }
          .animate-ticker-custom {
            animation: ticker 30s linear infinite;
            display: flex;
            width: fit-content;
          }
          .animate-ticker-custom:hover {
            animation-play-state: paused;
          }
        `}</style>

        <div className="animate-ticker-custom">
          {/* We render 3 items to ensure a seamless continuous loop */}
          {renderTickerItem(isHighAlert, headline.text)}
          {renderTickerItem(isHighAlert, headline.text)}
          {renderTickerItem(isHighAlert, headline.text)}
        </div>
      </div>
    </div>
  );
};

export default HeadlineTicker;
