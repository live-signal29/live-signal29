import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Streak {
  current_streak: number;
  longest_streak: number;
  last_login_date: string;
  total_rewards_granted: number;
}

export const useLoginStreak = () => {
  const [streak, setStreak] = useState<Streak | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;

      // Record today's login (idempotent)
      const { data: rpcData } = await (supabase.rpc as any)("record_daily_login");
      if (rpcData?.reward_granted) {
        toast.success("🎁 7-day streak! +1 bonus premium day added!");
      }

      const { data } = await supabase
        .from("login_streaks")
        .select("*")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!cancelled && data) setStreak(data as Streak);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return streak;
};
