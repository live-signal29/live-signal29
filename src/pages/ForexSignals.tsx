import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import FilterBar from "@/components/FilterBar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

const ForexSignals = () => {
  const [filter, setFilter] = useState("latest");
  const { hasAccess, subscriptionStatus } = useSubscriptionAccess();

  const { data: signals, isLoading } = useQuery({
    queryKey: ["signals", "Forex", filter],
    queryFn: async () => {
      const statusFilter = filter === "all_tp_hit" ? "All TP Hit" : filter === "running" ? "Active" : null;
      
      const { data, error } = await supabase.rpc('get_signals_filtered', {
        p_category: "Forex",
        p_status: statusFilter,
        p_limit: 100
      });

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text">Forex Signals</span>
            </h1>
            <p className="text-muted-foreground">EUR/USD, CHF/JPY, CAD/JPY, GBP/NZD, GBP/AUD, EUR/NZD trading signals</p>
          </div>

          <FilterBar activeFilter={filter} onFilterChange={setFilter} />

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {signals?.map((signal, index) => (
                <>
                  <SignalCardNew 
                    key={signal.id} 
                    signal={signal as any}
                    hasAccess={hasAccess}
                    subscriptionStatus={subscriptionStatus}
                  />
                  
                  {/* Add affiliate banner after first signal */}
                  {index === 0 && signals && signals.length > 1 && (
                    <div className="lg:col-span-3 md:col-span-2">
                      <AffiliateBannerCarousel />
                    </div>
                  )}
                  
                  {/* Add affiliate banner before last signal */}
                  {signals && index === signals.length - 2 && signals.length > 2 && (
                    <div className="lg:col-span-3 md:col-span-2">
                      <AffiliateBannerCarousel />
                    </div>
                  )}
                </>
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

export default ForexSignals;