import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ShieldCheck, ShieldAlert, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";

type Field = {
  key: string;
  configured: boolean;
  source: "admin" | "secret" | "none";
  preview: string | null;
  updated_at: string | null;
};

type StatusResponse = {
  fields: Field[];
  connection: { ok: boolean; message: string; account?: string | null };
};

const LABELS: Record<string, string> = {
  METAAPI_TOKEN: "MetaApi Token",
  MT5_LOGIN: "MT5 Login",
  MT5_SERVER: "MT5 Server",
  MT5_PASSWORD: "MT5 Password",
};

const PLACEHOLDERS: Record<string, string> = {
  METAAPI_TOKEN: "Paste new MetaApi token",
  MT5_LOGIN: "e.g. 123456789",
  MT5_SERVER: "e.g. Exness-MT5Trial8",
  MT5_PASSWORD: "MT5 investor/master password",
};

const MT5ConnectionSettings = () => {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["mt5-settings-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mt5-settings", {
        body: { action: "status" },
      });
      if (error) throw error;
      return data as StatusResponse;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, v]) => v.trim().length > 0),
      );
      if (Object.keys(payload).length === 0) throw new Error("Kuch value daalein pehle");
      const { data, error } = await supabase.functions.invoke("mt5-settings", {
        body: { action: "save", ...payload },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setValues({});
      toast.success("Credentials securely saved — backend only");
      queryClient.invalidateQueries({ queryKey: ["mt5-settings-status"] });
    },
    onError: (e: any) => toast.error(e?.message || "Save failed"),
  });

  const connection = data?.connection;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Lock className="h-4 w-4" />
          MT5 / MetaApi Connection
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Values are stored server-side and used only by backend functions. They are never sent to
          the frontend — saved values can only be replaced, never read back.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : (
          <Alert variant={connection?.ok ? "default" : "destructive"}>
            <AlertDescription className="flex items-start gap-2 text-xs sm:text-sm">
              {connection?.ok ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {connection?.message}
                {connection?.account ? ` (${connection.account})` : ""}
              </span>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {(data?.fields || []).map((field) => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={field.key} className="text-xs sm:text-sm">
                  {LABELS[field.key] || field.key}
                </Label>
                <Badge variant={field.configured ? "secondary" : "outline"} className="text-[10px]">
                  {field.configured
                    ? field.source === "admin"
                      ? `saved ${field.preview}`
                      : `secret ${field.preview}`
                    : "not set"}
                </Badge>
              </div>
              <Input
                id={field.key}
                type="password"
                autoComplete="off"
                placeholder={PLACEHOLDERS[field.key] || "New value"}
                value={values[field.key] || ""}
                onChange={(e) => setValues((p) => ({ ...p, [field.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save securely
          </Button>
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["mt5-settings-status"] })}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Test connection
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MT5ConnectionSettings;
