import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, Eye, EyeOff, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import SignalForm from "./SignalForm";

const SignalsList = () => {
  const queryClient = useQueryClient();
  const [editingSignal, setEditingSignal] = useState<any>(null);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkValue, setBulkValue] = useState<string>("");

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

  // Filter signals based on selected filters
  const filteredSignals = signals?.filter((signal) => {
    const matchesRisk = riskFilter === "all" || signal.risk_level === riskFilter;
    const matchesStatus = statusFilter === "all" || signal.signal_status === statusFilter;
    const matchesType = typeFilter === "all" || signal.signal_type === typeFilter;
    return matchesRisk && matchesStatus && matchesType;
  });

  const toggleSelectSignal = (id: string) => {
    const newSelected = new Set(selectedSignals);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedSignals(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedSignals.size === filteredSignals?.length) {
      setSelectedSignals(new Set());
    } else {
      setSelectedSignals(new Set(filteredSignals?.map(s => s.id) || []));
    }
  };

  const applyBulkAction = async () => {
    if (selectedSignals.size === 0) {
      toast.error("Please select at least one signal");
      return;
    }

    if (!bulkAction || !bulkValue) {
      toast.error("Please select an action and value");
      return;
    }

    try {
      const updates: any = {};
      if (bulkAction === "risk_level") updates.risk_level = bulkValue;
      if (bulkAction === "signal_status") updates.signal_status = bulkValue;
      if (bulkAction === "signal_type") updates.signal_type = bulkValue;

      const { error } = await supabase
        .from("signals")
        .update(updates)
        .in("id", Array.from(selectedSignals));

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success(`Updated ${selectedSignals.size} signals successfully`);
      setSelectedSignals(new Set());
      setBulkAction("");
      setBulkValue("");
    } catch (error: any) {
      toast.error("Bulk update failed");
    }
  };

  const toggleTpHit = async (id: string, field: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ [field]: !currentValue })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success("Updated successfully");
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

  const updateSignalStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("signals")
        .update({ signal_status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
      toast.success(`Signal status updated to ${newStatus}`);
    } catch (error: any) {
      toast.error("Failed to update signal status");
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

  if (editingSignal) {
    return (
      <div>
        <Button variant="outline" onClick={() => setEditingSignal(null)} className="mb-4">
          Cancel Edit
        </Button>
        <SignalForm 
          editSignal={editingSignal} 
          onSuccess={() => {
            setEditingSignal(null);
            queryClient.invalidateQueries({ queryKey: ["admin-signals"] });
          }} 
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedSignals.size > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">{selectedSignals.size} selected</span>
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Select value={bulkAction} onValueChange={setBulkAction}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="risk_level">Change Risk Level</SelectItem>
                    <SelectItem value="signal_status">Change Status</SelectItem>
                    <SelectItem value="signal_type">Change Type</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={bulkValue} onValueChange={setBulkValue} disabled={!bulkAction}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    {bulkAction === "risk_level" && (
                      <>
                        <SelectItem value="Low">Low Risk</SelectItem>
                        <SelectItem value="Medium">Medium Risk</SelectItem>
                        <SelectItem value="High">High Risk</SelectItem>
                      </>
                    )}
                    {bulkAction === "signal_status" && (
                      <>
                        <SelectItem value="OPEN">🟢 OPEN</SelectItem>
                        <SelectItem value="LIVE">🔵 LIVE</SelectItem>
                        <SelectItem value="CLOSE">🔴 CLOSE</SelectItem>
                      </>
                    )}
                    {bulkAction === "signal_type" && (
                      <>
                        <SelectItem value="Scalping">Scalping</SelectItem>
                        <SelectItem value="Intraday">Intraday</SelectItem>
                        <SelectItem value="Swing">Swing</SelectItem>
                        <SelectItem value="Long Term">Long Term</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button onClick={applyBulkAction} className="flex-1">Apply</Button>
                  <Button variant="outline" onClick={() => setSelectedSignals(new Set())}>Clear</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter Controls */}
      <Card className="bg-card/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="flex items-center gap-2"
          >
            {selectedSignals.size === filteredSignals?.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedSignals.size === filteredSignals?.length ? "Deselect All" : "Select All"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">Risk Level</label>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="Low">Low Risk</SelectItem>
                  <SelectItem value="Medium">Medium Risk</SelectItem>
                  <SelectItem value="High">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">Signal Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="OPEN">🟢 OPEN</SelectItem>
                  <SelectItem value="LIVE">🔵 LIVE</SelectItem>
                  <SelectItem value="CLOSE">🔴 CLOSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs sm:text-sm font-medium mb-2 block">Signal Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Scalping">Scalping</SelectItem>
                  <SelectItem value="Intraday">Intraday</SelectItem>
                  <SelectItem value="Swing">Swing</SelectItem>
                  <SelectItem value="Long Term">Long Term</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(riskFilter !== "all" || statusFilter !== "all" || typeFilter !== "all") && (
            <div className="mt-3 flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setRiskFilter("all");
                  setStatusFilter("all");
                  setTypeFilter("all");
                }}
              >
                Clear Filters
              </Button>
              <span className="text-xs text-muted-foreground">
                Showing {filteredSignals?.length || 0} of {signals?.length || 0} signals
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signals List */}
      {filteredSignals?.map((signal) => (
        <Card key={signal.id} className={selectedSignals.has(signal.id) ? "border-primary" : ""}>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
              <div className="flex items-start gap-3 flex-1">
                <Checkbox
                  checked={selectedSignals.has(signal.id)}
                  onCheckedChange={() => toggleSelectSignal(signal.id)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <CardTitle className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-base sm:text-lg">{signal.pair}</span>
                    <Badge className={signal.type === "Buy" ? "badge-buy" : "badge-sell"}>
                      {signal.type}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{signal.main_category}</Badge>
                    <Badge variant="secondary" className="text-xs">{signal.sub_category}</Badge>
                    {signal.risk_level && (
                      <Badge variant={signal.risk_level === "High" ? "destructive" : signal.risk_level === "Low" ? "default" : "secondary"} className="text-xs">
                        {signal.risk_level} Risk
                      </Badge>
                    )}
                    {signal.signal_type && (
                      <Badge variant="outline" className="text-xs">{signal.signal_type}</Badge>
                    )}
                  </CardTitle>
                  <Select value={signal.signal_status || "OPEN"} onValueChange={(value) => updateSignalStatus(signal.id, value)}>
                    <SelectTrigger className="w-full sm:w-[140px] h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="OPEN">🟢 OPEN</SelectItem>
                      <SelectItem value="LIVE">🔵 LIVE</SelectItem>
                      <SelectItem value="CLOSE">🔴 CLOSE</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    {format(new Date(signal.created_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingSignal(signal)}>
                  <Edit className="h-4 w-4" />
                </Button>
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
            <div className="mt-4">
              <p className="text-xs sm:text-sm font-semibold mb-2">Stop Loss:</p>
              <label className="flex items-center gap-2">
                <Checkbox
                  checked={signal.sl_hit}
                  onCheckedChange={() => toggleTpHit(signal.id, "sl_hit", signal.sl_hit)}
                />
                <span className="text-xs sm:text-sm">SL: {signal.sl}</span>
              </label>
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
