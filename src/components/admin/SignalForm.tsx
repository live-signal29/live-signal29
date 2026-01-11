import { useState, useEffect } from "react";
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
import { Crown, TrendingUp, TrendingDown, Clock, Zap, Tag, FileText, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { parseSignalText, getCategoryFromSymbol } from "@/lib/signalParser";
import { ParsedSignal } from "@/lib/signalParser";

// Raw Signal Parser Component
interface RawSignalParserProps {
  rawSignalText: string;
  setRawSignalText: (text: string) => void;
  onParsedSignal: (parsed: ParsedSignal) => void;
}

const RawSignalParser = ({ rawSignalText, setRawSignalText, onParsedSignal }: RawSignalParserProps) => {
  const [parseResult, setParseResult] = useState<ParsedSignal | null>(null);
  const [isAutoParseEnabled, setIsAutoParseEnabled] = useState(true);

  useEffect(() => {
    if (rawSignalText && isAutoParseEnabled) {
      const debounceTimer = setTimeout(() => {
        const parsed = parseSignalText(rawSignalText);
        setParseResult(parsed);
      }, 300);
      return () => clearTimeout(debounceTimer);
    } else {
      setParseResult(null);
    }
  }, [rawSignalText, isAutoParseEnabled]);

  const handleApplyParsed = () => {
    if (parseResult && parseResult.isValid) {
      onParsedSignal(parseResult);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/5 to-blue-500/10 border border-cyan-500/20 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-500" />
          <Label className="text-sm font-semibold text-cyan-400">Auto-Parse Raw Signal</Label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Auto-parse</span>
          <Switch 
            checked={isAutoParseEnabled} 
            onCheckedChange={setIsAutoParseEnabled}
            className="data-[state=checked]:bg-cyan-500"
          />
        </div>
      </div>
      
      <Textarea
        placeholder="Paste signal text here...&#10;&#10;Examples:&#10;#Gold BUY 2650&#10;TP1: 2660&#10;TP2: 2670&#10;SL: 2640&#10;&#10;or&#10;&#10;XAUUSD SELL @ 2680&#10;Entry: 2680&#10;SL: 2690&#10;TP: 2660"
        value={rawSignalText}
        onChange={(e) => setRawSignalText(e.target.value)}
        className="border-cyan-500/30 focus:border-cyan-500 min-h-[120px] font-mono text-sm"
      />

      {/* Parse Result Preview */}
      {parseResult && rawSignalText && (
        <div className={`p-3 rounded-lg border ${parseResult.isValid ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <div className="flex items-center gap-2 mb-2">
            {parseResult.isValid ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="text-sm font-semibold text-success">Signal Parsed Successfully</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Parse Error: {parseResult.error}</span>
              </>
            )}
          </div>
          
          {parseResult.isValid && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              <div className="bg-background/50 p-2 rounded">
                <span className="text-muted-foreground">Symbol:</span>
                <span className="ml-1 font-bold">{parseResult.pair || 'N/A'}</span>
              </div>
              <div className="bg-background/50 p-2 rounded">
                <span className="text-muted-foreground">Type:</span>
                <span className={`ml-1 font-bold ${parseResult.type === 'Buy' ? 'text-success' : 'text-destructive'}`}>
                  {parseResult.type}
                </span>
              </div>
              <div className="bg-background/50 p-2 rounded">
                <span className="text-muted-foreground">Entry:</span>
                <span className="ml-1 font-bold text-blue-400">{parseResult.entry}</span>
              </div>
              <div className="bg-background/50 p-2 rounded">
                <span className="text-muted-foreground">SL:</span>
                <span className="ml-1 font-bold text-destructive">{parseResult.sl}</span>
              </div>
              <div className="bg-background/50 p-2 rounded">
                <span className="text-muted-foreground">TP1:</span>
                <span className="ml-1 font-bold text-success">{parseResult.tp1}</span>
              </div>
              {parseResult.tp2 && (
                <div className="bg-background/50 p-2 rounded">
                  <span className="text-muted-foreground">TP2:</span>
                  <span className="ml-1 font-bold text-success">{parseResult.tp2}</span>
                </div>
              )}
              {parseResult.tp3 && (
                <div className="bg-background/50 p-2 rounded">
                  <span className="text-muted-foreground">TP3:</span>
                  <span className="ml-1 font-bold text-success">{parseResult.tp3}</span>
                </div>
              )}
              {parseResult.tp4 && (
                <div className="bg-background/50 p-2 rounded">
                  <span className="text-muted-foreground">TP4:</span>
                  <span className="ml-1 font-bold text-success">{parseResult.tp4}</span>
                </div>
              )}
            </div>
          )}

          {parseResult.isValid && (
            <Button 
              type="button"
              onClick={handleApplyParsed}
              className="w-full mt-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Apply Parsed Values to Form
            </Button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Paste raw signal text and it will auto-detect Symbol, Buy/Sell, Entry, SL, and TP values
      </p>
    </div>
  );
};

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
  const [rawSignalText, setRawSignalText] = useState("");

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas", "US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Entry, TP, SL can be text or numbers - no numeric validation required
    const entryPrice = parseFloat(formData.entry);
    const hasNumericEntry = !isNaN(entryPrice) && entryPrice > 0;

    // Validate input
    const validation = signalSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

      try {
        const isLimitOrder = formData.entry_mode === "limit";

        // SYSTEM STANDARD:
        // status + signal_status are the only lifecycle states and must be:
        // pending | open | close
        const initialLifecycle = isLimitOrder ? "pending" : "open";

        const cleanedData = {
          pair: validation.data.pair,
          type: validation.data.type,
          category: validation.data.category,
          main_category: validation.data.main_category,
          sub_category: validation.data.sub_category || null,
          entry: formData.entry,
          entry_mode: formData.entry_mode,
          limit_entry_price: isLimitOrder && hasNumericEntry ? entryPrice : null,

          // For LIMIT orders, start PENDING and not activated.
          // For MARKET orders, start OPEN and activated.
          is_activated: isLimitOrder ? false : true,
          activated_at: isLimitOrder ? null : new Date().toISOString(),

          tp1: validation.data.tp1,
          tp2: validation.data.tp2 || null,
          tp3: validation.data.tp3 || null,
          sl: validation.data.sl,
          note: validation.data.note || null,
          profit_note: validation.data.profit_note || null,

          // IMPORTANT: remove any "Active" backend status.
          status: initialLifecycle,
          signal_status: initialLifecycle,

          signal_type: validation.data.signal_type || null,
          risk_level: validation.data.risk_level || null,
          analysis_reason: validation.data.analysis_reason || null,
          is_premium: formData.is_premium,
          tag: formData.tag || null,
          signal_raw_text: rawSignalText || null,
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
        const { error } = await supabase.from("signals").insert([cleanedData]);
        if (error) {
          toast.error("Failed to create signal. Please try again.");
          return;
        }
        toast.success("Signal created successfully");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Trade Setup Section */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20">
        <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Trade Setup
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* Order Type Section - Professional MT5 Style */}
      <div className="grid grid-cols-2 gap-4">
        {/* Trade Type: Buy/Sell */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Trade Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: "Buy" })}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-semibold ${
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
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-semibold ${
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

        {/* Entry Type: Market/Limit */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Entry Type</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, entry_mode: "market" })}
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-semibold ${
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
              className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all font-semibold ${
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

      {/* Auto Status Info */}
      <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
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
      <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Price Levels</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Entry Price</Label>
            <Input
              type="text"
              placeholder="e.g., 2650.00 or Gold Buy Zone"
              value={formData.entry}
              onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
              className="mt-1 font-mono text-lg"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              {isMarket ? 'Entry at current market price' : `Triggers when price ${isBuy ? 'drops to' : 'rises to'} this level`}
            </p>
          </div>
          <div>
            <Label className="text-xs text-destructive">Stop Loss (SL)</Label>
            <Input
              type="text"
              placeholder="e.g., 2640.00 or SL OPEN"
              value={formData.sl}
              onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
              className="mt-1 font-mono text-lg border-destructive/30"
              required
            />
            <p className="text-xs text-destructive/70 mt-1">Auto-closes signal if hit (numeric only)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs text-success">Take Profit 1 (TP1)</Label>
            <Input
              type="text"
              placeholder="e.g., 2660.00 or TP OPEN"
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          placeholder="e.g., Trendline breakout, Support/Resistance, News impact..."
          value={formData.analysis_reason}
          onChange={(e) => setFormData({ ...formData, analysis_reason: e.target.value })}
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-purple-500" />
          <Label className="text-sm font-semibold text-purple-400">Event Tag (Optional)</Label>
        </div>
        <Input
          placeholder="e.g., NFP Trade, CPI News, FOMC..."
          value={formData.tag}
          onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
          className="border-purple-500/30 focus:border-purple-500"
        />
        <p className="text-xs text-muted-foreground mt-2">Tag will show on user dashboard next to entry price</p>
      </div>

      {/* Raw Signal Text Parser with Auto-Parse */}
      <RawSignalParser 
        rawSignalText={rawSignalText}
        setRawSignalText={setRawSignalText}
        onParsedSignal={(parsed) => {
          if (parsed.isValid) {
            setFormData(prev => ({
              ...prev,
              pair: parsed.pair || prev.pair,
              type: parsed.type,
              entry: parsed.entry,
              sl: parsed.sl,
              tp1: parsed.tp1,
              tp2: parsed.tp2 || '',
              tp3: parsed.tp3 || '',
              main_category: getCategoryFromSymbol(parsed.pair),
              category: getCategoryFromSymbol(parsed.pair),
              sub_category: parsed.pair,
            }));
            toast.success("Signal parsed successfully!");
          }
        }}
      />

      {/* Premium Access Toggle */}
      <div className="flex items-center justify-between p-4 border border-yellow-500/30 rounded-xl bg-gradient-to-r from-yellow-500/5 to-yellow-500/10">
        <div className="flex items-center gap-3">
          <Crown className="h-5 w-5 text-yellow-500" />
          <div>
            <Label className="text-base font-semibold">Premium Signal</Label>
            <p className="text-xs text-muted-foreground">Lock for premium users only</p>
          </div>
        </div>
        <Switch
          checked={formData.is_premium}
          onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
        />
      </div>

      {/* Preview Card */}
      <div className="p-4 rounded-xl border border-dashed border-border bg-muted/10">
        <p className="text-xs text-muted-foreground mb-2">Signal Preview:</p>
        <div className="flex items-center gap-2 text-sm font-mono">
          <span className={`px-2 py-1 rounded text-xs font-bold ${isBuy ? 'bg-success/20 text-success' : 'bg-destructive/20 text-destructive'}`}>
            {formData.type.toUpperCase()}
          </span>
          <span className="font-semibold">{formData.pair || 'Symbol'}</span>
          <span className="text-muted-foreground">@</span>
          <span className={isMarket ? 'text-blue-400' : 'text-orange-400'}>
            {isMarket ? 'Active' : 'Limit'} {formData.entry || '0.00'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Status: {isMarket ? '🟢 Active (Market Order)' : '🟡 Pending (Limit Order)'} → Auto-closes on TP/SL hit
        </p>
      </div>

      <Button type="submit" className="w-full btn-glow text-base py-6" disabled={loading}>
        {loading ? "Processing..." : editSignal ? "Update Signal" : "Create Signal"}
      </Button>
    </form>
  );
};

export default SignalForm;
