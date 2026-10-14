import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Send, Eraser } from "lucide-react";
import { parseSignalText } from "@/lib/parseSignalText";

/* =========================================================
   QUICK SIGNAL (PASTE)

   Paste signal text -> preview (editable) -> Publish.
   Saves exactly like the normal "Add Signal" form:
   same table, same fields, same Telegram + MT5 background
   calls, so the card looks the same on the dashboard.
========================================================= */

const PLACEHOLDER = `Gold buy now 4154-4152

Tp 4161
Tp 4169-4179
Sl 4144`;

const QuickSignalPaste = () => {
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);

  const parsed = useMemo(() => parseSignalText(text), [text]);

  // Editable copy of what was detected
  const [draft, setDraft] = useState(parsed);

  useEffect(() => {
    setDraft(parsed);
  }, [parsed]);

  const set = (field: string, value: string) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const hasText = text.trim().length > 0;

  const missing =
    !draft.pair ||
    !draft.type ||
    !draft.entry ||
    !draft.tp1 ||
    !draft.sl;

  /* ---------- live warnings on the edited values ---------- */

  const warnings = useMemo(() => {
    const w: string[] = [];

    if (!draft.pair) w.push("Pair is required.");
    if (!draft.type) w.push("Select Buy or Sell.");
    if (!draft.entry) w.push("Entry is required.");
    if (!draft.tp1) w.push("TP1 is required.");
    if (!draft.sl) w.push("Stop loss is required.");

    const e = parseFloat(draft.entry);
    const sl = parseFloat(draft.sl);
    const tps = [draft.tp1, draft.tp2, draft.tp3]
      .filter(Boolean)
      .map((v) => parseFloat(v));

    if (draft.type && Number.isFinite(e) && Number.isFinite(sl) && tps.length) {
      const buy = draft.type === "Buy";

      if (buy ? sl >= e : sl <= e) {
        w.push("Stop loss is on the wrong side of entry.");
      }

      if (tps.some((v) => (buy ? v <= e : v >= e))) {
        w.push("A TP is on the wrong side of entry.");
      }
    }

    return w;
  }, [draft]);

  /* =======================================================
     PUBLISH
  ======================================================= */

  const handlePublish = async () => {
    if (loading || missing) return;

    const entryPrice = parseFloat(draft.entry);
    const hasNumericEntry = Number.isFinite(entryPrice) && entryPrice > 0;

    if (!hasNumericEntry) {
      toast.error("Entry must be a valid number");
      return;
    }

    setLoading(true);

    try {
      const isLimitOrder = draft.entry_mode === "limit";
      const lifecycle = isLimitOrder ? "pending" : "open";

      const cleanedData = {
        pair: draft.pair.trim(),
        type: draft.type,
        category: draft.category || "FOREX",
        main_category: draft.category || "FOREX",
        sub_category: draft.pair.trim() || null,

        entry: String(draft.entry),
        current_price: String(entryPrice),
        entry_mode: draft.entry_mode,

        limit_entry_price: isLimitOrder ? entryPrice : null,

        is_activated: !isLimitOrder,
        activated_at: isLimitOrder ? null : new Date().toISOString(),

        tp1: draft.tp1,
        tp2: draft.tp2 || null,
        tp3: draft.tp3 || null,
        sl: draft.sl,

        note: null,
        profit_note: null,

        status: lifecycle,
        signal_status: lifecycle,

        signal_type: null,
        risk_level: null,
        analysis_reason: null,

        is_premium: isPremium,
        published: true,
        tag: null,
        signal_raw_text: text.trim() || null,
      };

      const { data: inserted, error } = await supabase
        .from("signals")
        .insert([cleanedData])
        .select("id, pair, type, entry, tp1, tp2, tp3, sl")
        .single();

      if (error) {
        console.error("Quick signal creation error:", error);
        toast.error("Failed to create signal. Please try again.");
        return;
      }

      toast.success("Signal created successfully");

      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });

      setText("");
      setIsPremium(false);

      /* ---------------- TELEGRAM (background) ---------------- */

      void supabase.functions
        .invoke("telegram-signal-post", {
          body: { signal: cleanedData, action: "new_signal" },
        })
        .then(({ data: tgData, error: tgError }) => {
          if (tgError) {
            console.error("Telegram post error:", tgError);
            toast.error("Signal saved, but Telegram post failed");
            return;
          }

          if (tgData?.skipped) {
            toast.info(
              "Saved. Not posted to Telegram (outside current market session)."
            );
            return;
          }

          toast.success("Posted to Telegram");

          if (inserted?.id && tgData?.message_id) {
            void supabase
              .from("signals")
              .update({
                telegram_message_id: tgData.message_id,
                telegram_chat_id: tgData.chat_id
                  ? String(tgData.chat_id)
                  : null,
              })
              .eq("id", inserted.id);
          }
        })
        .catch((err) => {
          console.error("Telegram request error:", err);
        });

      /* ---------------- MT5 (background) ---------------- */

      if (inserted) {
        const num = (v: any) => {
          const n = parseFloat(String(v));
          return Number.isFinite(n) ? n : undefined;
        };

        void supabase.functions
          .invoke("mt5-demo-trade", {
            body: {
              action: "open_multi",
              signal_id: inserted.id,
              symbol: inserted.pair,
              trade_type: inserted.type === "Buy" ? "buy" : "sell",
              entry: num(inserted.entry),
              sl: num(inserted.sl),
              tp1: num(inserted.tp1),
              tp2: num(inserted.tp2),
              tp3: num(inserted.tp3),
              lot_size: 0.01,
            },
          })
          .then(({ error: mt5Error }) => {
            if (mt5Error) {
              console.error("MT5 auto-trade error:", mt5Error);
              toast.error("Signal saved, but MT5 trade failed to open");
            } else {
              toast.success("MT5 trades opened");
            }
          })
          .catch((err) => {
            console.error("MT5 request error:", err);
          });
      }
    } catch (err) {
      console.error("Quick signal error:", err);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     UI
  ======================================================= */

  const field = (label: string, key: string, tone = "") => (
    <div>
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        inputMode="decimal"
        value={(draft as any)[key] || ""}
        onChange={(e) => set(key, e.target.value)}
        className={`mt-0.5 h-9 text-sm font-semibold ${tone}`}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {/* PASTE BOX */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <Label className="text-xs font-semibold text-slate-700">
          Paste signal text
        </Label>

        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          className="mt-1.5 text-sm"
        />

        <p className="mt-1.5 text-[11px] text-slate-500">
          Pair (Gold = XAU/USD), Buy/Sell, entry, TP and SL are detected
          automatically. If a price is a range (4154-4152), the first price
          is used.
        </p>

        {hasText && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 rounded-xl"
            onClick={() => setText("")}
          >
            <Eraser className="mr-1.5 h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* PREVIEW */}
      {hasText && (
        <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-3 shadow-sm">
          <h3 className="text-xs font-semibold text-emerald-800">
            Detected signal (you can edit)
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Label className="text-[11px] text-muted-foreground">Pair</Label>
              <Input
                value={draft.pair}
                onChange={(e) => set("pair", e.target.value)}
                className="mt-0.5 h-9 text-sm font-semibold"
              />
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Type</Label>
              <Select
                value={draft.type || undefined}
                onValueChange={(v) => set("type", v)}
              >
                <SelectTrigger className="mt-0.5 h-9 text-sm">
                  <SelectValue placeholder="Buy / Sell" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Buy">Buy</SelectItem>
                  <SelectItem value="Sell">Sell</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">
                Entry mode
              </Label>
              <Select
                value={draft.entry_mode}
                onValueChange={(v) => set("entry_mode", v)}
              >
                <SelectTrigger className="mt-0.5 h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">Market (now)</SelectItem>
                  <SelectItem value="limit">Limit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {field("Entry", "entry")}
            {field("Stop Loss", "sl", "text-red-600")}
            {field("TP1", "tp1", "text-emerald-600")}
            {field("TP2", "tp2", "text-blue-600")}
            {field("TP3", "tp3", "text-indigo-600")}
          </div>

          <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
            <Label className="text-xs font-medium text-slate-700">
              Premium signal
            </Label>
            <Switch checked={isPremium} onCheckedChange={setIsPremium} />
          </div>

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-2.5">
              {warnings.map((w) => (
                <p
                  key={w}
                  className="flex items-start gap-1.5 text-xs text-amber-800"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {w}
                </p>
              ))}
            </div>
          )}

          <Button
            type="button"
            onClick={handlePublish}
            disabled={loading || missing}
            className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish signal
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuickSignalPaste;
