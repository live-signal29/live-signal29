import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Search,
  User,
  BriefcaseBusiness,
  Zap,
  Wallet,
  Loader2,
} from "lucide-react";

const db = supabase as any;

interface ResultItem {
  tab: string;
  tabLabel: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  term: string;
}

interface Props {
  onNavigate: (tab: string, term: string) => void;
}

const AdminGlobalSearch = ({ onNavigate }: Props) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();

    setSelectedIndex(-1);

    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const like = `%${q}%`;

        const [profiles, accounts, copiers, shares] = await Promise.all([
          db
            .from("profiles")
            .select("id, email, full_name")
            .or(`email.ilike.${like},full_name.ilike.${like}`)
            .limit(5),

          db
            .from("account_management_applications")
            .select("id, name, email, telegram_username")
            .or(
              `name.ilike.${like},email.ilike.${like},telegram_username.ilike.${like}`
            )
            .limit(5),

          db
            .from("mt5_copier_requests")
            .select("id, name, contact_number")
            .or(`name.ilike.${like},contact_number.ilike.${like}`)
            .limit(5),

          db
            .from("client_payment_shares")
            .select("id, client_name, status")
            .ilike("client_name", like)
            .limit(5),
        ]);

        const items: ResultItem[] = [];

        (profiles.data || []).forEach((p: any) => {
          items.push({
            tab: "users",
            tabLabel: "Users",
            icon: (
              <User className="h-3.5 w-3.5 text-primary shrink-0" />
            ),
            title: p.full_name || p.email,
            subtitle: p.email,
            term: p.email,
          });
        });

        (accounts.data || []).forEach((a: any) => {
          items.push({
            tab: "accounts",
            tabLabel: "Account Management",
            icon: (
              <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
            ),
            title: a.name,
            subtitle: a.email || a.telegram_username || "",
            term: a.name,
          });
        });

        (copiers.data || []).forEach((c: any) => {
          items.push({
            tab: "copier",
            tabLabel: "Copy Management",
            icon: (
              <Zap className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
            ),
            title: c.name,
            subtitle: c.contact_number || "",
            term: c.name,
          });
        });

        (shares.data || []).forEach((s: any) => {
          items.push({
            tab: "payment-share",
            tabLabel: "Payments",
            icon: (
              <Wallet className="h-3.5 w-3.5 text-green-600 shrink-0" />
            ),
            title: s.client_name,
            subtitle: s.status,
            term: s.client_name,
          });
        });

        setResults(items);
      } catch (e) {
        console.error("Global search failed:", e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleNavigate = (item: ResultItem) => {
    onNavigate(item.tab, item.term);
    setOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // ESC = close popover, but keep input focused
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (!open || results.length === 0) return;

    // Arrow Down
    if (e.key === "ArrowDown") {
      e.preventDefault();

      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0
      );

      return;
    }

    // Arrow Up
    if (e.key === "ArrowUp") {
      e.preventDefault();

      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1
      );

      return;
    }

    // Enter
    if (e.key === "Enter") {
      e.preventDefault();

      if (selectedIndex >= 0 && results[selectedIndex]) {
        handleNavigate(results[selectedIndex]);
      }

      return;
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value);

        // When Radix closes/reopens, restore input focus.
        if (value) {
          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }
      }}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search users, clients, requests..."
            className="pl-8"
            autoComplete="off"
          />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          // IMPORTANT:
          // Radix normally moves focus from the Input
          // into PopoverContent. Prevent that behavior.
          e.preventDefault();

          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }}
        onCloseAutoFocus={(e) => {
          // Don't let Radix unexpectedly move focus elsewhere.
          e.preventDefault();

          requestAnimationFrame(() => {
            inputRef.current?.focus();
          });
        }}
      >
        <div className="max-h-80 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading &&
            query.trim().length >= 2 &&
            results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No matches for "{query}"
              </p>
            )}

          {!loading &&
            results.map((r, i) => (
              <button
                key={`${r.tab}-${r.term}-${i}`}
                type="button"
                onMouseDown={(e) => {
                  // Prevent mouse click from stealing focus
                  // from the search input before onClick runs.
                  e.preventDefault();
                }}
                onClick={() => handleNavigate(r)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  selectedIndex === i
                    ? "bg-muted"
                    : "hover:bg-muted/60"
                }`}
              >
                {r.icon}

                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">
                    {r.title}
                  </span>

                  <span className="block truncate text-xs text-muted-foreground">
                    {r.subtitle}
                  </span>
                </span>

                <span className="text-[10px] text-muted-foreground shrink-0">
                  {r.tabLabel}
                </span>
              </button>
            ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AdminGlobalSearch;
