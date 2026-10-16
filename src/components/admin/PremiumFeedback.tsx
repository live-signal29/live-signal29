import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/* =========================================================
   PREMIUM FEEDBACK
   Shows the one-tap "why not Premium?" answers users give
   in the Trial Expired popup (table: premium_feedback).
========================================================= */

const db = supabase as any;

const REASONS: Record<string, { label: string; color: string }> = {
  too_expensive: { label: "💸 Too expensive", color: "bg-red-500" },
  dont_trust: { label: "🤔 Not sure about signals yet", color: "bg-amber-500" },
  not_needed: { label: "🙅 Don't need it", color: "bg-slate-500" },
  need_features: { label: "🧩 Missing features", color: "bg-violet-500" },
  just_looking: { label: "👀 Just looking", color: "bg-sky-500" },
  other: { label: "✍️ Other", color: "bg-gray-400" },
};

type Row = {
  id: string;
  user_id: string;
  reason: string;
  note: string | null;
  created_at: string;
  email?: string | null;
  full_name?: string | null;
};

export default function PremiumFeedback() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await db
      .from("premium_feedback")
      .select("id, user_id, reason, note, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);
    const list: Row[] = data || [];
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    const map = new Map<string, any>();
    for (let i = 0; i < ids.length; i += 100) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, email, full_name")
        .in("id", ids.slice(i, i + 100));
      (profiles || []).forEach((p: any) => map.set(p.id, p));
    }
    setRows(
      list.map((r) => ({
        ...r,
        email: map.get(r.user_id)?.email ?? null,
        full_name: map.get(r.user_id)?.full_name ?? null,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    rows.forEach((r) => (c[r.reason] = (c[r.reason] || 0) + 1));
    return c;
  }, [rows]);

  const shown = filter === "all" ? rows : rows.filter((r) => r.reason === filter);
  const total = rows.length || 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Why users don't upgrade ({rows.length})</h2>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* summary bars - tap one to filter the list */}
      <div className="space-y-2">
        {Object.entries(REASONS).map(([key, r]) => {
          const n = counts[key] || 0;
          if (n === 0 && key === "other") return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? "all" : key)}
              className={`w-full text-left rounded-lg border p-3 ${filter === key ? "border-primary" : ""}`}
            >
              <div className="flex justify-between text-sm font-medium">
                <span>{r.label}</span>
                <span>
                  {n} ({Math.round((n / total) * 100)}%)
                </span>
              </div>
              <div className="mt-2 h-2 rounded bg-muted overflow-hidden">
                <div className={`h-full ${r.color}`} style={{ width: `${(n / total) * 100}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      {filter !== "all" && (
        <button className="text-sm underline" onClick={() => setFilter("all")}>
          Clear filter
        </button>
      )}

      {/* who said what */}
      <div className="space-y-2">
        {!loading && shown.length === 0 && (
          <p className="text-sm text-muted-foreground">No answers yet.</p>
        )}
        {shown.map((r) => (
          <div key={r.id} className="rounded-lg border p-3">
            <div className="flex justify-between gap-2 text-sm">
              <span className="font-medium break-all">{r.email || r.full_name || r.user_id.slice(0, 8)}</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="text-sm mt-1">{(REASONS[r.reason] || REASONS.other).label}</div>
            {r.note && <div className="text-xs text-muted-foreground mt-1">{r.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
