import { memo, useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { signalSchema } from "@/lib/validations";
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  Tag,
} from "lucide-react";

interface SignalFormProps {
  onSuccess: () => void;
  editSignal?: any;
}

const SUB_CATEGORY_OPTIONS: Record<string, string[]> = {
  FOREX: [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "CHF/JPY",
    "CAD/JPY",
    "AUD/USD",
    "NZD/USD",
    "USD/CAD",
    "USD/CHF",
  ],
  COMMODITIES: [
    "XAU/USD (Gold)",
    "XAG/USD (Silver)",
    "Oil - Crude",
    "Oil - Brent",
    "Natural Gas",
    "US30",
    "NASDAQ",
    "S&P500",
    "DAX",
    "FTSE100",
    "Nikkei",
  ],
  CRYPTO: [
    "BTC/USD",
    "ETH/USD",
    "XRP/USD",
    "LTC/USD",
    "ADA/USD",
    "SOL/USD",
  ],
  "DERIV/BINARY": [
    "BOOM 1000",
    "BOOM 500",
    "CRASH 1000",
    "CRASH 500",
    "VOL 75",
    "VOL 100",
    "VOL 50",
    "VOL 25",
    "VOL 10",
  ],
};

const EMPTY_FORM = {
  pair: "",
  type: "Buy",
  category: "FOREX",
  main_category: "FOREX",
  sub_category: "",
  entry: "",
  entry_mode: "market",
  tp1: "",
  tp2: "",
  tp3: "",
  sl: "",
  note: "",
  profit_note: "",
  signal_type: "",
  risk_level: "",
  analysis_reason: "",
  is_premium: false,
  tag: "",
};

