import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface UserStats {
  total: number;
  new_today: number;
  new_7d: number;
  active_today: number;
  active_24h: number;
  active_7d: number;
  premium: number;
  trial: number;
  expired: number;
}

const ITEMS: { key: keyof UserStats; label: string; tone?: string }[] = [
  { key: "total", label: "Total Users" },
  { key: "new_today", label: "New Today", tone: "text-emerald-600" },
  { key: "new_7d", label: "New (7 days)" },
  { key: "active_today", label: "Active Today", tone: "text-emerald-600" },
  { key: "active_7d", label: "Active (7 days)" },
  { key: "premium", label: "Premium", tone: "text-amber-600" },
  { key: "trial", label: "Free Trial" },
  { key: "expired", label: "Expired" },
];

const UserStatsCards = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { data, error } = await (supabase as any).rpc("admin_user_stats", {
        _tz: tz,
      });
      if (error) throw error;
      setStats(data as UserStats);
    } catch (e) {
      console.error("admin_user_stats failed:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Users Overview</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={load}
          disabled={loading}
          className="h-7 px-2 text-xs"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          <span className="ml-1">Refresh</span>
        </Button>
      </div>

      {error ? (
        <p className="text-xs text-destructive">
          Could not load user counts. Please refresh.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ITEMS.map(({ key, label, tone }) => (
            <Card key={key}>
              <CardContent className="p-3">
                <div className="text-[11px] font-medium text-muted-foreground">
                  {label}
                </div>
                <div className={`text-2xl font-bold ${tone ?? ""}`}>
                  {stats ? stats[key] ?? 0 : "—"}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-2 text-[10px] text-muted-foreground">
        "Active" = signed in or opened the app. Counts for today start from
        your device's midnight.
      </p>
    </div>
  );
};

export default UserStatsCards;
