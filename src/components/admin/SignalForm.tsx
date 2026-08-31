import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { signalSchema } from "@/lib/validations";
import { Crown, TrendingUp, TrendingDown, Clock, Zap, Tag } from "lucide-react";

interface SignalFormProps {
  onSuccess: () => void;
  editSignal?: any;
}

const SignalForm = ({ onSuccess, editSignal }: SignalFormProps) => {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pair: editSignal?.pair || "",
    type: editSignal?.type || "Buy",
    category: editSignal?.category || "FOREX",
    main_category: editSignal?.main_category || "FOREX",
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
  });

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas", "US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100", "VOL 50", "VOL 25", "VOL 10"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const entryPrice = parseFloat(formData.entry);
    const hasNumericEntry = !isNaN(entryPrice) && entryPrice > 0;

    const validation = signalSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const isLimitOrder = formData.entry_mode === "limit";
      const initialLifecycle = isLimitOrder ? "pending" : "open";

      // SAFE INITIAL CURRENT PRICE (Prevents instant auto-SL hit)
      const initialCurrentPrice = hasNumericEntry
        ? String(entryPrice)
        : String(formData.entry || "");

      const cleanedData = {
        pair: validation.data.pair,
        type: validation.data.type,
        category: validation.data.category,
        main_category: validation.data.main_category,
        sub_category: validation.data.sub_category || null,
        entry: formData.entry,
        current_price: initialCurrentPrice, // FIX: Direct safe assignment
        entry_mode: formData.entry_mode,
        limit_entry_price: isLimitOrder && hasNumericEntry ? entryPrice : null,

        is_activated: !isLimitOrder,
        activated_at: isLimitOrder ? null : new Date().toISOString(),

        tp1: validation.data.tp1,
        tp2: validation.data.tp2 || null,
        tp3: validation.data.tp3 || null,
        sl: validation.data.sl,
        note: validation.data.note || null,
        profit_note: validation.data.profit_note || null,

        status: initialLifecycle,
        signal_status: initialLifecycle,

        signal_type: validation.data.signal_type || null,
        risk_level: validation.data.risk_level || null,
        analysis_reason: validation.data.analysis_reason || null,
        is_premium: formData.is_premium,
        tag: formData.tag || null,
        signal_raw_text: null,
      };

      if (editSignal) {
        const { error } = await supabase
          .from("signals")
          .update(cleanedData)
          .eq("id", editSignal.id);
        if (error) {
          toast.error("Failed to update signal. Please try again.");
          return;
        }
        toast.success("Signal updated successfully");
      } else {
        const { data: inserted, error } = await supabase
          .from("signals")
          .insert([cleanedData])
          .select("id, pair, type, entry, tp1, tp2, tp3, sl")
          .single();

        if (error) {
          toast.error("Failed to create signal. Please try again.");
          return;
        }
        toast.success("Signal created successfully");

        // Telegram Notification
        supabase.functions
          .invoke("telegram-signal-post", {
            body: { signal: cleanedData, action: "new_signal" },
          })
          .then(({ error: tgError }) => {
            if (tgError) {
              console.error("Telegram post error:", tgError);
              toast.error("Signal saved, but Telegram post failed");
            } else {
              toast.success("Posted to Telegram");
            }
          });

        // MT5 Auto-Trade Execution
        if (inserted) {
          const entryNum = parseFloat(String(inserted.entry));
          const slNum = parseFloat(String(inserted.sl));
          const tp1Num = parseFloat(String(inserted.tp1));
          const tp2Num = parseFloat(String(inserted.tp2));
          const tp3Num = parseFloat(String(inserted.tp3));
          supabase.functions
            .invoke("mt5-demo-trade", {
              body: {
                action: "open_multi",
                signal_id: inserted.id,
                symbol: inserted.pair,
                trade_type: inserted.type === "Buy" ? "buy" : "sell",
                entry: Number.isFinite(entryNum) ? entryNum : undefined,
                sl: Number.isFinite(slNum) ? slNum : undefined,
                tp1: Number.isFinite(tp1Num) ? tp1Num : undefined,
                tp2: Number.isFinite(tp2Num) ? tp2Num : undefined,
                tp3: Number.isFinite(tp3Num) ? tp3Num : undefined,
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
            });
        }
      }

      queryClient.invalidateQueries({ queryKey: ["signals"] });
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      onSuccess();
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const isMarket = formData.entry_mode === 'market';
  const isBuy = formData.type === 'Buy';

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Trade Setup Section */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        <h3 className="text-xs font-semibold text-primary mb-2 flex items-center gap-1.5">
          <Zap className="h-4 w-4" />
          Trade Setup
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div>
            <Label className="text-xs text-muted-foreground">Market</Label>
            <Select 
              value={formData.main_category} 
              onValueChange={(value) => setFormData({ ...formData, main_category: value, category: value, sub_category: "" })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FOREX">FOREX</SelectItem>
                <SelectItem value="COMMODITIES">COMMODITIES</SelectItem>
                <SelectItem value="CRYPTO">CRYPTO</SelectItem>
                <SelectItem value="DERIV/BINARY">DERIV / BINARY</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Symbol</Label>
            <Select 
              value={formData.sub_category} 
              onValueChange={(value) => setFormData({ ...formData, sub_category: value, pair: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select symbol" />
              </SelectTrigger>
              <SelectContent>
                {subCategoryOptions[formData.main_category]?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Order Type Section */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Trade Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "Buy" })}
              className={`flex items-center justify-center gap-2 p-2 text-sm rounded-lg border-2 transition-all font-semibold ${
                isBuy 
                  ? 'bg-success/20 border-success text-success' 
                  : 'border-border hover:border-success/50 text-muted-foreground hover:text-success'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              BUY
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "Sell" })}
              className={`flex items-center justify-center gap-2 p-2 text-sm rounded-lg border-2 transition-all font-semibold ${
                !isBuy 
                  ? 'bg-destructive/20 border-destructive text-destructive' 
                  : 'border-border hover:border-destructive/50 text-muted-foreground hover:text-destructive'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              SELL
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Entry Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, entry_mode: "market" })}
              className={`flex items-center justify-center gap-2 p-2 text-sm rounded-lg border-2 transition-all font-semibold ${
                isMarket 
                  ? 'bg-blue-500/20 border-blue-500 text-blue-500' 
                  : 'border-border hover:border-blue-500/50 text-muted-foreground hover:text-blue-500'
              }`}
            >
              <Zap className="h-4 w-4" />
              MARKET
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, entry_mode: "limit" })}
              className={`flex items-center justify-center gap-2 p-2 text-sm rounded-lg border-2 transition-all font-semibold ${
                !isMarket 
                  ? 'bg-orange-500/20 border-orange-500 text-orange-500' 
                  : 'border-border hover:border-orange-500/50 text-muted-foreground hover:text-orange-500'
              }`}
            >
              <Clock className="h-4 w-4" />
              LIMIT
            </button>
          </div>
        </div>
      </div>

      <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
        isMarket 
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
          : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
      }`}>
        {isMarket ? (
          <>
            <Zap className="h-4 w-4" />
            <span><strong>Market Order:</strong> Signal activates immediately at current price</span>
          </>
        ) : (
          <>
            <Clock className="h-4 w-4" />
            <span><strong>Limit Order:</strong> Signal stays pending until price hits entry ({isBuy ? '≤' : '≥'} entry)</span>
          </>
        )}
      </div>

      {/* Price Levels Section */}
      <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-2.5">
        <h3 className="text-sm font-semibold text-foreground">Price Levels</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <div>
            <Label className="text-xs text-muted-foreground">Entry Price</Label>
            <Input
              type="text"
              placeholder="e.g., 2650.00 or Gold Buy Zone"
              value={formData.entry}
              onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
              className="mt-1 h-9 font-mono text-sm"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-destructive">Stop Loss (SL)</Label>
            <Input
              type="text"
              placeholder="e.g., 2640.00"
              value={formData.sl}
              onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
              className="mt-1 h-9 font-mono text-sm border-destructive/30"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          <div>
            <Label className="text-xs text-success">Take Profit 1 (TP1)</Label>
            <Input
              type="text"
              placeholder="e.g., 2660.00"
              value={formData.tp1}
              onChange={(e) => setFormData({ ...formData, tp1: e.target.value })}
              className="mt-1 font-mono border-success/30"
              required
            />
          </div>
          <div>
            <Label className="text-xs text-success/70">Take Profit 2 (TP2)</Label>
            <Input
              type="text"
              placeholder="Optional"
              value={formData.tp2}
              onChange={(e) => setFormData({ ...formData, tp2: e.target.value })}
              className="mt-1 font-mono border-success/20"
            />
          </div>
          <div>
            <Label className="text-xs text-success/50">Take Profit 3 (TP3)</Label>
            <Input
              type="text"
              placeholder="Optional"
              value={formData.tp3}
              onChange={(e) => setFormData({ ...formData, tp3: e.target.value })}
              className="mt-1 font-mono border-success/10"
            />
          </div>
        </div>
      </div>

      {/* Signal Details Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs text-muted-foreground">Signal Type</Label>
          <Select value={formData.signal_type} onValueChange={(value) => setFormData({ ...formData, signal_type: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Scalping">⚡ Scalping</SelectItem>
              <SelectItem value="Intraday">📊 Intraday</SelectItem>
              <SelectItem value="Swing">📈 Swing</SelectItem>
              <SelectItem value="Long Term">🎯 Long Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Risk Level</Label>
          <Select value={formData.risk_level} onValueChange={(value) => setFormData({ ...formData, risk_level: value })}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Low">🟢 Low Risk</SelectItem>
              <SelectItem value="Medium">🟡 Medium Risk</SelectItem>
              <SelectItem value="High">🔴 High Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Analysis / Reason (Optional)</Label>
        <Textarea
          placeholder="e.g., Trendline breakout, Support/Resistance..."
          value={formData.analysis_reason}
          onChange={(e) => setFormData({ ...formData, analysis_reason: e.target.value })}
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div>
          <Label className="text-xs text-muted-foreground">Profit Note (Optional)</Label>
          <Input
            placeholder="e.g., +100 pips running profit"
            value={formData.profit_note}
            onChange={(e) => setFormData({ ...formData, profit_note: e.target.value })}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Additional Note (Optional)</Label>
          <Input
            placeholder="Any extra notes..."
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      {/* Tag Field */}
      <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="h-4 w-4 text-purple-500" />
          <Label className="text-sm font-semibold text-purple-400">Event Tag (Optional)</Label>
        </div>
        <Input
          placeholder="e.g., NFP Trade, CPI News..."
          value={formData.tag}
          onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
          className="border-purple-500/30 focus:border-purple-500"
        />
      </div>

      {/* Premium Toggle */}
      <div className="flex items-center justify-between p-3 border border-yellow-500/30 rounded-xl bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
        <div className="flex items-center gap-3">
          <Crown className="h-4 w-4 text-yellow-500" />
          <div>
            <Label className="text-sm font-semibold">Premium Signal</Label>
            <p className="text-xs text-muted-foreground">Lock for premium users only</p>
          </div>
        </div>
        <Switch
          checked={formData.is_premium}
          onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
        />
      </div>

      <Button type="submit" className="w-full btn-glow text-sm py-4" disabled={loading}>
        {loading ? "Processing..." : editSignal ? "Update Signal" : "Create Signal"}
      </Button>
    </form>
  );
};

export default SignalForm;
