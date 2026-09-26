import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Loader2,
  Link2,
  Send,
  CheckCircle2,
  Copy,
  Wallet,
  Zap,
  BriefcaseBusiness,
  Settings,
  Search,
  ChevronsUpDown,
  Check,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

const db = supabase as any;

// Set this to your bot's @username (public info, safe to hardcode) so the
// admin can copy a working https://t.me/<bot>?start=<token> link.
const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || "";

type SourceType = "copier" | "account_management";

interface PaymentAddress {
  id: string;
  label: string;
  address: string;
}

interface ClientOption {
  source_type: SourceType;
  source_id: string;
  name: string;
  contact: string | null;
  telegram_username: string | null;
  telegram_chat_id: number | null;
}

// A small collapsible wrapper so every section on this page can be
// hidden/shown by the admin without losing its state.
const SectionCard = ({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}
            </CardTitle>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

interface PaymentShare {
  id: string;
  source_type: SourceType;
  source_id: string;
  client_name: string | null;
  client_contact: string | null;
  telegram_username: string | null;
  telegram_chat_id: number | null;
  link_token: string;
  profit_amount: number | null;
  share_percentage: number | null;
  share_amount: number | null;
  status: string;
  payment_proof: string | null;
  reminder_count: number;
  created_at: string;
  updated_at: string;
}

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-slate-500/10 text-slate-500" },
  linked: { label: "Linked", className: "bg-blue-500/10 text-blue-500" },
  payment_requested: { label: "Payment Requested", className: "bg-amber-500/10 text-amber-500" },
  reminder_pending: { label: "Waiting (Reminders On)", className: "bg-orange-500/10 text-orange-500" },
  awaiting_proof: { label: "Awaiting Proof", className: "bg-purple-500/10 text-purple-500" },
  client_marked_paid: { label: "Proof Received", className: "bg-purple-500/10 text-purple-500" },
  verified: { label: "Verified", className: "bg-emerald-500/10 text-emerald-500" },
  continue_weekly: { label: "Wants Weekly Growth", className: "bg-cyan-500/10 text-cyan-500" },
  support_requested: { label: "Needs Support", className: "bg-red-500/10 text-red-500" },
};