const SignalForm = memo(
  ({ onSuccess, editSignal }: SignalFormProps) => {
    const queryClient = useQueryClient();

    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState(() => ({
      ...EMPTY_FORM,
      pair: editSignal?.pair || "",
      type: editSignal?.type || "Buy",
      category: editSignal?.category || "FOREX",
      main_category:
        editSignal?.main_category ||
        editSignal?.category ||
        "FOREX",
      sub_category: editSignal?.sub_category || "",
      entry: editSignal?.entry || "",
      entry_mode: editSignal?.entry_mode || "market",
      tp1: editSignal?.tp1 || "",
      tp2: editSignal?.tp2 || "",
      tp3: editSignal?.tp3 || "",
      sl: editSignal?.sl || "",
      note: editSignal?.note || "",
      profit_note: editSignal?.profit_note || "",
      signal_type: editSignal?.signal_type || "",
      risk_level: editSignal?.risk_level || "",
      analysis_reason: editSignal?.analysis_reason || "",
      is_premium: editSignal?.is_premium || false,
      tag: editSignal?.tag || "",
    }));

    const isMarket = formData.entry_mode === "market";
    const isBuy = formData.type === "Buy";

    const symbols = useMemo(
      () => SUB_CATEGORY_OPTIONS[formData.main_category] || [],
      [formData.main_category]
    );

    const updateField = useCallback(
      (field: string, value: any) => {
        setFormData((prev) => ({
          ...prev,
          [field]: value,
        }));
      },
      []
    );

    const handleCategoryChange = useCallback(
      (value: string) => {
        setFormData((prev) => ({
          ...prev,
          main_category: value,
          category: value,
          sub_category: "",
          pair: "",
        }));
      },
      []
    );

    const handleSymbolChange = useCallback(
      (value: string) => {
        setFormData((prev) => ({
          ...prev,
          sub_category: value,
          pair: value,
        }));
      },
      []
    );

    const handleSubmit = async (
      e: React.FormEvent
    ) => {
      e.preventDefault();

      if (loading) return;

      const validation =
        signalSchema.safeParse(formData);

      if (!validation.success) {
        toast.error(
          validation.error.errors[0].message
        );
        return;
      }

      const entryPrice = parseFloat(
        String(formData.entry)
      );

      const hasNumericEntry =
        Number.isFinite(entryPrice) &&
        entryPrice > 0;

      setLoading(true);

      try {
        const isLimitOrder =
          formData.entry_mode === "limit";

        const initialLifecycle = isLimitOrder
          ? "pending"
          : "open";

        const initialCurrentPrice =
          hasNumericEntry
            ? String(entryPrice)
            : String(formData.entry || "");

        const cleanedData = {
          pair: validation.data.pair,
          type: validation.data.type,
          category: validation.data.category,
          main_category:
            validation.data.main_category,
          sub_category:
            validation.data.sub_category || null,

          entry: formData.entry,
          current_price: initialCurrentPrice,
          entry_mode: formData.entry_mode,

          limit_entry_price:
            isLimitOrder && hasNumericEntry
              ? entryPrice
              : null,

          is_activated: !isLimitOrder,

          activated_at: isLimitOrder
            ? null
            : new Date().toISOString(),

          tp1: validation.data.tp1,
          tp2: validation.data.tp2 || null,
          tp3: validation.data.tp3 || null,
          sl: validation.data.sl,

          note: validation.data.note || null,
          profit_note:
            validation.data.profit_note || null,

          status: initialLifecycle,
          signal_status: initialLifecycle,

          signal_type:
            validation.data.signal_type || null,

          risk_level:
            validation.data.risk_level || null,

          analysis_reason:
            validation.data.analysis_reason || null,

          is_premium: formData.is_premium,
          tag: formData.tag || null,
          signal_raw_text: null,
        };

        /* =================================================
           UPDATE EXISTING SIGNAL
        ================================================= */

        if (editSignal) {
          const { error } = await supabase
            .from("signals")
            .update(cleanedData)
            .eq("id", editSignal.id);

          if (error) {
            console.error(
              "Signal update error:",
              error
            );

            toast.error(
              "Failed to update signal. Please try again."
            );

            return;
          }

          toast.success(
            "Signal updated successfully"
          );

          queryClient.invalidateQueries({
            queryKey: ["signals"],
          });

          queryClient.invalidateQueries({
            queryKey: ["admin-signals"],
          });

          onSuccess();

          return;
        }

        /* =================================================
           CREATE NEW SIGNAL
        ================================================= */

        const { data: inserted, error } =
          await supabase
            .from("signals")
            .insert([cleanedData])
            .select(
              "id, pair, type, entry, tp1, tp2, tp3, sl"
            )
            .single();

        if (error) {
          console.error(
            "Signal creation error:",
            error
          );

          toast.error(
            "Failed to create signal. Please try again."
          );

          return;
        }

        toast.success(
          "Signal created successfully"
        );

        /* =================================================
           REFRESH UI IMMEDIATELY
        ================================================= */

        queryClient.invalidateQueries({
          queryKey: ["signals"],
        });

        queryClient.invalidateQueries({
          queryKey: ["admin-signals"],
        });

        /*
          Close form immediately after DB save.
          Telegram and MT5 continue in background.
        */

        onSuccess();

        /* =================================================
           TELEGRAM - BACKGROUND
        ================================================= */

        void supabase.functions
          .invoke("telegram-signal-post", {
            body: {
              signal: cleanedData,
              action: "new_signal",
            },
          })
          .then(({ error: tgError }) => {
            if (tgError) {
              console.error(
                "Telegram post error:",
                tgError
              );

              toast.error(
                "Signal saved, but Telegram post failed"
              );
            } else {
              toast.success(
                "Posted to Telegram"
              );
            }
          })
          .catch((error) => {
            console.error(
              "Telegram request error:",
              error
            );
          });

        /* =================================================
           MT5 - BACKGROUND
        ================================================= */

        if (inserted) {
          const entryNum = parseFloat(
            String(inserted.entry)
          );

          const slNum = parseFloat(
            String(inserted.sl)
          );

          const tp1Num = parseFloat(
            String(inserted.tp1)
          );

          const tp2Num = parseFloat(
            String(inserted.tp2)
          );

          const tp3Num = parseFloat(
            String(inserted.tp3)
          );

          void supabase.functions
            .invoke("mt5-demo-trade", {
              body: {
                action: "open_multi",

                signal_id: inserted.id,

                symbol: inserted.pair,

                trade_type:
                  inserted.type === "Buy"
                    ? "buy"
                    : "sell",

                entry: Number.isFinite(entryNum)
                  ? entryNum
                  : undefined,

                sl: Number.isFinite(slNum)
                  ? slNum
                  : undefined,

                tp1: Number.isFinite(tp1Num)
                  ? tp1Num
                  : undefined,

                tp2: Number.isFinite(tp2Num)
                  ? tp2Num
                  : undefined,

                tp3: Number.isFinite(tp3Num)
                  ? tp3Num
                  : undefined,

                lot_size: 0.01,
              },
            })
            .then(({ error: mt5Error }) => {
              if (mt5Error) {
                console.error(
                  "MT5 auto-trade error:",
                  mt5Error
                );

                toast.error(
                  "Signal saved, but MT5 trade failed to open"
                );
              } else {
                toast.success(
                  "MT5 trades opened"
                );
              }
            })
            .catch((error) => {
              console.error(
                "MT5 request error:",
                error
              );
            });
        }
      } catch (error) {
        console.error(
          "Signal form error:",
          error
        );

        toast.error(
          "An unexpected error occurred. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-2 md:space-y-3"
      >
        {/* =================================================
            TRADE SETUP
        ================================================= */}

        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-2.5 md:p-3">

          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary md:mb-2">
            <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
            Trade Setup
          </h3>

          <div className="grid grid-cols-2 gap-2">

            <div>
              <Label className="text-[11px] text-muted-foreground md:text-xs">
                Market
              </Label>

              <Select
                value={formData.main_category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger className="mt-0.5 h-8 text-xs md:h-9">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="FOREX">
                    FOREX
                  </SelectItem>

                  <SelectItem value="COMMODITIES">
                    COMMODITIES
                  </SelectItem>

                  <SelectItem value="CRYPTO">
                    CRYPTO
                  </SelectItem>

                  <SelectItem value="DERIV/BINARY">
                    DERIV / BINARY
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground md:text-xs">
                Symbol
              </Label>

              <Select
                value={formData.sub_category}
                onValueChange={handleSymbolChange}
              >
                <SelectTrigger className="mt-0.5 h-8 text-xs md:h-9">
                  <SelectValue placeholder="Select symbol" />
                </SelectTrigger>

                <SelectContent>
                  {symbols.map((option) => (
                    <SelectItem
                      key={option}
                      value={option}
                    >
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </div>

        {/* =================================================
            ORDER TYPE
        ================================================= */}

        <div className="grid grid-cols-2 gap-2">

          <div className="space-y-1">

            <Label className="text-[11px] text-muted-foreground md:text-xs">
              Trade Type
            </Label>

            <div className="grid grid-cols-2 gap-1.5">

              <button
                type="button"
                onClick={() =>
                  updateField("type", "Buy")
                }
                className={`flex items-center justify-center gap-1 rounded-lg border-2 p-1.5 text-xs font-semibold transition-all md:p-2 md:text-sm ${
                  isBuy
                    ? "border-success bg-success/20 text-success"
                    : "border-border text-muted-foreground hover:border-success/50 hover:text-success"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4" />
                BUY
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField("type", "Sell")
                }
                className={`flex items-center justify-center gap-1 rounded-lg border-2 p-1.5 text-xs font-semibold transition-all md:p-2 md:text-sm ${
                  !isBuy
                    ? "border-destructive bg-destructive/20 text-destructive"
                    : "border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive"
                }`}
              >
                <TrendingDown className="h-3.5 w-3.5 md:h-4 md:w-4" />
                SELL
              </button>

            </div>
          </div>

          <div className="space-y-1">

            <Label className="text-[11px] text-muted-foreground md:text-xs">
              Entry Type
            </Label>

            <div className="grid grid-cols-2 gap-1.5">

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "entry_mode",
                    "market"
                  )
                }
                className={`flex items-center justify-center gap-1 rounded-lg border-2 p-1.5 text-xs font-semibold transition-all md:p-2 md:text-sm ${
                  isMarket
                    ? "border-blue-500 bg-blue-500/20 text-blue-500"
                    : "border-border text-muted-foreground hover:border-blue-500/50 hover:text-blue-500"
                }`}
              >
                <Zap className="h-3.5 w-3.5 md:h-4 md:w-4" />
                MARKET
              </button>

              <button
                type="button"
                onClick={() =>
                  updateField(
                    "entry_mode",
                    "limit"
                  )
                }
                className={`flex items-center justify-center gap-1 rounded-lg border-2 p-1.5 text-xs font-semibold transition-all md:p-2 md:text-sm ${
                  !isMarket
                    ? "border-orange-500 bg-orange-500/20 text-orange-500"
                    : "border-border text-muted-foreground hover:border-orange-500/50 hover:text-orange-500"
                }`}
              >
                <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                LIMIT
              </button>

            </div>
          </div>

        </div>

        {/* =================================================
            ORDER INFO
        ================================================= */}

        <div
          className={`flex items-center gap-1.5 rounded-lg border p-2 text-[10px] md:text-xs ${
            isMarket
              ? "border-blue-500/20 bg-blue-500/10 text-blue-400"
              : "border-orange-500/20 bg-orange-500/10 text-orange-400"
          }`}
        >
          {isMarket ? (
            <>
              <Zap className="h-3.5 w-3.5 shrink-0" />

              <span>
                <strong>Market:</strong>{" "}
                Activates immediately at current
                price
              </span>
            </>
          ) : (
            <>
              <Clock className="h-3.5 w-3.5 shrink-0" />

              <span>
                <strong>Limit:</strong>{" "}
                Pending until price hits entry (
                {isBuy ? "≤" : "≥"} entry)
              </span>
            </>
          )}
        </div>

        {/* =================================================
            PRICE LEVELS
        ================================================= */}

        <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-2.5 md:p-3">

          <h3 className="text-xs font-semibold text-foreground md:text-sm">
            Price Levels
          </h3>

          <div className="grid grid-cols-2 gap-2">

            <div>
              <Label className="text-[11px] text-muted-foreground md:text-xs">
                Entry Price
              </Label>

              <Input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2650.00"
                value={formData.entry}
                onChange={(e) =>
                  updateField(
                    "entry",
                    e.target.value
                  )
                }
                className="mt-0.5 h-8 font-mono text-xs md:h-9 md:text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-[11px] text-destructive md:text-xs">
                Stop Loss
              </Label>

              <Input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 2640.00"
                value={formData.sl}
                onChange={(e) =>
                  updateField(
                    "sl",
                    e.target.value
                  )
                }
                className="mt-0.5 h-8 border-destructive/30 font-mono text-xs md:h-9 md:text-sm"
                required
              />
            </div>

          </div>

          <div className="grid grid-cols-3 gap-1.5 md:gap-2">

            <div>
              <Label className="text-[10px] text-success md:text-xs">
                TP1
              </Label>

              <Input
                type="text"
                inputMode="decimal"
                placeholder="2660"
                value={formData.tp1}
                onChange={(e) =>
                  updateField(
                    "tp1",
                    e.target.value
                  )
                }
                className="mt-0.5 h-8 border-success/30 font-mono text-xs md:h-9 md:text-sm"
                required
              />
            </div>

            <div>
              <Label className="text-[10px] text-success/70 md:text-xs">
                TP2
              </Label>

              <Input
                type="text"
                inputMode="decimal"
                placeholder="Optional"
                value={formData.tp2}
                onChange={(e) =>
                  updateField(
                    "tp2",
                    e.target.value
                  )
                }
                className="mt-0.5 h-8 border-success/20 font-mono text-xs md:h-9 md:text-sm"
              />
            </div>

            <div>
              <Label className="text-[10px] text-success/50 md:text-xs">
                TP3
              </Label>

              <Input
                type="text"
                inputMode="decimal"
                placeholder="Optional"
                value={formData.tp3}
                onChange={(e) =>
                  updateField(
                    "tp3",
                    e.target.value
                  )
                }
                className="mt-0.5 h-8 border-success/10 font-mono text-xs md:h-9 md:text-sm"
              />
            </div>

          </div>
        </div>

        {/* =================================================
            SIGNAL DETAILS
        ================================================= */}

        <div className="grid grid-cols-2 gap-2">

          <div>
            <Label className="text-[11px] text-muted-foreground md:text-xs">
              Signal Type
            </Label>

            <Select
              value={formData.signal_type}
              onValueChange={(value) =>
                updateField(
                  "signal_type",
                  value
                )
              }
            >
              <SelectTrigger className="mt-0.5 h-8 text-xs md:h-9">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Scalping">
                  ⚡ Scalping
                </SelectItem>

                <SelectItem value="Intraday">
                  📊 Intraday
                </SelectItem>

                <SelectItem value="Swing">
                  📈 Swing
                </SelectItem>

                <SelectItem value="Long Term">
                  🎯 Long Term
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground md:text-xs">
              Risk Level
            </Label>

            <Select
              value={formData.risk_level}
              onValueChange={(value) =>
                updateField(
                  "risk_level",
                  value
                )
              }
            >
              <SelectTrigger className="mt-0.5 h-8 text-xs md:h-9">
                <SelectValue placeholder="Select risk" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="Low">
                  🟢 Low Risk
                </SelectItem>

                <SelectItem value="Medium">
                  🟡 Medium Risk
                </SelectItem>

                <SelectItem value="High">
                  🔴 High Risk
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* =================================================
            ANALYSIS
        ================================================= */}

        <div>
          <Label className="text-[11px] text-muted-foreground md:text-xs">
            Analysis / Reason (Optional)
          </Label>

          <Textarea
            placeholder="Trendline breakout, Support/Resistance..."
            value={formData.analysis_reason}
            onChange={(e) =>
              updateField(
                "analysis_reason",
                e.target.value
              )
            }
            className="mt-0.5 min-h-14 text-xs"
            rows={2}
          />
        </div>

        {/* =================================================
            NOTES
        ================================================= */}

        <div className="grid grid-cols-2 gap-2">

          <div>
            <Label className="text-[11px] text-muted-foreground md:text-xs">
              Profit Note
            </Label>

            <Input
              placeholder="+100 pips profit"
              value={formData.profit_note}
              onChange={(e) =>
                updateField(
                  "profit_note",
                  e.target.value
                )
              }
              className="mt-0.5 h-8 text-xs md:h-9"
            />
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground md:text-xs">
              Additional Note
            </Label>

            <Input
              placeholder="Extra notes..."
              value={formData.note}
              onChange={(e) =>
                updateField(
                  "note",
                  e.target.value
                )
              }
              className="mt-0.5 h-8 text-xs md:h-9"
            />
          </div>

        </div>

        {/* =================================================
            EVENT TAG
        ================================================= */}

        <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-pink-500/10 p-2.5 md:p-3">

          <div className="mb-1.5 flex items-center gap-1.5">

            <Tag className="h-3.5 w-3.5 text-purple-500" />

            <Label className="text-xs font-semibold text-purple-400 md:text-sm">
              Event Tag (Optional)
            </Label>

          </div>

          <Input
            placeholder="NFP Trade, CPI News..."
            value={formData.tag}
            onChange={(e) =>
              updateField(
                "tag",
                e.target.value
              )
            }
            className="h-8 border-purple-500/30 text-xs focus:border-purple-500 md:h-9"
          />

        </div>

        {/* =================================================
            PREMIUM
        ================================================= */}

        <div className="flex items-center justify-between rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/5 to-yellow-500/10 p-2.5 md:p-3">

          <div className="flex items-center gap-2.5">

            <Crown className="h-4 w-4 shrink-0 text-yellow-500" />

            <div>

              <Label className="text-xs font-semibold md:text-sm">
                Premium Signal
              </Label>

              <p className="text-[10px] text-muted-foreground md:text-xs">
                Lock for premium users only
              </p>

            </div>

          </div>

          <Switch
            checked={formData.is_premium}
            onCheckedChange={(checked) =>
              updateField(
                "is_premium",
                checked
              )
            }
          />

        </div>

        {/* =================================================
            CREATE / UPDATE
        ================================================= */}

        <Button
          type="submit"
          className="btn-glow h-10 w-full text-sm md:h-11"
          disabled={loading}
        >
          {loading
            ? "Processing..."
            : editSignal
            ? "Update Signal"
            : "Create Signal"}
        </Button>

      </form>
    );
  }
);

SignalForm.displayName = "SignalForm";

export default SignalForm;
