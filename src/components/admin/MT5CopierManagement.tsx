import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Phone,
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
} from "lucide-react";

const db = supabase as any;

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

const MT5CopierManagement = () => {
  const queryClient = useQueryClient();

  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConnId, setEditingConnId] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<
    Record<string, Partial<CopierRequest>>
  >({});

  const [statusFilter, setStatusFilter] = useState<
    "all" | "pending" | "connected" | "rejected"
  >("all");

  const [messagingReq, setMessagingReq] = useState<{
    id: string;
    channel: "whatsapp" | "telegram";
  } | null>(null);

  const [messageDrafts, setMessageDrafts] = useState<
    Record<string, string>
  >({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const {
    data: requests,
    isLoading,
  } = useQuery({
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

  /*
   * PERMANENT DELETE
   *
   * This calls the Supabase admin-only RPC.
   * The database record is actually deleted, so it also disappears
   * from any public Copier Leaderboard that reads this table.
   */
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("admin_delete_mt5_copier", {
        p_request_id: id,
      });

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mt5-copier-requests"],
      });

      queryClient.invalidateQueries({
        queryKey: ["copier-leaderboard"],
      });

      queryClient.invalidateQueries({
        queryKey: ["mt5-copier-public-stats"],
      });

      setExpandedId(null);
      setEditingConnId(null);

      toast.success("Copier deleted completely", {
        description:
          "The copier was permanently removed from Admin Copier Management and the public Copier Leaderboard.",
      });
    },

    onError: (err: any) => {
      toast.error("Failed to delete copier", {
        description: err?.message || "Admin delete failed.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<CopierRequest>;
    }) => {
      const { error } = await db
        .from("mt5_copier_requests")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["mt5-copier-requests"],
      });

      queryClient.invalidateQueries({
        queryKey: ["copier-leaderboard"],
      });

      queryClient.invalidateQueries({
        queryKey: ["mt5-copier-public-stats"],
      });

      toast.success("Saved successfully");
    },

    onError: (err: any) => {
      toast.error("Failed to save", {
        description: err?.message || "Update failed.",
      });
    },
  });

  const getDraft = (
    req: CopierRequest,
    field: keyof CopierRequest
  ) => {
    return drafts[req.id]?.[field] !== undefined
      ? drafts[req.id]?.[field]
      : req[field];
  };

  const setDraft = (
    id: string,
    field: keyof CopierRequest,
    value: any
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const getStatusMessage = (req: CopierRequest) => {
    const name = req.name || "there";

    switch (req.status) {
      case "pending":
        return `Hi ${name}! 👋
Thanks for submitting your MT5 Copier request — our team is reviewing it right now.
We'll get back to you shortly with an update.`;

      case "connected":
        return `Hi ${name}! 🎉
Great news — your MT5 Copier account is now successfully connected and live.
Wishing you profitable trades ahead!`;

      case "rejected":
        return `Hi ${name},
Thanks for your request — unfortunately it couldn't be approved this time.
This is usually because of one of the following: a wrong account password, a demo account, a cent account, or a contest account (none of these are allowed for the copier).
Please resubmit with a valid live account and correct details — we'll be happy to review it again.`;

      default:
        return `Hi ${name},
Reaching out regarding your MT5 Copier request.
Let us know if you have any questions!`;
    }
  };

  const openMessageComposer = (
    req: CopierRequest,
    channel: "whatsapp" | "telegram"
  ) => {
    setMessageDrafts((prev) => ({
      ...prev,
      [req.id]: prev[req.id] ?? getStatusMessage(req),
    }));

    setMessagingReq({
      id: req.id,
      channel,
    });
  };

  const sendComposedMessage = (req: CopierRequest) => {
    if (!messagingReq) return;

    const message =
      messageDrafts[req.id] ?? getStatusMessage(req);

    if (
      messagingReq.channel === "whatsapp" &&
      req.contact_number
    ) {
      const cleanNumber = req.contact_number
        .replace(/[^\d+]/g, "")
        .replace("+", "");

      window.open(
        `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
          message
        )}`,
        "_blank"
      );
    } else if (
      messagingReq.channel === "telegram" &&
      req.telegram_username
    ) {
      window.open(
        `https://t.me/${req.telegram_username}?text=${encodeURIComponent(
          message
        )}`,
        "_blank"
      );
    }

    setMessagingReq(null);
  };

  /*
   * PERFORMANCE CALCULATION
   *
   * Example:
   * Balance = $100
   * Profit = 10%
   * Loss = 5%
   *
   * Profit = $10
   * Loss = $5
   * Risk:Reward = 1:2
   */
  const savePerformance = (req: CopierRequest) => {
    const d = drafts[req.id] || {};

    const accountBalance =
      d.account_balance !== undefined
        ? Number(d.account_balance) || 0
        : Number(req.account_balance) || 0;

    const profitPercent =
      d.profit_percent !== undefined
        ? Number(d.profit_percent) || 0
        : Number(req.profit_percent) || 0;

    const lossPercent =
      d.loss_percent !== undefined
        ? Number(d.loss_percent) || 0
        : Number(req.loss_percent) || 0;

    const profitAmount =
      accountBalance > 0 && profitPercent > 0
        ? Math.round(
            ((accountBalance * profitPercent) / 100) * 100
          ) / 100
        : 0;

    const lossAmount =
      accountBalance > 0 && lossPercent > 0
        ? Math.round(
            ((accountBalance * lossPercent) / 100) * 100
          ) / 100
        : 0;

    let riskReward = "N/A";

    if (profitPercent > 0 && lossPercent > 0) {
      const ratio = profitPercent / lossPercent;

      riskReward = `1:${Number(ratio.toFixed(2))}`;
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
        mt5_login:
          d.mt5_login !== undefined
            ? String(d.mt5_login)
            : req.mt5_login,

        broker_name:
          d.broker_name !== undefined
            ? String(d.broker_name)
            : req.broker_name,

        broker_server:
          d.broker_server !== undefined
            ? String(d.broker_server)
            : req.broker_server,

        mt5_password:
          d.mt5_password !== undefined
            ? String(d.mt5_password)
            : req.mt5_password,

        sync_error: null,
        meta_account_id: null,
      } as any,
    });

    setEditingConnId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10">
            Connected
          </Badge>
        );

      case "rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">
            Rejected
          </Badge>
        );

      default:
        return (
          <Badge variant="secondary">
            Pending
          </Badge>
        );
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

  const allRequests = requests || [];

  const filteredRequests =
    statusFilter === "all"
      ? allRequests
      : allRequests.filter(
          (req) => req.status === statusFilter
        );

  const counts = {
    all: allRequests.length,

    pending: allRequests.filter(
      (r) => r.status === "pending"
    ).length,

    connected: allRequests.filter(
      (r) => r.status === "connected"
    ).length,

    rejected: allRequests.filter(
      (r) => r.status === "rejected"
    ).length,
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-xl">
              MT5 / MT4 Copier Management
            </CardTitle>

            <Badge variant="outline">
              {filteredRequests.length} Copier
              {filteredRequests.length !== 1 ? "s" : ""}
            </Badge>
          </div>

          {/* STATUS FILTER */}
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["all", "All"],
                ["pending", "Pending"],
                ["connected", "Connected"],
                ["rejected", "Rejected"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={
                  statusFilter === value
                    ? "default"
                    : "outline"
                }
                onClick={() =>
                  setStatusFilter(value)
                }
              >
                {label} (
                {counts[value]}
                )
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No copier requests found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const isExpanded =
                expandedId === req.id;

              const isEditing =
                editingConnId === req.id;

              const d = drafts[req.id] || {};

              const balance =
                Number(
                  getDraft(req, "account_balance")
                ) || 0;

              const profitPercent =
                Number(
                  getDraft(req, "profit_percent")
                ) || 0;

              const lossPercent =
                Number(
                  getDraft(req, "loss_percent")
                ) || 0;

              const profitPreview =
                Math.round(
                  (balance * profitPercent) / 100 * 100
                ) / 100;

              const lossPreview =
                Math.round(
                  (balance * lossPercent) / 100 * 100
                ) / 100;

              const rrPreview =
                profitPercent > 0 &&
                lossPercent > 0
                  ? `1:${(
                      profitPercent / lossPercent
                    ).toFixed(2).replace(/\.00$/, "")}`
                  : "N/A";

              return (
                <Card
                  key={req.id}
                  className="overflow-hidden"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                      {/* HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">
                              {req.name || "Unnamed User"}
                            </h3>

                            {getStatusBadge(
                              req.status
                            )}

                            {req.is_public && (
                              <Badge variant="outline">
                                Public
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground mt-1 break-all">
                            ID: {req.id}
                          </div>
                        </div>

                        {/* DELETE BUTTON */}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-9 border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={
                            deleteMutation.isPending
                          }
                          onClick={() => {
                            const confirmed =
                              window.confirm(
                                `Delete ${
                                  req.name ||
                                  "this copier"
                                } permanently?\n\n` +
                                  `This will remove the copier from Admin Copier Management AND the public Copier Leaderboard.\n\n` +
                                  `This action cannot be undone.`
                              );

                            if (confirmed) {
                              deleteMutation.mutate(
                                req.id
                              );
                            }
                          }}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 mr-1.5" />
                          )}

                          Delete
                        </Button>
                      </div>

                      {/* BASIC DETAILS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">
                            Broker
                          </div>

                          <div className="font-medium">
                            {req.broker_name || "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">
                            MT5 / MT4 Login
                          </div>

                          <div className="font-mono font-medium">
                            {req.mt5_login || "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">
                            Broker Server
                          </div>

                          <div className="font-medium break-all">
                            {req.broker_server || "—"}
                          </div>
                        </div>

                        <div className="rounded-lg border p-3">
                          <div className="text-xs text-muted-foreground">
                            Contact
                          </div>

                          <div className="font-medium">
                            {req.contact_number || "—"}
                          </div>
                        </div>
                      </div>

                      {/* CONNECTION DETAILS */}
                      {isEditing ? (
                        <div className="rounded-lg border p-4 space-y-3">
                          <div className="font-semibold">
                            Edit Connection
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label>
                                MT5 / MT4 Login
                              </Label>

                              <Input
                                value={
                                  String(
                                    getDraft(
                                      req,
                                      "mt5_login"
                                    ) ?? ""
                                  )
                                }
                                onChange={(e) =>
                                  setDraft(
                                    req.id,
                                    "mt5_login",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label>
                                Broker Name
                              </Label>

                              <Input
                                value={
                                  String(
                                    getDraft(
                                      req,
                                      "broker_name"
                                    ) ?? ""
                                  )
                                }
                                onChange={(e) =>
                                  setDraft(
                                    req.id,
                                    "broker_name",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label>
                                Broker Server
                              </Label>

                              <Input
                                value={
                                  String(
                                    getDraft(
                                      req,
                                      "broker_server"
                                    ) ?? ""
                                  )
                                }
                                onChange={(e) =>
                                  setDraft(
                                    req.id,
                                    "broker_server",
                                    e.target.value
                                  )
                                }
                              />
                            </div>

                            <div className="space-y-1">
                              <Label>
                                MT5 / MT4 Password
                              </Label>

                              <Input
                                type="text"
                                value={
                                  String(
                                    getDraft(
                                      req,
                                      "mt5_password"
                                    ) ?? ""
                                  )
                                }
                                onChange={(e) =>
                                  setDraft(
                                    req.id,
                                    "mt5_password",
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() =>
                                saveConnectionDetails(
                                  req
                                )
                              }
                              disabled={
                                updateMutation.isPending
                              }
                            >
                              Save
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setEditingConnId(null)
                              }
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Lock className="h-4 w-4 text-amber-500" />

                            <span className="font-mono text-xs text-muted-foreground">
                              Pass:{" "}
                              <span className="font-bold text-foreground">
                                {visiblePasswords[
                                  req.id
                                ]
                                  ? req.mt5_password
                                  : "••••••••"}
                              </span>
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                togglePasswordVisibility(
                                  req.id
                                )
                              }
                              className="p-1 hover:bg-muted rounded"
                            >
                              {visiblePasswords[
                                req.id
                              ] ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setEditingConnId(
                                  req.id
                                )
                              }
                              className="text-xs font-medium text-primary underline underline-offset-2"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {/* NOTE */}
                      {req.note && (
                        <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                          {req.note}
                        </p>
                      )}

                      {/* DATE */}
                      <p className="text-xs text-muted-foreground">
                        Submitted:{" "}
                        {format(
                          new Date(req.created_at),
                          "PPp"
                        )}
                      </p>

                      {/* ACTION ROW */}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(
                              isExpanded
                                ? null
                                : req.id
                            )
                          }
                          className="flex items-center gap-1 text-xs font-medium text-primary"
                        >
                          <Gauge className="h-3.5 w-3.5" />

                          Performance details

                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {/* DELETE BUTTON ALSO HERE */}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10"
                          disabled={
                            deleteMutation.isPending
                          }
                          onClick={() => {
                            const confirmed =
                              window.confirm(
                                `Permanently delete ${
                                  req.name ||
                                  "this copier"
                                }?\n\nIt will also disappear from the Copier Leaderboard.`
                              );

                            if (confirmed) {
                              deleteMutation.mutate(
                                req.id
                              );
                            }
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

                      {/* PERFORMANCE */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                          <div className="col-span-2 space-y-1">
                            <Label className="text-[11px]">
                              Account Balance ($)
                            </Label>

                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g. 100"
                              className="h-9 text-sm"
                              value={
                                getDraft(
                                  req,
                                  "account_balance"
                                ) ?? ""
                              }
                              onChange={(e) =>
                                setDraft(
                                  req.id,
                                  "account_balance",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                              Profit %
                            </Label>

                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g. 15"
                              className="h-9 text-sm"
                              value={
                                getDraft(
                                  req,
                                  "profit_percent"
                                ) ?? ""
                              }
                              onChange={(e) =>
                                setDraft(
                                  req.id,
                                  "profit_percent",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[11px] flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-destructive" />
                              Loss %
                            </Label>

                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="e.g. 5"
                              className="h-9 text-sm"
                              value={
                                getDraft(
                                  req,
                                  "loss_percent"
                                ) ?? ""
                              }
                              onChange={(e) =>
                                setDraft(
                                  req.id,
                                  "loss_percent",
                                  e.target.value
                                )
                              }
                            />
                          </div>

                          {/* CORRECT PROFIT / LOSS BOXES */}
                          <div className="col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* PROFIT */}
                            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                              <div className="text-[10px] font-semibold text-emerald-600">
                                PROFIT
                              </div>

                              <div className="text-xl font-bold">
                                $
                                {profitPreview.toFixed(
                                  2
                                )}
                              </div>

                              <div className="text-[10px] text-muted-foreground">
                                {profitPercent}% of $
                                {balance.toFixed(2)}
                              </div>
                            </div>

                            {/* LOSS */}
                            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                              <div className="text-[10px] font-semibold text-destructive">
                                LOSS
                              </div>

                              <div className="text-xl font-bold">
                                $
                                {lossPreview.toFixed(
                                  2
                                )}
                              </div>

                              <div className="text-[10px] text-muted-foreground">
                                {lossPercent}% of $
                                {balance.toFixed(2)}
                              </div>
                            </div>

                            {/* RISK REWARD */}
                            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                              <div className="text-[10px] font-semibold text-primary">
                                RISK : REWARD
                              </div>

                              <div className="text-xl font-bold">
                                {rrPreview}
                              </div>

                              <div className="text-[10px] text-muted-foreground">
                                Risk first, reward second
                              </div>
                            </div>
                          </div>

                          <div className="col-span-2">
                            <Button
                              size="sm"
                              className="h-9 w-full sm:w-auto"
                              onClick={() =>
                                savePerformance(
                                  req
                                )
                              }
                              disabled={
                                updateMutation.isPending
                              }
                            >
                              {updateMutation.isPending && (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              )}

                              Save & Sync Performance
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
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
