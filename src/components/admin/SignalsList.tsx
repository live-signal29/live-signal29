import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const SignalsList = () => {
  const queryClient = useQueryClient();

  const { data: signals, isLoading } = useQuery({
    queryKey: ["admin-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const toggleTpHit = async (id: string, field: string, currentValue: boolean) => {
    try {
      // First, get the current signal to check all TPs
      const { data: currentSignal, error: fetchError } = await supabase
        .from("signals")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Update the TP hit status
      const updatedSignal = { ...currentSignal, [field]: !currentValue };

      // Check if all TPs are hit
      const allTpsHit = 
        updatedSignal.tp1_hit &&
        (!updatedSignal.tp2 || updatedSignal.tp2_hit) &&
        (!updatedSignal.tp3 || updatedSignal.tp3_hit) &&
        (!updatedSignal.tp4 || updatedSignal.tp4_hit);

      // Update signal with new status if all TPs are hit
      const updateData: any = { [field]: !currentValue };
      if (allTpsHit) {
        updateData.status = "Closed";
      }

      const { error } = await supabase
        .from("signals")
        .update(updateData)
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success(allTpsHit ? "All TPs hit! Signal closed." : "Updated successfully");
    } catch (error: any) {
      toast.error("Update failed");
    }
  };

  const togglePublished = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ published: !currentValue })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success(currentValue ? "Signal unpublished" : "Signal published");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success(`Status updated to ${newStatus === "Active" ? "Running" : "Target Hit"}`);
    } catch (error: any) {
      toast.error("Failed to update status");
    }
  };

  const deleteSignal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this signal?")) return;

    try {
      const { error } = await supabase.from("signals").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success("Signal deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {signals?.map((signal) => (
        <Card key={signal.id}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
              <div className="flex-1">
                <CardTitle className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-base sm:text-lg">{signal.pair}</span>
                  <Badge className={signal.type === "Buy" ? "badge-buy" : "badge-sell"}>
                    {signal.type}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{signal.main_category}</Badge>
                  <Badge variant="secondary" className="text-xs">{signal.sub_category}</Badge>
                </CardTitle>
                <Select value={signal.status || "Active"} onValueChange={(value) => updateStatus(signal.id, value)}>
                  <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">🟢 Running</SelectItem>
                    <SelectItem value="Closed">🎯 Target Hit</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                  {format(new Date(signal.created_at), "MMM dd, yyyy HH:mm")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePublished(signal.id, signal.published)}>
                  {signal.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteSignal(signal.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
              <div>
                <span className="text-xs sm:text-sm text-muted-foreground">Entry:</span>
                <p className="text-sm sm:text-base font-semibold">{signal.entry}</p>
              </div>
              <div>
                <span className="text-xs sm:text-sm text-muted-foreground">SL:</span>
                <p className="text-sm sm:text-base font-semibold text-destructive">{signal.sl}</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-semibold">Take Profits:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={signal.tp1_hit}
                    onCheckedChange={() => toggleTpHit(signal.id, "tp1_hit", signal.tp1_hit)}
                  />
                  <span className="text-xs sm:text-sm">TP1: {signal.tp1}</span>
                </label>
                {signal.tp2 && (
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={signal.tp2_hit}
                      onCheckedChange={() => toggleTpHit(signal.id, "tp2_hit", signal.tp2_hit)}
                    />
                    <span className="text-xs sm:text-sm">TP2: {signal.tp2}</span>
                  </label>
                )}
                {signal.tp3 && (
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={signal.tp3_hit}
                      onCheckedChange={() => toggleTpHit(signal.id, "tp3_hit", signal.tp3_hit)}
                    />
                    <span className="text-xs sm:text-sm">TP3: {signal.tp3}</span>
                  </label>
                )}
                {signal.tp4 && (
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={signal.tp4_hit}
                      onCheckedChange={() => toggleTpHit(signal.id, "tp4_hit", signal.tp4_hit)}
                    />
                    <span className="text-xs sm:text-sm">TP4: {signal.tp4}</span>
                  </label>
                )}
              </div>
            </div>
            {(signal as any).profit_note && (
              <div className="mt-3 p-2 bg-warning/10 border border-warning/20 rounded">
                <p className="text-xs text-warning italic">{(signal as any).profit_note}</p>
              </div>
            )}
            {signal.note && (
              <div className="mt-4 p-3 bg-muted/50 rounded">
                <p className="text-xs sm:text-sm">{signal.note}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SignalsList;
