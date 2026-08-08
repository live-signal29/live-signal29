import { useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ShieldAlert, Zap, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="w-full flex justify-center px-2 py-3">
      
      {/* CYBERPUNK GLASS CARD */}
      <div className={cn(
        "relative w-full max-w-[340px] overflow-hidden rounded-2xl border p-[2px] transition-all duration-500 hover:scale-[1.02]",
        isHighAlert 
          ? "border-red-500/30 bg-gradient-to-br from-red-500/20 via-transparent to-red-500/5 shadow-[0_0_40px_rgba(239,68,68,0.15)]" 
          : "border-blue-500/30 bg-gradient-to-br from-blue-500/20 via-transparent to-blue-500/5 shadow-[0_0_40px_rgba(59,130,246,0.15)]"
      )}>
        
        {/* INNER GLASS BACKGROUND */}
        <div className="relative h-[52px] w-full rounded-2xl bg-[#0a0b14]/90 backdrop-blur-xl flex items-center justify-between px-4 overflow-hidden">
          
          {/* ANIMATED GLOW ORB (Rotating) */}
          <div className={cn(
            "absolute -left-10 -top-10 h-20 w-20 rounded-full blur-2xl animate-spin-slow duration-[8s]",
            isHighAlert ? "bg-red-500/30" : "bg-blue-500/30"
          )} />

          {/* TOP & BOTTOM NEON LINES (Scanline effect) */}
          <div className={cn(
            "absolute left-0 right-0 h-[1px] top-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse",
            isHighAlert ? "via-red-400/60" : "via-blue-400/60"
          )} />
          <div className={cn(
            "absolute left-0 right-0 h-[1px] bottom-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
            isHighAlert ? "via-red-400/40" : "via-blue-400/40"
          )} />

          {/* LEFT: ICON + TEXT */}
          <div className="flex items-center gap-3 relative z-10 flex-1 min-w-0">
            
            {/* DYNAMIC ICON CONTAINER */}
            <div className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-sm",
              isHighAlert 
                ? "border-red-500/50 bg-red-500/10 shadow-red-500/20" 
                : "border-blue-500/50 bg-blue-500/10 shadow-blue-500/20"
            )}>
              {isHighAlert ? (
                <ShieldAlert className="h-4 w-4 text-red-400 animate-pulse" />
              ) : (
                <TrendingUp className="h-4 w-4 text-blue-400" />
              )}
            </div>

            {/* TEXT WITH GLOW */}
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              {/* Animated Sparkle Icon */}
              <Sparkles className={cn(
                "h-3 w-3 animate-pulse",
                isHighAlert ? "text-red-300" : "text-blue-300"
              )} />
              
              <div className="truncate">
                <span className={cn(
                  "text-[13px] font-extrabold tracking-wide",
                  isHighAlert 
                    ? "bg-gradient-to-r from-red-300 to-red-100 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]" 
                    : "bg-gradient-to-r from-blue-300 to-blue-100 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                )}>
                  {headline.text}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: ACTION BUTTON */}
          <div className="relative z-10 shrink-0 ml-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 group-hover:border-white/20 group-hover:shadow-lg cursor-pointer">
              <ArrowRight className="h-3 w-3 text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all duration-300" />
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};

export default HeadlineTicker;
