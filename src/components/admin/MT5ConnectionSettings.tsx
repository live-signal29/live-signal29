import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";

type Field = {
  key: string;
  configured: boolean;
  source: "admin" | "secret" | "none";
  preview: string | null;
  updated_at: string | null;
};

type StatusResponse = {
  fields?: Field[];
  connection?: {
    ok: boolean;
    message: string;
    account?: string | null;
  };
};

const KEYS = [
  "METAAPI_TOKEN",
  "MT5_LOGIN",
  "MT5_SERVER",
  "MT5_PASSWORD",
] as const;

const LABELS: Record<string, string> = {
  METAAPI_TOKEN: "MetaApi Token",
  MT5_LOGIN: "MT5 Login",
  MT5_SERVER: "MT5 Server",
  MT5_PASSWORD: "MT5 Password",
};

const PLACEHOLDERS: Record<string, string> = {
  METAAPI_TOKEN: "Paste your new MetaApi token",
  MT5_LOGIN: "Enter MT5 login number",
  MT5_SERVER: "Enter exact MT5 server name",
  MT5_PASSWORD: "Enter MT5 trading password",
};

const MT5ConnectionSettings = () => {
  const queryClient = useQueryClient();

  const [values, setValues] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const {
    data,
    error: statusError,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ["mt5-settings-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("mt5-settings", {
        body: { action: "status" },
      });

      if (error) {
        throw new Error(error.message || "Could not connect to MT5 settings");
      }

      return data as StatusResponse;
    },
    retry: 1,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = Object.fromEntries(
        Object.entries(values).filter(([, value]) => value.trim().length > 0),
      );

      if (Object.keys(payload).length === 0) {
        throw new Error("Please enter at least one value.");
      }

      const { data, error } = await supabase.functions.invoke("mt5-settings", {
        body: {
          action: "save",
          ...payload,
        },
      });

      if (error) {
        throw new Error(error.message || "Could not save MT5 settings");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },

    onSuccess: () => {
      setValues({});

      toast.success("MT5 credentials saved securely.");

      queryClient.invalidateQueries({
        queryKey: ["mt5-settings-status"],
      });
    },

    onError: (error: any) => {
      toast.error(error?.message || "Save failed");
    },
  });

  const testConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("mt5-settings", {
        body: { action: "test" },
      });

      if (error) {
        throw new Error(error.message || "Connection test failed");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as StatusResponse;
    },

    onSuccess: (result) => {
      queryClient.setQueryData(
        ["mt5-settings-status"],
        result,
      );

      if (result.connection?.ok) {
        toast.success(
          result.connection.message || "MT5 connection successful.",
        );
      } else {
        toast.error(
          result.connection?.message || "MT5 connection failed.",
        );
      }
    },

    onError: (error: any) => {
      toast.error(error?.message || "Connection test failed");
    },
  });

  const getField = (key: string) => {
    return data?.fields?.find((field) => field.key === key);
  };

  const connection = data?.connection;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Lock className="h-4 w-4" />
          MT5 / MetaApi Connection
        </CardTitle>

        <CardDescription className="text-xs sm:text-sm">
          Enter your MetaApi token and MT5 account credentials. Values are
          stored server-side and are never returned to the frontend.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">

        {/* Connection status */}
        {isLoading ? (
          <Alert>
            <AlertDescription className="flex items-center gap-2 text-xs sm:text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking MT5 connection...
            </AlertDescription>
          </Alert>
        ) : statusError ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />

            <AlertDescription className="text-xs sm:text-sm">
              MT5 settings backend could not be reached.
              <br />
              {statusError instanceof Error
                ? statusError.message
                : "Please try again."}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant={connection?.ok ? "default" : "destructive"}>
            <AlertDescription className="flex items-start gap-2 text-xs sm:text-sm">
              {connection?.ok ? (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              )}

              <span>
                {connection?.message ||
                  "Enter MT5 credentials and test the connection."}

                {connection?.account
                  ? ` (${connection.account})`
                  : ""}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* MT5 fields */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* MetaApi Token */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="METAAPI_TOKEN">
                MetaApi Token
              </Label>

              <Badge
                variant={
                  getField("METAAPI_TOKEN")?.configured
                    ? "secondary"
                    : "outline"
                }
              >
                {getField("METAAPI_TOKEN")?.configured
                  ? "Saved"
                  : "Not set"}
              </Badge>
            </div>

            <div className="relative">
              <Input
                id="METAAPI_TOKEN"
                type={showToken ? "text" : "password"}
                autoComplete="off"
                placeholder={PLACEHOLDERS.METAAPI_TOKEN}
                value={values.METAAPI_TOKEN || ""}
                onChange={(e) =>
                  setValues((previous) => ({
                    ...previous,
                    METAAPI_TOKEN: e.target.value,
                  }))
                }
                className="pr-11"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8"
                onClick={() => setShowToken((value) => !value)}
              >
                {showToken ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* MT5 Login */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="MT5_LOGIN">
                MT5 Login
              </Label>

              <Badge
                variant={
                  getField("MT5_LOGIN")?.configured
                    ? "secondary"
                    : "outline"
                }
              >
                {getField("MT5_LOGIN")?.configured
                  ? "Saved"
                  : "Not set"}
              </Badge>
            </div>

            <Input
              id="MT5_LOGIN"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder={PLACEHOLDERS.MT5_LOGIN}
              value={values.MT5_LOGIN || ""}
              onChange={(e) =>
                setValues((previous) => ({
                  ...previous,
                  MT5_LOGIN: e.target.value,
                }))
              }
            />
          </div>

          {/* MT5 Server */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="MT5_SERVER">
                MT5 Server
              </Label>

              <Badge
                variant={
                  getField("MT5_SERVER")?.configured
                    ? "secondary"
                    : "outline"
                }
              >
                {getField("MT5_SERVER")?.configured
                  ? "Saved"
                  : "Not set"}
              </Badge>
            </div>

            <Input
              id="MT5_SERVER"
              type="text"
              autoComplete="off"
              placeholder={PLACEHOLDERS.MT5_SERVER}
              value={values.MT5_SERVER || ""}
              onChange={(e) =>
                setValues((previous) => ({
                  ...previous,
                  MT5_SERVER: e.target.value,
                }))
              }
            />
          </div>

          {/* MT5 Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="MT5_PASSWORD">
                MT5 Password
              </Label>

              <Badge
                variant={
                  getField("MT5_PASSWORD")?.configured
                    ? "secondary"
                    : "outline"
                }
              >
                {getField("MT5_PASSWORD")?.configured
                  ? "Saved"
                  : "Not set"}
              </Badge>
            </div>

            <div className="relative">
              <Input
                id="MT5_PASSWORD"
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                placeholder={PLACEHOLDERS.MT5_PASSWORD}
                value={values.MT5_PASSWORD || ""}
                onChange={(e) =>
                  setValues((previous) => ({
                    ...previous,
                    MT5_PASSWORD: e.target.value,
                  }))
                }
                className="pr-11"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-8 w-8"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-2">

          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            {save.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}

            Save securely
          </Button>

          <Button
            variant="outline"
            onClick={() => testConnection.mutate()}
            disabled={testConnection.isPending || isFetching}
          >
            {testConnection.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}

            Test connection
          </Button>
        </div>

      </CardContent>
    </Card>
  );
};

export default MT5ConnectionSettings;
