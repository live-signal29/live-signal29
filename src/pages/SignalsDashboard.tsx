import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import FilterBar from "@/components/FilterBar";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TrialExpiredLockScreen from "@/components/TrialExpiredLockScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

const SignalsDashboard = () => {
  const { hasAccess, loading: accessLoading } = useSubscriptionAccess();
  const [filter, setFilter] = useState("latest");
  const [mainCategory, setMainCategory] = useState("FOREX");
  const [subCategory, setSubCategory] = useState<string>("all");

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas"],
    INDICES: ["US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ["signals", mainCategory, subCategory, filter],
    queryFn: async () => {
      let query = supabase
        .from("signals")
        .select("*")
        .eq("main_category", mainCategory)
        .eq("published", true)
        .order("created_at", { ascending: false });

      if (subCategory && subCategory !== "all") {
        query = query.eq("sub_category", subCategory);
      }

      if (filter === "all_tp_hit") {
        query = query.eq("status", "All TP Hit");
      } else if (filter === "running") {
        query = query.eq("status", "Active");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: mainCategory !== "CHART ANALYSIS",
  });

  // Setup realtime subscription for instant updates
  useEffect(() => {
    const channel = supabase
      .channel('signals-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'signals',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const { data: chartAnalysis, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["chart-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_analysis")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: mainCategory === "CHART ANALYSIS",
  });

  const handleCategoryChange = (category: string) => {
    setMainCategory(category);
    setSubCategory("all");
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {!hasAccess ? (
            <TrialExpiredLockScreen />
          ) : (
            <>
          {/* Main Category Tabs - Horizontal Scrollable */}
          <div className="mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-8 min-w-max pb-2 px-2">
              <button
                onClick={() => handleCategoryChange("FOREX")}
                className={`text-lg font-semibold pb-3 border-b-2 transition-colors ${
                  mainCategory === "FOREX"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                FOREX
              </button>
              <button
                onClick={() => handleCategoryChange("COMMODITIES")}
                className={`text-lg font-semibold pb-3 border-b-2 transition-colors ${
                  mainCategory === "COMMODITIES"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                COMM
              </button>
              <button
                onClick={() => handleCategoryChange("INDICES")}
                className={`text-lg font-semibold pb-3 border-b-2 transition-colors ${
                  mainCategory === "INDICES"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                INDEX
              </button>
              <button
                onClick={() => handleCategoryChange("CRYPTO")}
                className={`text-lg font-semibold pb-3 border-b-2 transition-colors ${
                  mainCategory === "CRYPTO"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                CRYPTO
              </button>
              <button
                onClick={() => handleCategoryChange("DERIV/BINARY")}
                className={`text-lg font-semibold pb-3 border-b-2 transition-colors whitespace-nowrap ${
                  mainCategory === "DERIV/BINARY"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                DERIV
              </button>
              <button
                onClick={() => handleCategoryChange("CHART ANALYSIS")}
                className={`text-lg font-semibold pb-3 border-b-2 transition-colors whitespace-nowrap ${
                  mainCategory === "CHART ANALYSIS"
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent"
                }`}
              >
                CHARTS
              </button>
            </div>
          </div>

          {/* Sub-Category Filter (only show for non-chart analysis) */}
          {mainCategory !== "CHART ANALYSIS" && (
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-64">
                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by asset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Assets</SelectItem>
                    {subCategoryOptions[mainCategory]?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <FilterBar activeFilter={filter} onFilterChange={setFilter} />
              </div>
            </div>
          )}

          {/* Chart Analysis View */}
          {mainCategory === "CHART ANALYSIS" && (
            <>
              {isLoadingCharts ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {chartAnalysis?.map((analysis) => (
                    <Card key={analysis.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <CardTitle className="text-lg">{analysis.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <img 
                          src={analysis.image_url} 
                          alt={analysis.title} 
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        {analysis.description && (
                          <p className="text-sm text-muted-foreground">{analysis.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {new Date(analysis.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoadingCharts && chartAnalysis?.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No chart analysis available</p>
                </div>
              )}
            </>
          )}

          {/* Signals View */}
          {mainCategory !== "CHART ANALYSIS" && (
            <>
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {signals?.map((signal) => (
                    <SignalCardNew key={signal.id} signal={signal as any} />
                  ))}
                </div>
              )}

              {!isLoading && signals?.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No signals found</p>
                </div>
              )}
            </>
          )}
        </>
        )}
        </div>
      </main>

      <BrokerAccountButton />
      <Footer />
    </div>
  );
};

export default SignalsDashboard;
