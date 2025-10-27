import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCard from "@/components/SignalCard";
import FilterBar from "@/components/FilterBar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const XAUUSDSignals = () => {
  const [filter, setFilter] = useState("latest");

  const { data: signals, isLoading } = useQuery({
    queryKey: ["signals", "XAUUSD", filter],
    queryFn: async () => {
      let query = supabase
        .from("signals")
        .select("*")
        .eq("category", "XAUUSD")
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (filter === "all_tp_hit") {
        query = query.eq("status", "All TP Hit");
      } else if (filter === "running") {
        query = query.eq("status", "Active");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text">XAUUSD / Gold Signals</span>
            </h1>
            <p className="text-muted-foreground">Premium gold trading signals with high accuracy</p>
          </div>

          <FilterBar activeFilter={filter} onFilterChange={setFilter} />

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signals?.map((signal) => (
                <SignalCard key={signal.id} signal={signal as any} />
              ))}
            </div>
          )}

          {!isLoading && signals?.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No signals found</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default XAUUSDSignals;
