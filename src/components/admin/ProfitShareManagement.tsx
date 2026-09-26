import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  HandCoins,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  Link2Off,
  RefreshCw,
  Percent,
  Trash2,
} from "lucide-react";

// The generated Supabase types don't know about this table yet (same
// pattern used in MT5CopierManagement.tsx) — cast once here instead.
const db = supabase as any;

type Source = "copier" | "account_management";

interface ClientOption {
  id: string;
  name: string;
  telegramChatId: number | null;
  telegramUsername: string | null;
}

interface ProfitShareRequest {
  id: string;
  source: Source;
  client_name: string;
  telegram_chat_id: number | null;
  profit_amount: number;
  share_percent: number;
  share_amount: number;
  status: "awaiting_payment" | "payment_claimed" | "verified" | "rejected";
  created_at: string;
  claimed_at: string | null;
  verified_at: string | null;
}

const STATUS_LABEL: Record<ProfitShareRequest["status"], string> = {
  awaiting_payment: "Awaiting payment",
  payment_claimed: "Payment claimed — verify",
  verified: "Verified & paid",
  rejected: "Rejected",
};

const StatusBadge = ({ status }: { status: ProfitShareRequest["status"] }) => {
  const styles: Record<ProfitShareRequest["status"], string> = {
    awaiting_payment: "bg-amber-500/10 text-amber-600",
    payment_claimed: "bg-blue-500/10 text-blue-600",
    verified: "bg-emerald-500/10 text-emerald-600",
    rejected: "bg-destructive/10 text-destructive",
  };
  return (
    <Badge variant="secondary" className={styles[status]}>
      {STATUS_LABEL[status]}
    </Badge>
  );
};

