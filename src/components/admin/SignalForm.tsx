import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { signalSchema } from "@/lib/validations";

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
    tp1: editSignal?.tp1 || "",
    tp2: editSignal?.tp2 || "",
    tp3: editSignal?.tp3 || "",
    tp4: editSignal?.tp4 || "",
    sl: editSignal?.sl || "",
    note: editSignal?.note || "",
    status: editSignal?.status || "Active",
  });

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas"],
    INDICES: ["US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate input
    const validation = signalSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const cleanedData = {
        pair: validation.data.pair,
        type: validation.data.type,
        category: validation.data.category,
        main_category: validation.data.main_category,
        sub_category: validation.data.sub_category || null,
        entry: validation.data.entry,
        tp1: validation.data.tp1,
        tp2: validation.data.tp2 || null,
        tp3: validation.data.tp3 || null,
        tp4: validation.data.tp4 || null,
        sl: validation.data.sl,
        note: validation.data.note || null,
        status: formData.status,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Main Category</Label>
          <Select 
            value={formData.main_category} 
            onValueChange={(value) => setFormData({ ...formData, main_category: value, category: value, sub_category: "" })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOREX">FOREX</SelectItem>
              <SelectItem value="COMMODITIES">COMMODITIES</SelectItem>
              <SelectItem value="INDICES">INDICES</SelectItem>
              <SelectItem value="CRYPTO">CRYPTO</SelectItem>
              <SelectItem value="DERIV/BINARY">DERIV / BINARY</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sub-Category / Asset</Label>
          <Select 
            value={formData.sub_category} 
            onValueChange={(value) => setFormData({ ...formData, sub_category: value, pair: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select asset" />
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
        <div>
          <Label>Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Buy">Buy</SelectItem>
              <SelectItem value="Sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">🟢 Running</SelectItem>
              <SelectItem value="Closed">🎯 Target Hit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Entry</Label>
          <Input
            placeholder="2650.00"
            value={formData.entry}
            onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>TP1</Label>
          <Input
            placeholder="2660.00"
            value={formData.tp1}
            onChange={(e) => setFormData({ ...formData, tp1: e.target.value })}
            required
          />
        </div>
        <div>
          <Label>TP2</Label>
          <Input
            placeholder="2670.00"
            value={formData.tp2}
            onChange={(e) => setFormData({ ...formData, tp2: e.target.value })}
          />
        </div>
        <div>
          <Label>TP3</Label>
          <Input
            placeholder="2680.00"
            value={formData.tp3}
            onChange={(e) => setFormData({ ...formData, tp3: e.target.value })}
          />
        </div>
        <div>
          <Label>TP4</Label>
          <Input
            placeholder="2690.00"
            value={formData.tp4}
            onChange={(e) => setFormData({ ...formData, tp4: e.target.value })}
          />
        </div>
        <div>
          <Label>Stop Loss</Label>
          <Input
            placeholder="2640.00"
            value={formData.sl}
            onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
            required
          />
        </div>
      </div>
      <div>
        <Label>Note</Label>
        <Textarea
          placeholder="Additional notes..."
          value={formData.note}
          onChange={(e) => setFormData({ ...formData, note: e.target.value })}
        />
      </div>
      <Button type="submit" className="w-full btn-glow" disabled={loading}>
        {loading ? "Saving..." : editSignal ? "Update Signal" : "Create Signal"}
      </Button>
    </form>
  );
};

export default SignalForm;
