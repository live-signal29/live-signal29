import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityLog {
  id: string;
  user_id: string | null;
  action_type: string;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  browser: string | null;
  device_type: string | null;
  country: string | null;
  created_at: string;
}

export const useSecurityLogs = (limit = 100) => {
  return useQuery({
    queryKey: ["security-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SecurityLog[];
    },
  });
};

export const useLogSecurityEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      actionType,
      details,
    }: {
      actionType: string;
      details?: Record<string, any>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get browser info
      const userAgent = navigator.userAgent;
      const browser = getBrowserName(userAgent);
      const deviceType = getDeviceType(userAgent);
      
      const { error } = await supabase.from("security_logs").insert({
        user_id: user?.id,
        action_type: actionType,
        details,
        user_agent: userAgent,
        browser,
        device_type: deviceType,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security-logs"] });
    },
  });
};

function getBrowserName(userAgent: string): string {
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";
  return "Unknown";
}

function getDeviceType(userAgent: string): string {
  if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
    if (/iPad/.test(userAgent)) return "Tablet";
    return "Mobile";
  }
  return "Desktop";
}
