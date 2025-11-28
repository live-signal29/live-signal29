import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import AdBanner from "@/components/AdBanner";
import SEO from "@/components/SEO";
import { getBreadcrumbStructuredData } from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Coins, Activity, Bitcoin, BarChart3, LineChart, Star, Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrialExpiredLockScreen from "@/components/TrialExpiredLockScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";
import { useFavorites } from "@/hooks/useFavorites";
import SignalsSkeleton from "@/components/SignalsSkeleton";
import ChartLightbox from "@/components/ChartLightbox";
import { differenceInDays, startOfDay } from "date-fns";
import { ExnessAffiliateBanner } from "@/components/ExnessAffiliateBanner";
import { XMAffiliateBanner } from "@/components/XMAffiliateBanner";
import { ExnessPopup } from "@/components/ExnessPopup";

const SignalsDashboard = () => {
  const { hasAccess, loading: accessLoading } = useSubscriptionAccess();
  const [mainCategory, setMainCategory] = useState("COMMODITIES");
  const [subCategory, setSubCategory] = useState<string>("all");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);
  const { favoritePairs } = useFavorites();

  // Initialize notification system
  useSignalNotifications();

  const breadcrumbData = getBreadcrumbStructuredData([
    { name: "Home", url: "https://yourdomain.com" },
    { name: "Live Signals Dashboard", url: "https://yourdomain.com/signals-dashboard" }
  ]);

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
        .order("created_at", { ascending: false })
        .limit(50); // Limit initial load to 50 signals

      if (subCategory && subCategory !== "all") {
        query = query.eq("sub_category", subCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: mainCategory !== "CHART ANALYSIS",
    staleTime: 30000, // Cache for 30 seconds
  });

  // Setup realtime subscription for instant updates (deferred)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
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
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [refetch]);

  const { data: chartAnalysis, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["chart-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_analysis")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30); // Limit charts to 30
      if (error) throw error;
      return data;
    },
    enabled: mainCategory === "CHART ANALYSIS",
    staleTime: 60000, // Cache for 60 seconds
  });

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  const handleCategoryChange = (category: string) => {
    setMainCategory(category);
    setSubCategory("all");
  };

  // Removed blocking loading screen - show content immediately

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Live Signals Dashboard - Real-time Trading Signals"
        description="Access real-time trading signals for Forex, Crypto, Commodities, and Indices. Get instant notifications, professional analysis, and high-accuracy signals."
        keywords="live signals dashboard, trading signals, forex signals live, crypto signals real-time, commodities trading, indices signals"
        url="https://yourdomain.com/signals-dashboard"
        structuredData={breadcrumbData}
      />
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
          {!hasAccess ? (
            <TrialExpiredLockScreen />
          ) : (
            <>
          {/* Top Ad Banner */}
          <div className="mb-4">
            <AdBanner />
          </div>

          {/* Main Category Tabs - Horizontal Scrollable with Icons */}
          <div className="mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 sm:gap-6 min-w-max pb-2 px-1">
              {[
                { key: "COMMODITIES", label: "COMM" },
                { key: "FOREX", label: "FOREX" },
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

          {/* Favorites Filter Button */}
          {mainCategory !== "CHART ANALYSIS" && (
            <div className="mb-4 flex justify-end">
              <Button
                variant={showFavoritesOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className="gap-2"
              >
                <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                {showFavoritesOnly ? 'Show All Signals' : 'My Favorites'}
              </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {chartAnalysis?.map((analysis, index) => (
                    <Card 
                      key={analysis.id} 
                      className="group overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer"
                      onClick={() => openLightbox(index)}
                    >
                      <div className="relative aspect-video w-full overflow-hidden bg-muted">
                        <img
                          src={analysis.image_url}
                          alt={analysis.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 hover:bg-white"
                          >
                            <Maximize2 className="h-5 w-5 text-black" />
                          </Button>
                        </div>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg group-hover:text-primary transition-colors">
                          {analysis.title}
                        </CardTitle>
                      </CardHeader>
                      {analysis.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {analysis.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Chart Lightbox */}
              {chartAnalysis && chartAnalysis.length > 0 && (
                <ChartLightbox
                  isOpen={lightboxOpen}
                  onClose={() => setLightboxOpen(false)}
                  charts={chartAnalysis}
                  initialIndex={selectedChartIndex}
                />
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
                <SignalsSkeleton />
              ) : (
                <div className="space-y-6">
                  {signals && signals.length > 0 && (() => {
                    // Filter by favorite pairs if enabled
                    const filteredSignals = showFavoritesOnly 
                      ? signals.filter(signal => favoritePairs.has(signal.pair))
                      : signals;

                    if (filteredSignals.length === 0) {
                      return (
                        <div className="text-center py-20">
                          <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                          <p className="text-muted-foreground text-lg">
                            {showFavoritesOnly 
                              ? 'No favorite signals yet. Star your favorite signals to see them here!' 
                              : 'No signals found in the last 7 days'}
                          </p>
                        </div>
                      );
                    }

                    const groupedSignals: { [key: string]: typeof filteredSignals } = {};
                    filteredSignals.forEach((signal) => {
                      const date = startOfDay(new Date(signal.created_at)).toISOString();
                      if (!groupedSignals[date]) {
                        groupedSignals[date] = [];
                      }
                      groupedSignals[date].push(signal);
                    });

                    const dateEntries = Object.entries(groupedSignals);
                    
                    return dateEntries.map(([date, daySignals], index) => (
                      <div key={date}>
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                            {daySignals.map((signal) => (
                              <SignalCardNew 
                                key={signal.id} 
                                signal={signal as any}
                                hasAccess={hasAccess}
                              />
                            ))}
                          </div>
                          <div className="border-t border-border/50 my-4"></div>
                        </div>
                        
                        {/* Show affiliate banners after first date group (Today's signals) */}
                        {index === 0 && dateEntries.length > 1 && (
                          <>
                            <ExnessAffiliateBanner />
                            <XMAffiliateBanner />
                          </>
                        )}
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

          {/* Bottom Ad Banner */}
          <div className="mt-6">
            <AdBanner />
          </div>
        </>
        )}
        </div>
      </main>

      <ExnessPopup />
      <Footer />
    </div>
  );
};

export default SignalsDashboard;
