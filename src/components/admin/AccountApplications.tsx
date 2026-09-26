import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Mail,
  Phone,
  Building2,
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MessageCircle,
  MessageSquare,
  Send,
  Server,
  Key,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Globe,
  StickyNote,
} from "lucide-react";

const db = supabase as any;

interface AccountApplication {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  telegram_username: string | null;
  telegram_chat_id: number | null;
  submission_type: "trading_account" | "broker_login" | null;
  // trading_account fields
  preferred_broker: string | null;
  platform_type: string | null;
  broker_server: string | null;
  trading_login: string | null;
  trading_password: string | null;
  account_size: string | null;
  // broker_login fields
  broker_site_name: string | null;
  broker_email: string | null;
  broker_password: string | null;
  note: string | null;
  status: string | null;
  created_at: string;
}

type StatusFilter = "all" | "pending" | "contacted" | "approved" | "rejected";

const AccountApplications = () => {
  const queryClient = useQueryClient();
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const { data: applications, isLoading } = useQuery({
    queryKey: ["account-applications"],
    queryFn: async () => {
      const { data, error } = await db
        .from("account_management_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AccountApplication[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db
        .from("account_management_applications")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-applications"] });
      toast.success("Status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("account_management_applications").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-applications"] });
      toast.success("Application deleted");
    },
    onError: (err: any) => {
      toast.error("Failed to delete application", { description: err?.message });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await db.from("account_management_applications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-applications"] });
      setSelectedIds([]);
      toast.success("Selected applications deleted");
    },
    onError: (err: any) => {
      toast.error("Failed to delete selected applications", { description: err?.message });
    },
  });

  // Short, status-specific auto messages — pre-fills the editable Telegram
  // composer (same idea as MT5 Copier Management's message composer).
  const getStatusMessage = (app: AccountApplication) => {
    const name = app.name || "there";
    switch (app.status) {
      case "contacted":
        return `Hi ${name}! 👋\nThanks for your Account Management application - our team has reviewed it and will be in touch shortly with next steps.`;
      case "approved":
        return `Hi ${name}! 🎉\nGreat news - your Account Management application (${app.account_size}) has been approved. Welcome aboard!`;
      case "rejected":
        return `Hi ${name},\nThanks for applying for Account Management - unfortunately we couldn't approve this application right now. Feel free to reach out if you'd like more details or to re-apply.`;
      default:
        return `Hi ${name}! 👋\nThanks for submitting your Account Management application - our team is reviewing it now and will get back to you shortly.`;
    }
  };

  const openTelegramComposer = (app: AccountApplication) => {
    setMessageDrafts((prev) => ({ ...prev, [app.id]: prev[app.id] ?? getStatusMessage(app) }));
    setMessagingId(app.id);
  };

  const sendTelegramMessage = (app: AccountApplication) => {
    if (!app.telegram_username) return;
    const message = messageDrafts[app.id] ?? getStatusMessage(app);
    window.open(`https://t.me/${app.telegram_username}?text=${encodeURIComponent(message)}`, "_blank");
    setMessagingId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="bg-amber-500/10 text-amber-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "approved":
        return <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "rejected":
        return <Badge variant="secondary" className="bg-destructive/10 text-destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case "contacted":
        return <Badge variant="secondary" className="bg-blue-500/10 text-blue-500"><Phone className="h-3 w-3 mr-1" />Contacted</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
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
    all: applications?.length || 0,
    pending: applications?.filter((a) => (a.status || "pending") === "pending").length || 0,
    contacted: applications?.filter((a) => a.status === "contacted").length || 0,
    approved: applications?.filter((a) => a.status === "approved").length || 0,
    rejected: applications?.filter((a) => a.status === "rejected").length || 0,
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "contacted", label: "Contacted" },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
  ];

  const filteredApplications =
    statusFilter === "all"
      ? applications
      : applications?.filter((a) => (a.status || "pending") === statusFilter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Account Management Applications
          {applications && applications.length > 0 && (
            <Badge variant="secondary" className="ml-2">{applications.length}</Badge>
          )}
        </CardTitle>

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
                `Delete ${selectedIds.length} selected application${selectedIds.length === 1 ? "" : "s"} permanently?\n\nThis cannot be undone.`
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
            disabled={!filteredApplications || filteredApplications.length === 0}
            onClick={() => {
              const visibleIds = (filteredApplications || []).map((a) => a.id);
              const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
              setSelectedIds((prev) =>
                allVisibleSelected
                  ? prev.filter((id) => !visibleIds.includes(id))
                  : Array.from(new Set([...prev, ...visibleIds]))
              );
            }}
          >
            {filteredApplications && filteredApplications.length > 0 && filteredApplications.every((a) => selectedIds.includes(a.id))
              ? "Unselect All"
              : "Select All"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {filterTabs.map((tab) => (
            <button
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
        {!filteredApplications || filteredApplications.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {statusFilter === "all" ? "No applications yet" : `No ${statusFilter} applications`}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <Card key={app.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <input
                          type="checkbox"
                          aria-label={`Select ${app.name || "application"}`}
                          checked={selectedIds.includes(app.id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, app.id]))
                                : prev.filter((id) => id !== app.id)
                            )
                          }
                          className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                        />
                        <span className="font-semibold text-lg">{app.name}</span>
                        {getStatusBadge(app.status || "pending")}
                        {app.submission_type === "broker_login" ? (
                          <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400 gap-1">
                            <Globe className="h-3 w-3" />
                            Broker Login
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Key className="h-3 w-3" />
                            Trading Account
                          </Badge>
                        )}
                        {app.account_size && <Badge variant="outline">{app.account_size}</Badge>}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {app.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4" />
                            <a href={`mailto:${app.email}`} className="hover:text-primary">{app.email}</a>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{app.whatsapp}</span>
                        </div>
                        {app.telegram_username && (
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2 flex-wrap text-muted-foreground">
                              <Send className="h-4 w-4 text-sky-500" />
                              <span>@{app.telegram_username}</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openTelegramComposer(app)}
                                className="h-6 px-2 text-[11px] border-sky-500/30 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 gap-1"
                              >
                                <Send className="h-3 w-3" />
                                Telegram
                              </Button>
                            </div>
                            <span
                              className={`text-[11px] font-semibold pl-6 ${
                                app.telegram_chat_id ? "text-emerald-500" : "text-amber-500"
                              }`}
                            >
                              {app.telegram_chat_id ? "(bot linked)" : "(not linked yet)"}
                            </span>
                          </div>
                        )}
                        {app.preferred_broker && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            {app.preferred_broker} {app.platform_type && `(${app.platform_type})`}
                          </div>
                        )}
                      </div>

                      {messagingId === app.id && (
                        <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
                          <Label className="text-[11px] flex items-center gap-1 text-muted-foreground">
                            <Send className="h-3 w-3" />
                            Telegram message — edit before sending
                          </Label>
                          <Textarea
                            className="text-sm min-h-[90px]"
                            value={messageDrafts[app.id] ?? ""}
                            onChange={(e) =>
                              setMessageDrafts((prev) => ({ ...prev, [app.id]: e.target.value }))
                            }
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="h-8 text-xs bg-sky-600 hover:bg-sky-700"
                              onClick={() => sendTelegramMessage(app)}
                            >
                              Send via Telegram
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs"
                              onClick={() => setMessagingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {(app.broker_server || app.trading_login || app.trading_password) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mt-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                          {app.broker_server && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Server className="h-4 w-4 text-primary" />
                              <span className="font-mono text-xs">{app.broker_server}</span>
                            </div>
                          )}
                          {app.trading_login && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Key className="h-4 w-4 text-emerald-500" />
                              <span className="font-mono text-xs">Login: <span className="font-bold text-foreground">{app.trading_login}</span></span>
                            </div>
                          )}
                          {app.trading_password && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Lock className="h-4 w-4 text-amber-500" />
                              <span className="font-mono text-xs">
                                Pass: <span className="font-bold text-foreground">{visiblePasswords[app.id] ? app.trading_password : '••••••••'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(app.id)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                              >
                                {visiblePasswords[app.id] ? (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {(app.broker_site_name || app.broker_email || app.broker_password) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm mt-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                          {app.broker_site_name && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Globe className="h-4 w-4 text-sky-500" />
                              <span className="font-mono text-xs">{app.broker_site_name}</span>
                            </div>
                          )}
                          {app.broker_email && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4 text-emerald-500" />
                              <a href={`mailto:${app.broker_email}`} className="font-mono text-xs hover:text-primary">{app.broker_email}</a>
                            </div>
                          )}
                          {app.broker_password && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Lock className="h-4 w-4 text-amber-500" />
                              <span className="font-mono text-xs">
                                Pass: <span className="font-bold text-foreground">{visiblePasswords[app.id] ? app.broker_password : '••••••••'}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(app.id)}
                                className="p-1 hover:bg-muted rounded transition-colors"
                              >
                                {visiblePasswords[app.id] ? (
                                  <EyeOff className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {app.note && (
                        <div className="flex items-start gap-2 text-sm mt-1 p-2 rounded-lg bg-muted/20 border border-border/20 text-muted-foreground">
                          <StickyNote className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{app.note}</span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Applied: {format(new Date(app.created_at), 'PPp')}
                      </p>
                    </div>

                    <div className="flex flex-col items-stretch lg:items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                          onClick={() => window.open(`https://wa.me/${app.whatsapp.replace(/\D/g, '')}?text=Hi ${encodeURIComponent(app.name)}, regarding your Account Management application${app.account_size ? ` for ${encodeURIComponent(app.account_size)} account` : ""}...`, '_blank')}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          WhatsApp
                        </Button>
                        <Select
                          value={app.status || 'pending'}
                          onValueChange={(value) => updateStatusMutation.mutate({ id: app.id, status: value })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs border-destructive/30 text-destructive hover:bg-destructive/10 self-start lg:self-end"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete ${app.name || "this application"} permanently?\n\nThis cannot be undone.`
                          );
                          if (confirmed) deleteMutation.mutate(app.id);
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountApplications;
