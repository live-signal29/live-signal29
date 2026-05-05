import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ReferralRow {
  id: string;
  referred_user_id: string;
  reward_days_granted: number;
  reward_applied: boolean;
  created_at: string;
  referred_email?: string | null;
}

export const useMyReferralCode = () => {
  return useQuery({
    queryKey: ["my-referral-code"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.referral_code as string) || null;
    },
  });
};

export const useMyReferrals = () => {
  return useQuery({
    queryKey: ["my-referrals"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referred_user_id, reward_days_granted, reward_applied, created_at")
        .eq("referrer_id", auth.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as ReferralRow[]) || [];
    },
  });
};
