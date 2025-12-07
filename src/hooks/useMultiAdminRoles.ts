import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AdminRole = "admin" | "signal_manager" | "finance_manager" | "user";

interface UserRole {
  role: AdminRole;
}

export const useMultiAdminRoles = () => {
  const { data: roles, isLoading } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data as UserRole[]).map((r) => r.role);
    },
  });

  const hasRole = (role: AdminRole): boolean => {
    if (!roles) return false;
    return roles.includes(role) || roles.includes("admin"); // Admin has all permissions
  };

  const canManageSignals = (): boolean => {
    return hasRole("admin") || hasRole("signal_manager");
  };

  const canManageFinance = (): boolean => {
    return hasRole("admin") || hasRole("finance_manager");
  };

  const canManageUsers = (): boolean => {
    return hasRole("admin");
  };

  const canViewStats = (): boolean => {
    return hasRole("admin") || hasRole("signal_manager");
  };

  const canViewSecurityLogs = (): boolean => {
    return hasRole("admin");
  };

  const isAdmin = (): boolean => {
    return hasRole("admin");
  };

  return {
    roles: roles || [],
    isLoading,
    hasRole,
    canManageSignals,
    canManageFinance,
    canManageUsers,
    canViewStats,
    canViewSecurityLogs,
    isAdmin,
  };
};