const ProfitShareManagement = () => {
  const queryClient = useQueryClient();

  const [source, setSource] = useState<Source>("copier");
  const [clientId, setClientId] = useState<string>("");
  const [profit, setProfit] = useState<string>("");
  const [percent, setPercent] = useState<string>("");

  /* ---------------------------------------------------------
     Client lists — reused as-is from the existing Copy Management
     and Account Management tables. Nothing here writes to either.
  --------------------------------------------------------- */

  const { data: copierClients } = useQuery({
    queryKey: ["profit-share-copier-clients"],
    queryFn: async () => {
      const { data, error } = await db
        .from("mt5_copier_requests")
        .select("id, name, telegram_chat_id, telegram_username")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r: any): ClientOption => ({
          id: r.id,
          name: r.name || "Unnamed",
          telegramChatId: r.telegram_chat_id,
          telegramUsername: r.telegram_username,
        })
      );
    },
  });

  const { data: accountClients } = useQuery({
    queryKey: ["profit-share-account-clients"],
    queryFn: async () => {
      const { data, error } = await db
        .from("account_management_applications")
        .select("id, name, telegram_chat_id, telegram_username")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (r: any): ClientOption => ({
          id: r.id,
          name: r.name || "Unnamed",
          telegramChatId: r.telegram_chat_id,
          telegramUsername: r.telegram_username,
        })
      );
    },
  });

  const clients = source === "copier" ? copierClients : accountClients;
  const selectedClient = clients?.find((c) => c.id === clientId) ?? null;

  const shareAmount = useMemo(() => {
    const p = parseFloat(profit);
    const pct = parseFloat(percent);
    if (!Number.isFinite(p) || !Number.isFinite(pct)) return null;
    return Math.round(p * (pct / 100) * 100) / 100;
  }, [profit, percent]);

  /* ---------------------------------------------------------
     Requests list (polls — this repo doesn't use Supabase Realtime
     anywhere else, so this matches the existing pattern)
  --------------------------------------------------------- */

  const { data: requests, isLoading } = useQuery({
    queryKey: ["profit-share-requests"],
    queryFn: async () => {
      const { data, error } = await db
        .from("profit_share_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfitShareRequest[];
    },
    refetchInterval: 15000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["profit-share-requests"] });
  };

  const sendRequestMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClient) throw new Error("Pick a client first");
      if (!selectedClient.telegramChatId) {
        throw new Error("This client hasn't linked Telegram yet");
      }
      const p = parseFloat(profit);
      const pct = parseFloat(percent);
      if (!Number.isFinite(p) || p < 0) throw new Error("Enter a valid profit amount");
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        throw new Error("Enter a valid share percentage (0-100)");
      }
      const amount = Math.round(p * (pct / 100) * 100) / 100;

      const { data: inserted, error: insertError } = await db
        .from("profit_share_requests")
        .insert({
          source,
          copier_request_id: source === "copier" ? selectedClient.id : null,
          account_application_id: source === "account_management" ? selectedClient.id : null,
          client_name: selectedClient.name,
          telegram_chat_id: selectedClient.telegramChatId,
          telegram_username: selectedClient.telegramUsername,
          profit_amount: p,
          share_percent: pct,
          share_amount: amount,
        })
        .select("id")
        .single();
      if (insertError) throw insertError;

      const { data: fnResult, error: fnError } = await supabase.functions.invoke(
        "profit-share",
        { body: { action: "notify", requestId: inserted.id } }
      );
      if (fnError) throw fnError;
      if (!fnResult?.success) throw new Error(fnResult?.error || "Failed to send Telegram message");

      return inserted.id;
    },
    onSuccess: () => {
      toast.success("Payment request sent via Telegram");
      setClientId("");
      setProfit("");
      setPercent("");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error("Couldn't send payment request", { description: err?.message });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("profit-share", {
        body: { action: "confirm", requestId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to send receipt");
    },
    onSuccess: () => {
      toast.success("Receipt sent — client notified");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error("Couldn't send receipt", { description: err?.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await db
        .from("profit_share_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request rejected");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error("Failed to reject", { description: err?.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await db.from("profit_share_requests").delete().eq("id", requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request deleted");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error("Failed to delete", { description: err?.message });
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("profit-share", {
        body: { action: "notify", requestId },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to resend");
    },
    onSuccess: () => {
      toast.success("Payment request re-sent");
      invalidateAll();
    },
    onError: (err: any) => {
      toast.error("Couldn't resend", { description: err?.message });
    },
  });

  return (
    <div className="space-y-6">
      {/* =================================================
          NEW PAYMENT REQUEST
      ================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HandCoins className="h-5 w-5" />
            Profit Share — New Payment Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Client list</Label>
              <Select
                value={source}
                onValueChange={(v) => {
                  setSource(v as Source);
                  setClientId("");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="copier">Copy Management clients</SelectItem>
                  <SelectItem value="account_management">
                    Account Management clients
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Client</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {(clients ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {!c.telegramChatId ? " (Telegram not linked)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedClient && !selectedClient.telegramChatId && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              <Link2Off className="h-4 w-4 shrink-0" />
              This client hasn't opened the Telegram bot's personal link yet, so a
              payment request can't be sent until they do.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Profit ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="1000"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Profit share (%)</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="20"
                  value={percent}
                  onChange={(e) => setPercent(e.target.value)}
                />
                <Percent className="h-4 w-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Share amount (auto)</Label>
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted/40 font-semibold">
                {shareAmount !== null ? `$${shareAmount}` : "—"}
              </div>
            </div>
          </div>

          <Button
            className="w-full sm:w-auto"
            disabled={
              !selectedClient ||
              !selectedClient.telegramChatId ||
              sendRequestMutation.isPending
            }
            onClick={() => sendRequestMutation.mutate()}
          >
            {sendRequestMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Send Payment Request via Telegram
          </Button>
        </CardContent>
      </Card>

      {/* =================================================
          REQUESTS LIST
      ================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Payment Requests
            {requests && requests.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {requests.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !requests || requests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No payment requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {requests.map((r) => (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{r.client_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {r.source === "copier" ? "Copy Management" : "Account Management"}
                        </Badge>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Profit ${r.profit_amount} × {r.share_percent}% ={" "}
                        <span className="font-semibold text-foreground">
                          ${r.share_amount}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Sent {format(new Date(r.created_at), "PPp")}
                        {r.claimed_at &&
                          ` · Claimed ${format(new Date(r.claimed_at), "PPp")}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {r.status === "awaiting_payment" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resendMutation.isPending}
                          onClick={() => resendMutation.mutate(r.id)}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          Resend
                        </Button>
                      )}
                      {(r.status === "payment_claimed" || r.status === "awaiting_payment") && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700"
                          disabled={confirmMutation.isPending}
                          onClick={() => confirmMutation.mutate(r.id)}
                        >
                          {confirmMutation.isPending ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Verify & Send Receipt
                        </Button>
                      )}
                      {r.status !== "verified" && r.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate(r.id)}
                        >
                          Reject
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={deleteMutation.isPending}
                        onClick={() => {
                          const confirmed = window.confirm(
                            `Delete this payment request for ${r.client_name} permanently?\n\nThis cannot be undone.`
                          );
                          if (confirmed) deleteMutation.mutate(r.id);
                        }}
                      >
                        {deleteMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitShareManagement;
