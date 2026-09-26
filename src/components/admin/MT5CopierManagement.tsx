import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Phone,
  Search,
  Server,
  Key,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Link2,
  TrendingUp,
  TrendingDown,
  Gauge,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  Trash2,
  Wallet,
} from "lucide-react";

const db = supabase as any;

// Display-only cleanup for text that may have been stored with an old UTF-8/Latin-1 encoding mismatch.
const cleanDisplayText = (value: string | null | undefined) =>
  String(value ?? "")
    .replaceAll("â€”", "-")
    .replaceAll("â€“", "-")
    .replaceAll("â€¢", "*")
    .replaceAll("Ã—", "x");

interface CopierRequest {
  id: string;
  name: string | null;
  contact_number: string | null;
  telegram_username: string | null;
  telegram_chat_id: number | null;
  mt5_login: string;
  broker_name: string;
  broker_server: string;
  mt5_password: string;
  note: string | null;
  status: string;
  is_public: boolean;
  account_balance: number | null;
  profit_amount: number | null;
  loss_amount: number | null;
  risk_reward_ratio: string | null;
  profit_percent: number | null;
  loss_percent: number | null;
  created_at: string;
  last_synced_at: string | null;
  sync_error: string | null;
}

const MT5CopierManagement = ({ initialSearch }: { initialSearch?: string } = {}) => {
  const queryClient = useQueryClient();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<CopierRequest>>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "connected" | "rejected">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [messagingReq, setMessagingReq] = useState<{ id: string; channel: "whatsapp" | "telegram" } | null>(null);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);

  const togglePasswordVisibility = (id: string) =>
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));

  const { data: requests, isLoading } = useQuery({
    queryKey: ["mt5-copier-requests"],
    queryFn: async () => {
      const { data, error } = await db
        .from("mt5_copier_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CopierRequest[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("admin_delete_mt5_copier", {
        p_request_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5-copier-requests"] });
      queryClient.invalidateQueries({ queryKey: ["copier-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["mt5-copier-public-stats"] });
      setExpandedId(null);
      setEditingConnId(null);
      toast.success("Copier deleted completely", {
        description: "The request was removed from the admin list and public Copier Leaderboard.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to delete copier", { description: err?.message });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await db.rpc("admin_delete_mt5_copier", {
          p_request_id: id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5-copier-requests"] });
      queryClient.invalidateQueries({ queryKey: ["copier-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["mt5-copier-public-stats"] });
      setSelectedIds([]);
      setExpandedId(null);
      setEditingConnId(null);
      toast.success("Selected copiers deleted", {
        description: "Selected requests were removed from Admin and the public Copier Leaderboard.",
      });
    },
    onError: (err: any) => {
      toast.error("Failed to delete selected copiers", { description: err?.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CopierRequest> }) => {
      const { error } = await db
        .from("mt5_copier_requests")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5-copier-requests"] });
      toast.success("Saved successfully");
    },
    onError: (err: any) => {
      toast.error("Failed to save", { description: err?.message });
    },
  });

  const getDraft = (req: CopierRequest, field: keyof CopierRequest) =>
    drafts[req.id]?.[field] !== undefined ? drafts[req.id][field] : req[field];

  const setDraft = (id: string, field: keyof CopierRequest, value: any) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  // Short but polished, status-specific auto messages - used to pre-fill the
  // editable composer for both WhatsApp and Telegram.
  const getStatusMessage = (req: CopierRequest) => {
    const name = req.name || "there";
    switch (req.status) {
      case "pending":
        return `Hi ${name}! 👋\nThanks for submitting your MT5 Copier request - our team is reviewing it right now.\nWe'll get back to you shortly with an update.`;
      case "connected":
        return `Hi ${name}! 🎉\nGreat news - your MT5 Copier account is now successfully connected and live.\nWishing you profitable trades ahead!`;
      case "rejected":
        return `Hi ${name},\nThanks for your request - unfortunately it couldn't be approved this time.\nThis is usually because of one of the following: a wrong account password, a demo account, a cent account, or a contest account (none of these are allowed for the copier).\nPlease resubmit with a valid live account and correct details - we'll be happy to review it again.`;
      default:
        return `Hi ${name},\nReaching out regarding your MT5 Copier request.\nLet us know if you have any questions!`;
    }
  };

  // Opens the editable message composer instead of sending straight away, so
  // the admin can tweak the auto-generated text before it goes out.
  const openMessageComposer = (req: CopierRequest, channel: "whatsapp" | "telegram") => {
    setMessageDrafts((prev) => ({
      ...prev,
      [req.id]: prev[req.id] ?? getStatusMessage(req),
    }));
    setMessagingReq({ id: req.id, channel });
  };

  // Helper for opening WhatsApp with the composed message.
  const openWhatsApp = (req: CopierRequest) => openMessageComposer(req, "whatsapp");

  // Helper for opening Telegram with the composed message.
  const openTelegram = (req: CopierRequest) => openMessageComposer(req, "telegram");

  // Actually sends the composed (possibly edited) message via the chosen channel.
  const sendComposedMessage = (req: CopierRequest) => {
    if (!messagingReq) return;
    const message = messageDrafts[req.id] ?? getStatusMessage(req);
    if (messagingReq.channel === "whatsapp" && req.contact_number) {
      const cleanNumber = req.contact_number.replace(/[^\d+]/g, "").replace("+", "");
      window.open(`https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`, "_blank");
    } else if (messagingReq.channel === "telegram" && req.telegram_username) {
      window.open(`https://t.me/${req.telegram_username}?text=${encodeURIComponent(message)}`, "_blank");
    }
    setMessagingReq(null);
  };

  // Smart Performance Save: Auto fixes Profit ($), Loss ($) & Risk:Reward based on % of the account balance
  // Profit % and Loss % are fully independent - entering one no longer resets the other.
  const savePerformance = (req: CopierRequest) => {
    const d = drafts[req.id] || {};

    let accountBalance = d.account_balance !== undefined ? Number(d.account_balance) || 0 : (req.account_balance || 0);
    let profitPercent = d.profit_percent !== undefined ? Number(d.profit_percent) || 0 : (req.profit_percent || 0);
    let lossPercent = d.loss_percent !== undefined ? Number(d.loss_percent) || 0 : (req.loss_percent || 0);

    // Amounts are now derived from the entered account balance:
    // e.g. $100 balance + 10% profit = $10 profit (balance * percent / 100)
    let profitAmount = profitPercent > 0 ? Math.round((accountBalance * profitPercent) / 100 * 100) / 100 : 0;
    let lossAmount = lossPercent > 0 ? Math.round((accountBalance * lossPercent) / 100 * 100) / 100 : 0;

    // Risk:Reward is risk first, reward second.
    // Example: 5% loss vs 10% profit => 1:2.
    // With zero loss/risk there is no meaningful R:R, so show N/A.
    let riskReward = "N/A";
    if (profitPercent > 0 && lossPercent > 0) {
      const rewardPerRisk = profitPercent / lossPercent;
      riskReward = `1:${Number(rewardPerRisk.toFixed(2))}`;
    }

    updateMutation.mutate({
      id: req.id,
      updates: {
        account_balance: accountBalance,
        profit_percent: profitPercent,
        loss_percent: lossPercent,
        profit_amount: profitAmount,
        loss_amount: lossAmount,
        risk_reward_ratio: riskReward,
      },
    });
  };

  const saveConnectionDetails = (req: CopierRequest) => {
    const d = drafts[req.id] || {};
    updateMutation.mutate({
      id: req.id,
      updates: {
        mt5_login: d.mt5_login !== undefined ? String(d.mt5_login) : req.mt5_login,
        broker_name: d.broker_name !== undefined ? String(d.broker_name) : req.broker_name,
        broker_server: d.broker_server !== undefined ? String(d.broker_server) : req.broker_server,
        mt5_password: d.mt5_password !== undefined ? String(d.mt5_password) : req.mt5_password,
        sync_error: null,
        meta_account_id: null,
      } as any,
    });
    setEditingConnId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">Connected</Badge>;
      case "rejected":
        return <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const counts = {
    all: requests?.length || 0,
    pending: requests?.filter((r) => r.status === "pending").length || 0,
    connected: requests?.filter((r) => r.status === "connected").length || 0,
    rejected: requests?.filter((r) => r.status === "rejected").length || 0,
  };

  const filteredRequests = (
    statusFilter === "all" ? requests : requests?.filter((r) => r.status === statusFilter)
  )?.filter((r) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    return [r.name, r.contact_number].filter(Boolean).some((f: string) => f.toLowerCase().includes(q));
  });

  const filterTabs: { key: typeof statusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "connected", label: "Connected" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          MT5 Copier Requests
          {requests && requests.length > 0 && (
            <Badge variant="secondary" className="ml-2">{requests.length}</Badge>
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter Profit % or Loss % below and save - amounts & R:R ratio auto-calculate. Click WhatsApp to instantly message users.
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="h-8 text-xs"
            disabled={selectedIds.length === 0 || bulkDeleteMutation.isPending}
            onClick={() => {
              if (selectedIds.length === 0) return;
              const confirmed = window.confirm(
                `Delete ${selectedIds.length} selected copier${selectedIds.length === 1 ? "" : "s"} permanently?\n\nThis removes them from Admin Copier Management and the public Copier Leaderboard. This cannot be undone.`
              );
              if (confirmed) bulkDeleteMutation.mutate(selectedIds);
            }}
          >
            {bulkDeleteMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Delete Selected{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={!filteredRequests || filteredRequests.length === 0}
            onClick={() => {
              const visibleIds = (filteredRequests || []).map((r) => r.id);
              const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
              setSelectedIds((prev) =>
                allVisibleSelected
                  ? prev.filter((id) => !visibleIds.includes(id))
                  : Array.from(new Set([...prev, ...visibleIds]))
              );
            }}
          >
            {filteredRequests && filteredRequests.length > 0 && filteredRequests.every((r) => selectedIds.includes(r.id))
              ? "Unselect All"
              : "Select All"}
          </Button>
        </div>
        <div className="relative pt-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or contact..."
            className="pl-8 max-w-sm h-8 text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {filterTabs.map((tab) => (            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {!filteredRequests || filteredRequests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {statusFilter === "all" ? "No MT5 copier requests yet" : `No ${statusFilter} requests`}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const isExpanded = expandedId === req.id;
              return (
                <Card key={req.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          aria-label={`Select ${req.name || "copier request"}`}
                          checked={selectedIds.includes(req.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, req.id]))
                                : prev.filter((id) => id !== req.id)
                            )
                          }
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="font-semibold text-lg">{req.name || "Unnamed"}</span>
                        {getStatusBadge(req.status)}
                        {req.is_public && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            Public
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`public-${req.id}`} className="text-[11px] sm:text-xs text-muted-foreground">
                            Public list
                          </Label>
                          <Switch
                            id={`public-${req.id}`}
                            checked={req.is_public}
                            onCheckedChange={(checked) =>
                              updateMutation.mutate({ id: req.id, updates: { is_public: checked } })
                            }
                          />
                        </div>
                        <Select
                          value={req.status}
                          onValueChange={(value) => updateMutation.mutate({ id: req.id, updates: { status: value } })}
                        >
                          <SelectTrigger className="w-[110px] sm:w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="connected">Connected</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {editingConnId === req.id ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                        <div className="space-y-1">
                          <Label className="text-[11px]">MT5 Login</Label>
                          <Input
                            className="h-8 text-sm font-mono"
                            value={getDraft(req, "mt5_login") ?? ""}
                            onChange={(e) => setDraft(req.id, "mt5_login", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Broker Name</Label>
                          <Input
                            className="h-8 text-sm"
                            value={getDraft(req, "broker_name") ?? ""}
                            onChange={(e) => setDraft(req.id, "broker_name", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Broker Server</Label>
                          <Input
                            className="h-8 text-sm font-mono"
                            placeholder="e.g., Exness-MT5Trial15"
                            value={getDraft(req, "broker_server") ?? ""}
                            onChange={(e) => setDraft(req.id, "broker_server", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Trading Password</Label>
                          <Input
                            className="h-8 text-sm font-mono"
                            value={getDraft(req, "mt5_password") ?? ""}
                            onChange={(e) => setDraft(req.id, "mt5_password", e.target.value)}
                          />
                        </div>
                        <div className="col-span-1 sm:col-span-2 flex gap-2">
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => saveConnectionDetails(req)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : null}
                            Save Connection Details
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs"
                            onClick={() => setEditingConnId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                          {req.contact_number && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                type="button"
                                onClick={() => openWhatsApp(req)}
                                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
                              >
                                <Phone className="h-4 w-4" />
                                <span>{req.contact_number}</span>
                              </button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openWhatsApp(req)}
                                className="h-6 px-2 text-[11px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 gap-1"
                              >
                                <MessageSquare className="h-3 w-3 fill-current" />
                                WhatsApp
                              </Button>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Server className="h-4 w-4 text-primary" />
                            <span className="font-mono text-xs">{cleanDisplayText(req.broker_name)} - {cleanDisplayText(req.broker_server)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Key className="h-4 w-4 text-emerald-500" />
                            <span className="font-mono text-xs">Login: <span className="font-bold text-foreground">{req.mt5_login}</span></span>
                          </div>
                          {req.telegram_username && (
                            <div className="flex flex-col gap-0.5 text-muted-foreground">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Send className="h-4 w-4 text-sky-500" />
                                <span className="font-mono text-xs">@{req.telegram_username}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openTelegram(req)}
                                  className="h-6 px-2 text-[11px] border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 gap-1"
                                >
                                  <Send className="h-3 w-3" />
                                  Telegram
                                </Button>
                              </div>
                              <span
                                className={`text-[11px] font-semibold pl-6 ${
                                  req.telegram_chat_id ? "text-emerald-500" : "text-amber-500"
                                }`}
                              >
                                {req.telegram_chat_id ? "(auto-updates linked)" : "(not linked yet)"}
                              </span>
                            </div>
                          )}
                        </div>

                        {messagingReq?.id === req.id && (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                            <Label className="text-[11px] flex items-center gap-1 text-muted-foreground">
                              {messagingReq.channel === "whatsapp" ? (
                                <MessageSquare className="h-3 w-3" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              Message preview - edit before sending
                            </Label>
                            <Textarea
                              className="text-sm min-h-[90px]"
                              value={messageDrafts[req.id] ?? ""}
                              onChange={(e) =>
                                setMessageDrafts((prev) => ({ ...prev, [req.id]: e.target.value }))
                              }
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className={`h-8 text-xs ${
                                  messagingReq.channel === "whatsapp"
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "bg-sky-600 hover:bg-sky-700"
                                }`}
                                onClick={() => sendComposedMessage(req)}
                              >
                                Send via {messagingReq.channel === "whatsapp" ? "WhatsApp" : "Telegram"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => setMessagingReq(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Lock className="h-4 w-4 text-amber-500 shrink-0" />
                            <span className="font-mono text-xs text-muted-foreground break-all">
                              Pass: <span className="font-bold text-foreground">
                                {visiblePasswords[req.id] ? req.mt5_password : "********"}
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility(req.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                            >
                              {visiblePasswords[req.id] ? (
                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              ) : (
                                <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingConnId(req.id)}
                              className="ml-1 text-xs font-medium text-primary underline underline-offset-2"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {req.note && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">{cleanDisplayText(req.note)}</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(req.created_at), "PPp")}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        <Gauge className="h-3.5 w-3.5" />
                        Performance details
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete ${req.name || "this copier"} permanently?\n\nThis removes the copier request from Admin Copier Management and the public Copier Leaderboard. This cannot be undone.`
                          );
                          if (confirmed) deleteMutation.mutate(req.id);
                        }}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Delete
                      </Button>
                    </div>

                    {isExpanded && (() => {
                      const bal = Number(getDraft(req, "account_balance")) || 0;
                      const pp = Math.max(0, Number(getDraft(req, "profit_percent")) || 0);
                      const lp = Math.max(0, Number(getDraft(req, "loss_percent")) || 0);
                      const profitPreview = Math.round((Math.max(0, bal) * pp) / 100 * 100) / 100;
                      const lossPreview = Math.round((Math.max(0, bal) * lp) / 100 * 100) / 100;
                      const rr = pp > 0 && lp > 0 ? `1:${(pp / lp).toFixed(2).replace(/\.00$/, "")}` : "N/A";

                      return (
                        <div className="mt-1 rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">
                          {/* Account Balance */}
                          <div className="space-y-1.5">
                            <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Wallet className="h-3.5 w-3.5" />
                              Account Balance ($)
                            </Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              placeholder="e.g. 100"
                              className="h-10 text-base font-semibold"
                              value={getDraft(req, "account_balance") ?? ""}
                              onChange={(e) => setDraft(req.id, "account_balance", e.target.value)}
                            />
                          </div>

                          {/* Profit % / Loss % */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                                Profit %
                              </Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="e.g. 15"
                                className="h-10 text-base"
                                value={getDraft(req, "profit_percent") ?? ""}
                                onChange={(e) => setDraft(req.id, "profit_percent", e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                                <TrendingDown className="h-3.5 w-3.5 shrink-0" />
                                Loss %
                              </Label>
                              <Input
                                type="number"
                                inputMode="decimal"
                                placeholder="e.g. 5"
                                className="h-10 text-base"
                                value={getDraft(req, "loss_percent") ?? ""}
                                onChange={(e) => setDraft(req.id, "loss_percent", e.target.value)}
                              />
                            </div>
                          </div>

                          {/* Summary cards */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                Profit
                              </p>
                              <p className="text-xl font-bold mt-1 tabular-nums">${profitPreview.toFixed(2)}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {pp}% of ${bal.toFixed(2)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-destructive">
                                Loss
                              </p>
                              <p className="text-xl font-bold mt-1 tabular-nums">${lossPreview.toFixed(2)}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {lp}% of ${bal.toFixed(2)}
                              </p>
                            </div>

                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary flex items-center gap-1">
                                <Gauge className="h-3 w-3" />
                                Risk : Reward
                              </p>
                              <p className="text-xl font-bold mt-1 tabular-nums">{rr}</p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">Risk first, reward second</p>
                            </div>
                          </div>

                          <Button
                            className="w-full h-11 text-sm font-semibold"
                            onClick={() => savePerformance(req)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Save & Sync Performance
                          </Button>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MT5CopierManagement;
