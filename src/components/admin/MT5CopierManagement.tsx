import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

// The generated Supabase types haven't been regenerated to include this
// table/view yet, so we cast the client to `any` for these calls.
const db = supabase as any;

interface CopierRequest {
  id: string;
  name: string | null;
  contact_number: string | null;
  mt5_login: string;
  broker_name: string;
  broker_server: string;
  mt5_password: string;
  note: string | null;
  status: string;
  is_public: boolean;
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
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingConnId, setEditingConnId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Partial<CopierRequest>>>({});

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
      toast.success("Saved");
    },
    onError: (err: any) => {
      toast.error("Failed to save", { description: err?.message });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("mt5-copier-sync", {
        body: { request_id: requestId },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result && !result.success) throw new Error(result.error || "Sync failed");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mt5-copier-requests"] });
      toast.success("Synced with the real MT5 account");
    },
    onError: (err: any) => {
      toast.error("Sync failed", { description: err?.message });
    },
  });

  const getDraft = (req: CopierRequest, field: keyof CopierRequest) =>
    drafts[req.id]?.[field] !== undefined ? drafts[req.id][field] : req[field];

  const setDraft = (id: string, field: keyof CopierRequest, value: any) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const savePerformance = (req: CopierRequest) => {
    const d = drafts[req.id] || {};
    updateMutation.mutate({
      id: req.id,
      updates: {
        profit_amount: d.profit_amount !== undefined ? Number(d.profit_amount) || null : req.profit_amount,
        loss_amount: d.loss_amount !== undefined ? Number(d.loss_amount) || null : req.loss_amount,
        risk_reward_ratio: d.risk_reward_ratio !== undefined ? (d.risk_reward_ratio as string) : req.risk_reward_ratio,
        profit_percent: d.profit_percent !== undefined ? Number(d.profit_percent) || null : req.profit_percent,
        loss_percent: d.loss_percent !== undefined ? Number(d.loss_percent) || null : req.loss_percent,
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
        // Clear any old sync error and force a fresh MetaApi account
        // lookup, since the login/server may have just changed.
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
          Performance numbers now sync automatically every 15 minutes from each user's own
          MT5 account (real profit/loss). Use "Sync Now" to check immediately, or edit the
          numbers by hand below if needed. Flip "Show on public Copier List" to control
          visibility — login, password, broker and contact stay admin-only either way.
        </p>
      </CardHeader>
      <CardContent>
        {!requests || requests.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No MT5 copier requests yet</p>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const isExpanded = expandedId === req.id;
              return (
                <Card key={req.id} className="border-border/50">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-lg">{req.name || "Unnamed"}</span>
                        {getStatusBadge(req.status)}
                        {req.is_public && (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            Public
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`public-${req.id}`} className="text-xs text-muted-foreground">
                            Show on public Copier List
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
                          <SelectTrigger className="w-[130px] h-8 text-xs">
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
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{req.contact_number}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Server className="h-4 w-4 text-primary" />
                            <span className="font-mono text-xs">{req.broker_name} — {req.broker_server}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Key className="h-4 w-4 text-emerald-500" />
                            <span className="font-mono text-xs">Login: <span className="font-bold text-foreground">{req.mt5_login}</span></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm">
                          <Lock className="h-4 w-4 text-amber-500" />
                          <span className="font-mono text-xs text-muted-foreground">
                            Pass: <span className="font-bold text-foreground">
                              {visiblePasswords[req.id] ? req.mt5_password : "••••••••"}
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
                      </>
                    )}

                    {req.note && (
                      <p className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">{req.note}</p>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Submitted: {format(new Date(req.created_at), "PPp")}
                      {req.last_synced_at && (
                        <> · Last synced: {format(new Date(req.last_synced_at), "PPp")}</>
                      )}
                    </p>

                    {req.sync_error && (
                      <div className="flex items-start gap-1.5 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>Last sync failed: {req.sync_error}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                        className="flex items-center gap-1 text-xs font-medium text-primary"
                      >
                        <Gauge className="h-3.5 w-3.5" />
                        Performance details
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => syncMutation.mutate(req.id)}
                        disabled={syncMutation.isPending}
                        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                        Sync Now
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                        <div className="space-y-1">
                          <Label className="text-[11px] flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" /> Profit ($)
                          </Label>
                          <Input
                            type="number"
                            className="h-8 text-sm"
                            value={getDraft(req, "profit_amount") ?? ""}
                            onChange={(e) => setDraft(req.id, "profit_amount", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] flex items-center gap-1">
                            <TrendingDown className="h-3 w-3 text-destructive" /> Loss ($)
                          </Label>
                          <Input
                            type="number"
                            className="h-8 text-sm"
                            value={getDraft(req, "loss_amount") ?? ""}
                            onChange={(e) => setDraft(req.id, "loss_amount", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Risk:Reward</Label>
                          <Input
                            placeholder="1:3"
                            className="h-8 text-sm"
                            value={getDraft(req, "risk_reward_ratio") ?? ""}
                            onChange={(e) => setDraft(req.id, "risk_reward_ratio", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Profit %</Label>
                          <Input
                            type="number"
                            className="h-8 text-sm"
                            value={getDraft(req, "profit_percent") ?? ""}
                            onChange={(e) => setDraft(req.id, "profit_percent", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Loss %</Label>
                          <Input
                            type="number"
                            className="h-8 text-sm"
                            value={getDraft(req, "loss_percent") ?? ""}
                            onChange={(e) => setDraft(req.id, "loss_percent", e.target.value)}
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-5">
                          <Button
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => savePerformance(req)}
                            disabled={updateMutation.isPending}
                          >
                            {updateMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            ) : null}
                            Save Performance
                          </Button>
                        </div>
                      </div>
                    )}
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
