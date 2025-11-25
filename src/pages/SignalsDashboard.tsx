import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Coins, Activity, Bitcoin, BarChart3, LineChart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import TrialExpiredLockScreen from "@/components/TrialExpiredLockScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { differenceInDays, startOfDay } from "date-fns";

const SignalsDashboard = () => {
  const { hasAccess, loading: accessLoading } = useSubscriptionAccess();
  const [mainCategory, setMainCategory] = useState("FOREX");
  const [subCategory, setSubCategory] = useState<string>("all");

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "FOREX": return <TrendingUp className="h-4 w-4" />;
      case "COMMODITIES": return <Coins className="h-4 w-4" />;
      case "INDICES": return <Activity className="h-4 w-4" />;
      case "CRYPTO": return <Bitcoin className="h-4 w-4" />;
      case "DERIV/BINARY": return <BarChart3 className="h-4 w-4" />;
      case "CHART ANALYSIS": return <LineChart className="h-4 w-4" />;
      default: return null;
    }
  };

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas"],
    INDICES: ["US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  const { data: signals, isLoading, refetch } = useQuery({
    queryKey: ["signals", mainCategory, subCategory],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      let query = supabase
        .from("signals")
        .select("*")
        .eq("main_category", mainCategory)
        .eq("published", true)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (subCategory && subCategory !== "all") {
        query = query.eq("sub_category", subCategory);
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
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
          {!hasAccess ? (
            <TrialExpiredLockScreen />
          ) : (
            <>
          {/* Main Category Tabs - Horizontal Scrollable with Icons */}
          <div className="mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 sm:gap-6 min-w-max pb-2 px-1">
              {[
                { key: "FOREX", label: "FOREX" },
                { key: "COMMODITIES", label: "COMM" },
                { key: "INDICES", label: "INDEX" },
                { key: "CRYPTO", label: "CRYPTO" },
                { key: "DERIV/BINARY", label: "DERIV" },
                { key: "CHART ANALYSIS", label: "CHARTS" },
              ].map((category) => (
                <button
                  key={category.key}
                  onClick={() => handleCategoryChange(category.key)}
                  className={`flex items-center gap-2 text-sm sm:text-base font-semibold pb-2 sm:pb-3 border-b-2 transition-all ${
                    mainCategory === category.key
                      ? "text-primary border-primary scale-105"
                      : "text-muted-foreground border-transparent hover:text-primary/70"
                  }`}
                >
                  {getCategoryIcon(category.key)}
                  <span className="whitespace-nowrap">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sub-Category Filter (only show for non-chart analysis) */}
          {mainCategory !== "CHART ANALYSIS" && (
            <div className="mb-4 sm:mb-6">
              <div className="w-full sm:w-64">
                <Select value={subCategory} onValueChange={setSubCategory}>
                  <SelectTrigger className="text-xs sm:text-sm h-9 sm:h-10">
                    <SelectValue placeholder="Filter by asset" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectItem value="all">All Assets</SelectItem>
                    {subCategoryOptions[mainCategory]?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

          {/* Signals View with Day Separators */}
          {mainCategory !== "CHART ANALYSIS" && (
            <>
              {isLoading ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {signals && signals.length > 0 && (() => {
                    const groupedSignals: { [key: string]: typeof signals } = {};
                    signals.forEach((signal) => {
                      const date = startOfDay(new Date(signal.created_at)).toISOString();
                      if (!groupedSignals[date]) {
                        groupedSignals[date] = [];
                      }
                      groupedSignals[date].push(signal);
                    });

                    return Object.entries(groupedSignals).map(([date, daySignals]) => (
                      <div key={date} className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                          {daySignals.map((signal) => (
                            <SignalCardNew key={signal.id} signal={signal as any} />
                          ))}
                        </div>
                        <div className="border-t border-border/50 my-4"></div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {!isLoading && signals?.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No signals found in the last 7 days</p>
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