const PaymentShareManagement = ({ initialSearch }: { initialSearch?: string } = {}) => {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [profitInput, setProfitInput] = useState<string>("");
  const [shareInput, setShareInput] = useState<string>("");
  const [addresses, setAddresses] = useState<PaymentAddress[]>([]);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [adminContactLink, setAdminContactLink] = useState<string>("");
  const [clientComboOpen, setClientComboOpen] = useState(false);
  const [listSearch, setListSearch] = useState("");

  useEffect(() => {
    if (initialSearch) setListSearch(initialSearch);
  }, [initialSearch]);

  // ---- Global settings (payment address + admin contact link) ----
  const { data: settings } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("payment_settings").select("*").eq("id", "default").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      const list: PaymentAddress[] = Array.isArray(settings.payment_addresses)
        ? settings.payment_addresses
        : [];
      setAddresses(list);
      setAdminContactLink(settings.admin_contact_link || "");
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (nextAddresses: PaymentAddress[]) => {
      const cleaned = nextAddresses.filter((a) => a.address.trim() !== "");
      const { error } = await db.from("payment_settings").upsert({
        id: "default",
        // Keep the legacy single field pointing at the first address so
        // anything on the bot side still reading payment_address keeps working.
        payment_address: cleaned[0]?.address || "",
        payment_addresses: cleaned,
        admin_contact_link: adminContactLink,
      });
      if (error) throw error;
      return cleaned;
    },
    onSuccess: (cleaned) => {
      setAddresses(cleaned);
      queryClient.invalidateQueries({ queryKey: ["payment-settings"] });
      toast.success("Settings saved");
    },
    onError: (err: any) => toast.error("Save failed", { description: err?.message }),
  });

  const addAddress = () => {
    const id = crypto.randomUUID();
    setAddresses((prev) => [...prev, { id, label: "", address: "" }]);
    setEditingAddressId(id);
  };

  const updateAddress = (id: string, patch: Partial<PaymentAddress>) => {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  };

  const deleteAddress = (id: string) => {
    const next = addresses.filter((a) => a.id !== id);
    setAddresses(next);
    if (editingAddressId === id) setEditingAddressId(null);
    saveSettingsMutation.mutate(next);
  };

  // Combined client list from both existing admin lists — read-only lookups,
  // nothing here writes back to mt5_copier_requests or
  // account_management_applications.
  const { data: clientOptions, isLoading: loadingClients } = useQuery({
    queryKey: ["payment-share-client-options"],
    queryFn: async (): Promise<ClientOption[]> => {
      const [copierRes, accountRes] = await Promise.all([
        db
          .from("mt5_copier_requests")
          .select("id, name, contact_number, telegram_username, telegram_chat_id")
          .order("created_at", { ascending: false }),
        db
          .from("account_management_applications")
          .select("id, name, whatsapp, telegram_username, telegram_chat_id")
          .order("created_at", { ascending: false }),
      ]);

      // Both source lists already link clients to the Telegram bot
      // (Copy Management / Account Management screens) — reuse that chat id
      // here so a client who's already linked doesn't need a second,
      // payment-specific "start the bot" link.
      const copierOptions: ClientOption[] = (copierRes.data || []).map((r: any) => ({
        source_type: "copier" as const,
        source_id: r.id,
        name: r.name || "Unnamed",
        contact: r.contact_number,
        telegram_username: r.telegram_username ?? null,
        telegram_chat_id: r.telegram_chat_id ?? null,
      }));

      const accountOptions: ClientOption[] = (accountRes.data || []).map((r: any) => ({
        source_type: "account_management" as const,
        source_id: r.id,
        name: r.name || "Unnamed",
        contact: r.whatsapp,
        telegram_username: r.telegram_username,
        telegram_chat_id: r.telegram_chat_id ?? null,
      }));

      return [...copierOptions, ...accountOptions];
    },
  });

  const { data: shares, isLoading: loadingShares } = useQuery({
    queryKey: ["client-payment-shares"],
    queryFn: async (): Promise<PaymentShare[]> => {
      const { data, error } = await db
        .from("client_payment_shares")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as PaymentShare[];
    },
  });

  // Live-refresh when a client taps a button in Telegram.
  useEffect(() => {
    const channel = db
      .channel("client-payment-shares-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_payment_shares" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["client-payment-shares"] });
        }
      )
      .subscribe();

    return () => {
      db.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sharesByKey = useMemo(() => {
    const map = new Map<string, PaymentShare>();
    (shares || []).forEach((s) => map.set(`${s.source_type}:${s.source_id}`, s));
    return map;
  }, [shares]);

  const filteredShares = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return shares || [];
    return (shares || []).filter((s) => {
      const statusLabel = STATUS_LABEL[s.status]?.label || s.status;
      return [s.client_name, s.client_contact, s.telegram_username, s.payment_proof, statusLabel, s.source_type]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q));
    });
  }, [shares, listSearch]);

  const selectedOption = useMemo(
    () => (clientOptions || []).find((c) => `${c.source_type}:${c.source_id}` === selectedKey) || null,
    [clientOptions, selectedKey]
  );
  const selectedShare = selectedKey ? sharesByKey.get(selectedKey) : undefined;

  // The chat id the client is actually reachable on: prefer what's already
  // saved on this payment-share row, otherwise fall back to the chat id
  // they linked via Copy Management / Account Management.
  const effectiveChatId = selectedShare?.telegram_chat_id ?? selectedOption?.telegram_chat_id ?? null;
  const alreadyLinkedElsewhere = !selectedShare?.telegram_chat_id && !!selectedOption?.telegram_chat_id;

  const handleSelect = (key: string) => {
    setSelectedKey(key);
    const existing = sharesByKey.get(key);
    setProfitInput(existing?.profit_amount != null ? String(existing.profit_amount) : "");
    setShareInput(existing?.share_percentage != null ? String(existing.share_percentage) : "");
    document.getElementById("payment-share-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOption) throw new Error("Select a client first");
      const profit = profitInput === "" ? null : Number(profitInput);
      const sharePct = shareInput === "" ? null : Number(shareInput);

      // Carry over the chat id from the client's existing Telegram link
      // (Copy Management / Account Management) if this payment-share row
      // doesn't already have one of its own — that's what lets "Send
      // Payment Request" work right away for an already-linked client.
      const chatId = selectedShare?.telegram_chat_id ?? selectedOption.telegram_chat_id ?? null;

      const { error } = await db.from("client_payment_shares").upsert(
        {
          source_type: selectedOption.source_type,
          source_id: selectedOption.source_id,
          client_name: selectedOption.name,
          client_contact: selectedOption.contact,
          telegram_username: selectedShare?.telegram_username ?? selectedOption.telegram_username,
          telegram_chat_id: chatId,
          status: selectedShare?.status ?? (chatId ? "linked" : "draft"),
          profit_amount: profit,
          share_percentage: sharePct,
        },
        { onConflict: "source_type,source_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-payment-shares"] });
      toast.success("Saved");
    },
    onError: (err: any) => toast.error("Save failed", { description: err?.message }),
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.functions.invoke("payment-share-send-request", { body: { id } });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Failed to send");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-payment-shares"] });
      toast.success("Payment request sent to client on Telegram");
    },
    onError: (err: any) => toast.error("Could not send request", { description: err?.message }),
  });

  const verifyMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db.functions.invoke("payment-share-verify", { body: { id } });
      if (error) throw error;
      if (data && data.success === false) throw new Error(data.error || "Failed to verify");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-payment-shares"] });
      toast.success("Verified — receipt sent to client");
    },
    onError: (err: any) => toast.error("Verify failed", { description: err?.message }),
  });

  const computedAmount =
    profitInput !== "" && shareInput !== ""
      ? ((Number(profitInput) || 0) * (Number(shareInput) || 0)) / 100
      : null;

  const copyLink = (token: string) => {
    const link = TELEGRAM_BOT_USERNAME ? `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${token}` : "";
    if (!link) {
      toast.error("Bot username not configured (VITE_TELEGRAM_BOT_USERNAME)");
      return;
    }
    navigator.clipboard.writeText(link);
    toast.success("Link copied — send it to the client on WhatsApp/Telegram");
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Payment Settings" icon={<Settings className="h-4 w-4" />}>
        <div className="space-y-2">
          <Label>Payment Addresses</Label>
          {addresses.length === 0 && (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          )}
          <div className="space-y-2">
            {addresses.map((a) =>
              editingAddressId === a.id ? (
                <div key={a.id} className="flex flex-col sm:flex-row gap-2 border rounded-lg p-2">
                  <Input
                    className="sm:w-40"
                    value={a.label}
                    placeholder="Label (e.g. USDT TRC20)"
                    onChange={(e) => updateAddress(a.id, { label: e.target.value })}
                  />
                  <Input
                    className="flex-1"
                    value={a.address}
                    placeholder="Address / account / UPI ID"
                    onChange={(e) => updateAddress(a.id, { address: e.target.value })}
                  />
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditingAddressId(null);
                        saveSettingsMutation.mutate(addresses);
                      }}
                      disabled={saveSettingsMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingAddressId(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-2 border rounded-lg p-2 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{a.label || "Untitled"}</span>
                    <span className="text-muted-foreground ml-2 truncate">{a.address || "—"}</span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setEditingAddressId(a.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteAddress(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
          <Button size="sm" variant="outline" onClick={addAddress}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Address
          </Button>
        </div>
        <div>
          <Label>Admin Contact Link</Label>
          <Input
            value={adminContactLink}
            onChange={(e) => setAdminContactLink(e.target.value)}
            placeholder="e.g. https://t.me/yourusername"
          />
        </div>
        <Button
          onClick={() => saveSettingsMutation.mutate(addresses)}
          disabled={saveSettingsMutation.isPending}
          size="sm"
        >
          {saveSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Settings
        </Button>
      </SectionCard>

      <div id="payment-share-form">
      <SectionCard title="Profit Share & Payment Requests" icon={<Wallet className="h-5 w-5" />}>
          <div>
            <Label>Select Client</Label>
            <Popover open={clientComboOpen} onOpenChange={setClientComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clientComboOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedOption ? (
                    <span className="flex items-center gap-2 truncate">
                      {selectedOption.source_type === "copier" ? (
                        <Zap className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
                      ) : (
                        <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                      )}
                      <span className="truncate">{selectedOption.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({selectedOption.source_type === "copier" ? "Copier" : "Account Mgmt"})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {loadingClients ? "Loading clients..." : "Search a client..."}
                    </span>
                  )}
                  <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search by name..." />
                  <CommandList>
                    <CommandEmpty>No client found.</CommandEmpty>
                    <CommandGroup>
                      {(clientOptions || []).map((c) => {
                        const key = `${c.source_type}:${c.source_id}`;
                        return (
                          <CommandItem
                            key={key}
                            value={`${c.name} ${c.contact || ""} ${c.telegram_username || ""}`}
                            onSelect={() => {
                              handleSelect(key);
                              setClientComboOpen(false);
                            }}
                          >
                            <Check
                              className={`mr-2 h-4 w-4 ${selectedKey === key ? "opacity-100" : "opacity-0"}`}
                            />
                            {c.source_type === "copier" ? (
                              <Zap className="mr-2 h-3.5 w-3.5 text-yellow-600 shrink-0" />
                            ) : (
                              <BriefcaseBusiness className="mr-2 h-3.5 w-3.5 text-cyan-600 shrink-0" />
                            )}
                            <span className="truncate">{c.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground shrink-0">
                              ({c.source_type === "copier" ? "Copier" : "Account Mgmt"})
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedOption && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Profit Amount</Label>
                  <Input
                    type="number"
                    value={profitInput}
                    onChange={(e) => setProfitInput(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                </div>
                <div>
                  <Label>Profit Share %</Label>
                  <Input
                    type="number"
                    value={shareInput}
                    onChange={(e) => setShareInput(e.target.value)}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Share Amount:{" "}
                <span className="font-semibold text-foreground">
                  {computedAmount !== null ? computedAmount.toFixed(2) : "—"}
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                  {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save
                </Button>

                {selectedShare && (
                  <>
                    {/* Only needed as a fallback for a client who genuinely
                        hasn't linked the bot anywhere yet. Once they're
                        linked (here or via Copy/Account Management), this
                        step is skipped entirely and Send Payment Request
                        works directly. */}
                    {!effectiveChatId && (
                      <Button variant="outline" onClick={() => copyLink(selectedShare.link_token)}>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Telegram Link
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => sendRequestMutation.mutate(selectedShare.id)}
                      disabled={
                        !effectiveChatId ||
                        sendRequestMutation.isPending ||
                        !profitInput ||
                        !shareInput
                      }
                    >
                      {sendRequestMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Payment Request
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => verifyMutation.mutate(selectedShare.id)}
                      disabled={
                        verifyMutation.isPending ||
                        !effectiveChatId ||
                        ["draft", "linked", "verified"].includes(selectedShare.status)
                      }
                    >
                      {verifyMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Verify & Send Receipt
                    </Button>
                  </>
                )}
              </div>

              {selectedShare && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className={STATUS_LABEL[selectedShare.status]?.className || ""}>
                      {STATUS_LABEL[selectedShare.status]?.label || selectedShare.status}
                    </Badge>
                    {alreadyLinkedElsewhere && (
                      <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500">
                        <Link2 className="h-3 w-3 mr-1" />
                        Telegram already linked
                      </Badge>
                    )}
                  </div>
                  {selectedShare.payment_proof && (
                    <p className="text-sm text-muted-foreground">
                      Proof / reference: <span className="text-foreground">{selectedShare.payment_proof}</span>
                    </p>
                  )}
                </div>
              )}
            </>
          )}
      </SectionCard>
      </div>

      <SectionCard title="All Payment Share Requests">
        <div className="relative -mt-2 mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={listSearch}
            onChange={(e) => setListSearch(e.target.value)}
            placeholder="Search by name, status, proof..."
            className="pl-8"
          />
        </div>
        {loadingShares ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !shares || shares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No payment share requests yet.</p>
        ) : filteredShares.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No matches for "{listSearch}".</p>
        ) : (
          <div className="space-y-2">
            {filteredShares.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(`${s.source_type}:${s.source_id}`)}
                className="w-full flex items-center justify-between border rounded-lg p-3 text-sm text-left hover:bg-muted/50 transition-colors"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {s.source_type === "copier" ? (
                      <Zap className="h-3.5 w-3.5 text-yellow-600" />
                    ) : (
                      <BriefcaseBusiness className="h-3.5 w-3.5 text-cyan-600" />
                    )}
                    {s.client_name}
                    {s.telegram_chat_id && <Link2 className="h-3.5 w-3.5 text-emerald-500" />}
                  </div>
                  <div className="text-muted-foreground text-xs mt-0.5">
                    Profit: {s.profit_amount ?? "—"} · Share: {s.share_percentage ?? "—"}% · Amount:{" "}
                    {s.share_amount ?? "—"}
                    {s.payment_proof ? ` · Proof: ${s.payment_proof}` : ""}
                  </div>
                </div>
                <Badge variant="secondary" className={STATUS_LABEL[s.status]?.className || ""}>
                  {STATUS_LABEL[s.status]?.label || s.status}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default PaymentShareManagement;
