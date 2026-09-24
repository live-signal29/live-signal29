import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Headline {
  id: string;
  text: string;
  headline_type: string;
}

// Scrolling headline bar controlled from Admin → News → Headlines / Ticker
const HeadlineTicker = () => {
  const queryClient = useQueryClient();

  const { data: headline } = useQuery({
    queryKey: ["active-headline"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("headlines")
        .select("id, text, headline_type")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as Headline | null) ?? null;
    },
    staleTime: 60_000,
  });

  // Live updates when admin adds / edits / toggles a headline
  useEffect(() => {
    const channel = supabase
      .channel("headline-ticker")
      .on("postgres_changes", { event: "*", schema: "public", table: "headlines" }, () => {
        queryClient.invalidateQueries({ queryKey: ["active-headline"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const text = headline?.text?.trim();
  if (!text) return null;

  const alert = headline?.headline_type === "high_alert";
  const Icon = alert ? AlertTriangle : Megaphone;
  // longer text scrolls a bit longer so the speed feels the same
  const duration = Math.max(14, Math.round(text.length * 0.28));

  return (
    <div
      role="status"
      className={
        "w-full overflow-hidden border-b " +
        (alert
          ? "bg-red-600 text-white border-red-700"
          : "bg-sky-600 text-white border-sky-700")
      }
    >
      <div className="flex items-center">
        <div className={"shrink-0 flex items-center gap-1.5 px-3 py-1.5 z-10 " + (alert ? "bg-red-700" : "bg-sky-700")}>
          <Icon className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-wide">{alert ? "Alert" : "News"}</span>
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="headline-marquee flex w-max" style={{ animationDuration: `${duration}s` }}>
            {[0, 1].map((i) => (
              <span key={i} className="whitespace-nowrap text-sm font-medium px-8 py-1.5" aria-hidden={i === 1}>
                {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeadlineTicker;
