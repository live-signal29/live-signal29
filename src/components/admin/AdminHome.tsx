import { useEffect, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* =========================================================
   ADMIN HOME
   Overview page: one box per admin tab with a live count.
   Tap a box to open that tab.
========================================================= */

export interface AdminHomeItem {
  id: string;
  label: string;
  icon: any;
  color: string;
}

interface Props {
  items: AdminHomeItem[];
  onOpen: (id: string) => void;
}

type Source = {
  table: string;
  // what the main number means
  totalLabel: string;
  // optional "needs action" count
  pendingLabel?: string;
  pendingFilter?: (q: any) => any;
};

// Tabs not listed here (performance, analytics, activity) are shown
// as simple "Open" boxes without numbers.
const SOURCES: Record<string, Source> = {
  signals: { table: "signals", totalLabel: "Total signals" },
  ideas: { table: "market_ideas", totalLabel: "Total ideas" },
  headlines: { table: "headlines", totalLabel: "Total news" },
  telegram: {
    table: "telegram_pair_approvals",
    totalLabel: "Total requests",
  },
  users: { table: "profiles", totalLabel: "Total users" },
  accounts: {
    table: "account_management_applications",
    totalLabel: "Applications",
    pendingLabel: "Pending",
    pendingFilter: (q) => q.or("status.eq.pending,status.is.null"),
  },
  copier: {
    table: "mt5_copier_requests",
    totalLabel: "Requests",
    pendingLabel: "Pending",
    pendingFilter: (q) => q.eq("status", "pending"),
  },
  "premium-payments": {
    table: "payment_submissions",
    totalLabel: "Payments",
    pendingLabel: "To approve",
    pendingFilter: (q) => q.eq("status", "pending"),
  },
  licenses: {
    table: "license_orders",
    totalLabel: "Orders",
    pendingLabel: "Pending",
    pendingFilter: (q) => q.eq("status", "pending"),
  },
  "payment-share": {
    table: "client_payment_shares",
    totalLabel: "Shares",
    pendingLabel: "To verify",
    pendingFilter: (q) => q.eq("status", "client_marked_paid"),
  },
  coupons: { table: "coupons", totalLabel: "Coupons" },
  offers: { table: "special_offers", totalLabel: "Offers" },
};

type Counts = { total: number | null; pending: number | null };

const db = supabase as any;

const fetchCounts = async (src: Source): Promise<Counts> => {
  try {
    const totalRes = await db
      .from(src.table)
      .select("id", { count: "exact", head: true });

    let pending: number | null = null;

    if (src.pendingFilter) {
      const pendingRes = await src.pendingFilter(
        db.from(src.table).select("id", { count: "exact", head: true })
      );
      pending = pendingRes.error ? null : pendingRes.count ?? 0;
    }

    return {
      total: totalRes.error ? null : totalRes.count ?? 0,
      pending,
    };
  } catch {
    return { total: null, pending: null };
  }
};

const AdminHome = ({ items, onOpen }: Props) => {
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      const entries = await Promise.all(
        Object.entries(SOURCES).map(async ([id, src]) => {
          const c = await fetchCounts(src);
          return [id, c] as const;
        })
      );

      if (!mounted) return;

      setCounts(Object.fromEntries(entries));
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const totalPending = Object.values(counts).reduce(
    (sum, c) => sum + (c.pending || 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* SUMMARY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">Needs your action</p>

        <div className="mt-1 flex items-center gap-2">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <span
              className={`text-3xl font-bold ${
                totalPending > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {totalPending}
            </span>
          )}

          <span className="text-sm text-slate-500">
            {totalPending > 0 ? "pending items" : "all clear"}
          </span>
        </div>
      </div>

      {/* BOXES */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const src = SOURCES[item.id];
          const c = counts[item.id];

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className="group relative flex min-h-[132px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition active:scale-[0.98] hover:border-slate-300"
            >
              {/* pending badge */}
              {c?.pending ? (
                <span className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {c.pending}
                </span>
              ) : null}

              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100">
                  <Icon className={`h-4 w-4 ${item.color}`} />
                </span>

                <span className="truncate pr-6 text-sm font-semibold text-slate-900">
                  {item.label}
                </span>
              </div>

              <div className="mt-3">
                {src ? (
                  <>
                    <div className="text-2xl font-bold text-slate-900">
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                      ) : c?.total === null || c?.total === undefined ? (
                        "—"
                      ) : (
                        c.total
                      )}
                    </div>

                    <p className="text-[11px] text-slate-500">
                      {src.totalLabel}
                    </p>

                    {src.pendingLabel && !loading && c?.pending != null && (
                      <p
                        className={`mt-0.5 text-[11px] font-medium ${
                          c.pending > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        {src.pendingLabel}: {c.pending}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    Tap to view details
                  </p>
                )}
              </div>

              <ChevronRight className="absolute bottom-3 right-3 h-4 w-4 text-slate-300 transition group-hover:text-slate-500" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AdminHome;
