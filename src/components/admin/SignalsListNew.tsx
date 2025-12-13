import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import SignalForm from "./SignalForm";
import SignalSection from "@/components/signals/SignalSection";
import AdminSignalCard from "./AdminSignalCard";
import { Loader2 } from "lucide-react";

const SignalsListNew = () => {
  const queryClient = useQueryClient();
  const [editingSignal, setEditingSignal] = useState<any>(null);

  const { data: signals, isLoading } = useQuery({
    queryKey: ["admin-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signals")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Categorize signals into three sections
  const { liveSignals, openTrades, closedTrades } = useMemo(() => {
    if (!signals) return { liveSignals: [], openTrades: [], closedTrades: [] };

    const live: any[] = [];
    const open: any[] = [];
    const closed: any[] = [];

    signals.forEach((signal) => {
      const status = signal.signal_status || "OPEN";
      
      // Check if any TP is hit or SL is hit - determines if trade is active
      const hasAnyTpHit = signal.tp1_hit || signal.tp2_hit || signal.tp3_hit || signal.tp4_hit;
      const isClosed = status === "CLOSE" || signal.sl_hit || signal.auto_closed;
      
      if (isClosed) {
        closed.push(signal);
      } else if (hasAnyTpHit || status === "LIVE") {
        open.push(signal);
      } else {
        live.push(signal);
      }
    });

    return { liveSignals: live, openTrades: open, closedTrades: closed };
  }, [signals]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
    <div className="space-y-8">
      {/* Live Signals Section */}
      <SignalSection type="live" title="Live Signals" count={liveSignals.length}>
        {liveSignals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No live signals. Create a new signal to get started.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveSignals.map((signal) => (
              <AdminSignalCard
                key={signal.id}
                signal={signal}
                sectionType="live"
                onEdit={setEditingSignal}
                onDelete={deleteSignal}
              />
            ))}
          </div>
        )}
      </SignalSection>

      {/* Open Trades Section */}
      <SignalSection type="open" title="Open Trades" count={openTrades.length}>
        {openTrades.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No open trades. Signals with TP progress will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {openTrades.map((signal) => (
              <AdminSignalCard
                key={signal.id}
                signal={signal}
                sectionType="open"
                onEdit={setEditingSignal}
                onDelete={deleteSignal}
              />
            ))}
          </div>
        )}
      </SignalSection>

      {/* Closed Trades Section */}
      <SignalSection type="closed" title="Closed Trades" count={closedTrades.length}>
        {closedTrades.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center text-muted-foreground">
              No closed trades. Completed trades will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {closedTrades.slice(0, 20).map((signal) => (
              <AdminSignalCard
                key={signal.id}
                signal={signal}
                sectionType="closed"
                onEdit={setEditingSignal}
                onDelete={deleteSignal}
              />
            ))}
          </div>
        )}
        {closedTrades.length > 20 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Showing 20 of {closedTrades.length} closed trades
          </p>
        )}
      </SignalSection>
    </div>
  );
};

export default SignalsListNew;
