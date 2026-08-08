import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, ShieldAlert, ArrowRight } from "lucide-react";
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
        () => refetch()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [refetch]);

  if (!headline) return null;

  const isHighAlert = headline.headline_type === "high_alert";

  return (
    <div className="w-full flex justify-center px-3 pt-2 pb-3">
      
      {/* ============= PREMIUM FLOATING GLASS CARD ============= */}
      <div className="group relative w-full max-w-[360px] rounded-2xl bg-gradient-to-br from-white/90 to-white/70 dark:from-[#16182b]/90 dark:to-[#101221]/80 border border-black/5 dark:border-white/5 shadow-xl shadow-black/5 dark:shadow-black/30 backdrop-blur-xl transition-all duration-500 hover:shadow-2xl hover:shadow-black/10 dark:hover:shadow-black/50 hover:-translate-y-0.5">
        
        {/* ANIMATED TOP GLOW STRIP */}
        <div className={cn(
          "absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-all duration-700 group-hover:via-primary group-hover:scale-x-110",
          isHighAlert && "from-transparent via-destructive/60 to-transparent group-hover:via-destructive"
        )} />

        {/* INNER CONTENT */}
        <div className="relative flex items-center gap-4 p-4">
          
          {/* PREMIUM ICON BADGE */}
          <div className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-all duration-300 group-hover:shadow-md",
            isHighAlert 
              ? "border-destructive/20 bg-destructive/10 dark:bg-destructive/20 group-hover:border-destructive/40" 
              : "border-primary/20 bg-primary/10 dark:bg-primary/20 group-hover:border-primary/40"
          )}>
            {isHighAlert ? (
              <ShieldAlert className="h-5 w-5 text-destructive dark:text-destructive/80" />
            ) : (
              <TrendingUp className="h-5 w-5 text-primary dark:text-primary/80" />
            )}
          </div>

          {/* TEXT CONTENT */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* LABEL */}
            <div className="flex items-center gap-2 mb-0.5">
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                isHighAlert ? "text-destructive/70 dark:text-destructive/60" : "text-primary/70 dark:text-primary/60"
              )}>
                {isHighAlert ? "🚨 Alert" : "📊 Market"}
              </span>
              <span className="h-1 w-1 rounded-full bg-current opacity-40" />
              <span className="text-[9px] text-muted-foreground/50">Now</span>
            </div>

            {/* HEADLINE TEXT */}
            <h3 className="text-[15px] font-bold text-foreground leading-snug line-clamp-2 tracking-tight">
              {headline.text}
            </h3>
          </div>

          {/* RIGHT ACTION BUTTON (Arrow) */}
          <div className="shrink-0 ml-auto">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border/60 bg-background/50 dark:bg-background/10 text-muted-foreground/50 transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:shadow-md group-hover:scale-105">
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadlineTicker;
