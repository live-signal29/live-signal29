import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { openExternal } from "@/lib/openExternal";
import { ExternalLink, Sparkles } from "lucide-react";

// The generated Supabase types haven't been regenerated to include this
// view yet (it's a fresh Supabase-side migration), so we cast the client
// to `any` for this call — same pattern used in CopierLeaderboard.tsx.
const db = supabase as any;

interface PromoBanner {
  id: string;
  title: string;
  message: string | null;
  link1_label: string;
  link1_url: string;
  link1_note: string | null;
  link2_label: string;
  link2_url: string;
  link2_note: string | null;
  sort_order: number;
}

/**
 * Weekend broker/app referral banner(s) for the Signal Dashboard & the
 * Account Management (Copy Trading) page.
 *
 * All the "is it the weekend?" logic lives server-side in the
 * `v_active_promo_banners` Supabase view (see `is_weekend_now()`), so this
 * component just renders whatever comes back — nothing here, and returns
 * null the rest of the week. Add/edit/remove banners from the
 * `promo_banners` table; no code change needed to add another one.
 */
export const WeekendPromoBanner = () => {
  const { data: banners } = useQuery({
    queryKey: ["active-promo-banners"],
    queryFn: async () => {
      const { data, error } = await db
        .from("v_active_promo_banners")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as PromoBanner[];
    },
    // Weekend window can flip while the app stays open — check every 5 min.
    refetchInterval: 5 * 60 * 1000,
  });

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-4">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-lg"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <h3 className="text-sm font-bold text-foreground truncate">
              {banner.title}
            </h3>
          </div>

          {banner.message && (
            <p className="text-xs text-muted-foreground mb-3 leading-snug">
              {banner.message}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={banner.link1_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                openExternal(banner.link1_url);
              }}
              className="group flex items-center justify-between gap-2 rounded-xl bg-primary px-3.5 py-2.5 text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">
                  {banner.link1_label}
                </span>
                {banner.link1_note && (
                  <span className="text-[10px] opacity-80 truncate">
                    {banner.link1_note}
                  </span>
                )}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </a>

            <a
              href={banner.link2_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                openExternal(banner.link2_url);
              }}
              className="group flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-background px-3.5 py-2.5 text-foreground shadow-sm transition-transform active:scale-[0.98]"
            >
              <span className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate">
                  {banner.link2_label}
                </span>
                {banner.link2_note && (
                  <span className="text-[10px] text-muted-foreground truncate">
                    {banner.link2_note}
                  </span>
                )}
              </span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};

export default WeekendPromoBanner;
