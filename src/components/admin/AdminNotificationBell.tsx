import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CreditCard, BriefcaseBusiness, Zap, Wallet, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* =========================================================
   ADMIN NOTIFICATION BELL
   - Red badge = NEW items you have not seen yet.
   - Opening the bell, or opening that item's tab, marks it seen
     and the badge clears.
   - Inside the bell every row still shows how many are pending,
     so nothing gets lost.
   Refreshes every 30s and when you come back to the app.
========================================================= */

const db = supabase as any;

type Key = "payments" | "accounts" | "copier" | "shares" | "licenses";

const SOURCES: {
  key: Key;
  tab: string;
  label: string;
  icon: any;
  table: string;
  filter: (q: any) => any;
  timeCol: string;
}[] = [
  { key: "payments", tab: "premium-payments", label: "Premium payments to approve", icon: CreditCard, table: "payment_submissions", filter: (q) => q.eq("status", "pending"), timeCol: "created_at" },
  { key: "accounts", tab: "accounts", label: "New account applications", icon: BriefcaseBusiness, table: "account_management_applications", filter: (q) => q.or("status.eq.pending,status.is.null"), timeCol: "created_at" },
  { key: "copier", tab: "copier", label: "MT5 copier requests", icon: Zap, table: "mt5_copier_requests", filter: (q) => q.eq("status", "pending"), timeCol: "created_at" },
  { key: "licenses", tab: "licenses", label: "Chinese Bot licenses to approve", icon: KeyRound, table: "license_orders", filter: (q) => q.eq("status", "pending"), timeCol: "created_at" },
  { key: "shares", tab: "payment-share", label: "Client payments to verify", icon: Wallet, table: "client_payment_shares", filter: (q) => q.eq("status", "client_marked_paid"), timeCol: "updated_at" },
];

type Stat = { pending: number; fresh: number; latest: string | null };
const EMPTY: Record<Key, Stat> = {
  payments: { pending: 0, fresh: 0, latest: null },
  accounts: { pending: 0, fresh: 0, latest: null },
  copier: { pending: 0, fresh: 0, latest: null },
  shares: { pending: 0, fresh: 0, latest: null },
  licenses: { pending: 0, fresh: 0, latest: null },
};

const SEEN_PREFIX = "admin_bell_seen_";
const getSeen = (k: Key): string => {
  try {
    return localStorage.getItem(SEEN_PREFIX + k) || "";
  } catch {
    return "";
  }
};
const setSeen = (k: Key, v: string) => {
  try {
    localStorage.setItem(SEEN_PREFIX + k, v);
  } catch {
    /* storage blocked — badge just won't persist */
  }
};

const AdminNotificationBell = ({
  onNavigate,
  activeTab,
}: {
  onNavigate: (tab: string) => void;
  activeTab?: string;
}) => {
  const [stats, setStats] = useState<Record<Key, Stat>>(EMPTY);
  // What to highlight inside the popover for this open (snapshot before clearing).
  const [snapshot, setSnapshot] = useState<Record<Key, number>>({ payments: 0, accounts: 0, copier: 0, shares: 0, licenses: 0 });
  const [open, setOpen] = useState(false);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const refresh = useCallback(async () => {
    const next: Record<Key, Stat> = { ...EMPTY };
    await Promise.all(
      SOURCES.map(async (s) => {
        try {
          const { data } = await s.filter(db.from(s.table).select(`id, ${s.timeCol}`)).limit(500);
          const rows: any[] = data || [];
          const seen = getSeen(s.key);
          let latest: string | null = null;
          let fresh = 0;
          rows.forEach((r) => {
            const t: string = r[s.timeCol];
            if (!latest || t > latest) latest = t;
            if (!seen || t > seen) fresh += 1;
          });
          next[s.key] = { pending: rows.length, fresh, latest };
        } catch {
          next[s.key] = { pending: 0, fresh: 0, latest: null };
        }
      })
    );
    setStats(next);
    return next;
  }, []);

  const markSeen = useCallback((keys: Key[], from: Record<Key, Stat>) => {
    const nowIso = new Date().toISOString();
    keys.forEach((k) => setSeen(k, from[k].latest || nowIso));
    setStats((prev) => {
      const copy = { ...prev };
      keys.forEach((k) => (copy[k] = { ...copy[k], fresh: 0 }));
      return copy;
    });
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // Opening an item's tab (from the bell or the normal menu) counts as seen.
  useEffect(() => {
    const src = SOURCES.find((s) => s.tab === activeTab);
    if (!src) return;
    refresh().then((fresh) => markSeen([src.key], fresh));
  }, [activeTab, refresh, markSeen]);

  const handleOpenChange = async (o: boolean) => {
    setOpen(o);
    if (!o) return;
    const fresh = await refresh();
    setSnapshot({
      payments: fresh.payments.fresh,
      accounts: fresh.accounts.fresh,
      copier: fresh.copier.fresh,
      shares: fresh.shares.fresh,
      licenses: fresh.licenses.fresh,
    });
    // Opening the bell = you have seen everything in it.
    markSeen(["payments", "accounts", "copier", "shares", "licenses"], fresh);
  };

  const unread = SOURCES.reduce((n, s) => n + stats[s.key].fresh, 0);
  const rows = SOURCES.filter((s) => stats[s.key].pending > 0);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 pb-2 text-sm font-semibold">Needs your attention</p>
        {rows.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">All caught up 🎉</p>
        ) : (
          rows.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                onNavigate(s.tab);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
            >
              <s.icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="flex-1 text-sm">
                {s.label}
                {snapshot[s.key] > 0 && (
                  <span className="ml-1 rounded bg-red-100 px-1 text-[10px] font-bold text-red-600">
                    {snapshot[s.key]} new
                  </span>
                )}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">{stats[s.key].pending}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationBell;
