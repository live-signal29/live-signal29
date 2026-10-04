import { useCallback, useEffect, useState } from "react";
import { Bell, CreditCard, BriefcaseBusiness, Zap, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/* =========================================================
   ADMIN NOTIFICATION BELL
   Shows what is waiting for the admin, with a count per item.
   Tap a row -> jumps to that tab. Refreshes every 30s and
   whenever the admin comes back to the app.
========================================================= */

const db = supabase as any;

type Counts = {
  payments: number;
  accounts: number;
  copier: number;
  shares: number;
};

const EMPTY: Counts = { payments: 0, accounts: 0, copier: 0, shares: 0 };

const countOf = async (table: string, apply: (q: any) => any) => {
  try {
    const { count } = await apply(db.from(table).select("id", { count: "exact", head: true }));
    return count || 0;
  } catch {
    return 0;
  }
};

const AdminNotificationBell = ({ onNavigate }: { onNavigate: (tab: string) => void }) => {
  const [counts, setCounts] = useState<Counts>(EMPTY);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [payments, accounts, copier, shares] = await Promise.all([
      countOf("payment_submissions", (q) => q.eq("status", "pending")),
      countOf("account_management_applications", (q) => q.or("status.eq.pending,status.is.null")),
      countOf("mt5_copier_requests", (q) => q.eq("status", "pending")),
      countOf("client_payment_shares", (q) => q.eq("status", "client_marked_paid")),
    ]);
    setCounts({ payments, accounts, copier, shares });
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

  const total = counts.payments + counts.accounts + counts.copier + counts.shares;

  const items = [
    { key: "payments", tab: "premium-payments", label: "Premium payments to approve", icon: CreditCard, n: counts.payments },
    { key: "accounts", tab: "accounts", label: "New account applications", icon: BriefcaseBusiness, n: counts.accounts },
    { key: "copier", tab: "copier", label: "MT5 copier requests", icon: Zap, n: counts.copier },
    { key: "shares", tab: "payment-share", label: "Client payments to verify", icon: Wallet, n: counts.shares },
  ].filter((i) => i.n > 0);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) refresh();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-2 pb-2 text-sm font-semibold">Needs your attention</p>
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-sm text-muted-foreground">All caught up 🎉</p>
        ) : (
          items.map((i) => (
            <button
              key={i.key}
              onClick={() => {
                onNavigate(i.tab);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
            >
              <i.icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="flex-1 text-sm">{i.label}</span>
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">{i.n}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
};

export default AdminNotificationBell;
