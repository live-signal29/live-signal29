import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SignalCardNew from "@/components/SignalCardNew";
import AdBanner from "@/components/AdBanner";
import SEO from "@/components/SEO";
import { getBreadcrumbStructuredData } from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Coins, Bitcoin, BarChart3, LineChart, Maximize2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrialExpiredLockScreen from "@/components/TrialExpiredLockScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";
import SignalsSkeleton from "@/components/SignalsSkeleton";
import { useLivePricesFetch } from "@/hooks/useLivePrices";
import ChartLightbox from "@/components/ChartLightbox";
import { differenceInDays, startOfDay, formatDistanceToNow } from "date-fns";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { ExnessPopup } from "@/components/ExnessPopup";
import HeadlineTicker from "@/components/HeadlineTicker";
import { ChartReactions } from "@/components/ChartReactions";

const SIGNALS_PER_PAGE = 20;

const SignalsDashboard = () => {
  const { hasAccess, loading: accessLoading, subscriptionStatus } = useSubscriptionAccess();
  const [mainCategory, setMainCategory] = useState("COMMODITIES");
  const [subCategory, setSubCategory] = useState<string>("all");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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
      case "CRYPTO": return <Bitcoin className="h-4 w-4" />;
      case "DERIV/BINARY": return <BarChart3 className="h-4 w-4" />;
      case "MARKET IDEAS": return <LineChart className="h-4 w-4" />;
      default: return null;
    }
  };

  const subCategoryOptions: Record<string, string[]> = {
    FOREX: ["EUR/USD", "GBP/USD", "USD/JPY", "CHF/JPY", "CAD/JPY", "AUD/USD", "NZD/USD", "USD/CAD", "USD/CHF"],
    COMMODITIES: ["XAU/USD (Gold)", "XAG/USD (Silver)", "Oil - Crude", "Oil - Brent", "Natural Gas", "US30", "NASDAQ", "S&P500", "DAX", "FTSE100", "Nikkei"],
    CRYPTO: ["BTC/USD", "ETH/USD", "XRP/USD", "LTC/USD", "ADA/USD", "SOL/USD"],
    "DERIV/BINARY": ["BOOM 1000", "BOOM 500", "CRASH 1000", "CRASH 500", "VOL 75", "VOL 100"],
  };

  // Infinite query for signals using secure RPC function
  const {
    data: signalsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ["signals-infinite", mainCategory, subCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_signals_filtered', {
        p_main_category: mainCategory,
        p_sub_category: subCategory || 'all',
        p_limit: SIGNALS_PER_PAGE,
        p_offset: pageParam * SIGNALS_PER_PAGE
      });

      if (error) throw error;
      return { data: data || [], nextPage: (data?.length || 0) === SIGNALS_PER_PAGE ? pageParam + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: mainCategory !== "MARKET IDEAS",
    staleTime: 60000,
  });

  const signals = signalsData?.pages.flatMap(page => page.data) || [];
  
  // Extract unique pairs for OPEN signals to fetch live prices
  const openSignalPairs = signals
    .filter(s => s.signal_status !== 'CLOSE')
    .map(s => s.pair)
    .filter((pair, index, arr) => arr.indexOf(pair) === index);
  
  // Fetch live prices for open signals
  const { prices: livePrices } = useLivePricesFetch(openSignalPairs, openSignalPairs.length > 0);

  // Setup realtime subscription for instant updates (deferred for performance)
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
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [refetch]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: chartAnalysis, isLoading: isLoadingCharts } = useQuery({
    queryKey: ["chart-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_analysis")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
    enabled: mainCategory === "MARKET IDEAS",
    staleTime: 120000,
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
      
      {/* Headline Ticker - below header */}
      <HeadlineTicker />
      
      <main className="flex-1">
        <div className="container mx-auto px-2 sm:px-4 py-3 sm:py-6 max-w-7xl">
          {!hasAccess ? (
            <TrialExpiredLockScreen />
          ) : (
            <>
          {/* Top Ad Banner - Only for non-premium users */}
          {subscriptionStatus !== 'premium' && (
            <div className="mb-4">
              <AdBanner />
            </div>
          )}

          {/* Main Category Tabs - Horizontal Scrollable with Icons */}
          <div className="mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
            <div className="flex gap-3 sm:gap-6 min-w-max pb-2 px-1">
              {[
                { key: "COMMODITIES", label: "COMM" },
                { key: "FOREX", label: "FOREX" },
                { key: "CRYPTO", label: "CRYPTO" },
                { key: "DERIV/BINARY", label: "DERIV" },
                { key: "MARKET IDEAS", label: "💡 IDEAS" },
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

          {/* Market Ideas View */}
          {mainCategory === "MARKET IDEAS" && (
            <>
              {isLoadingCharts ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {chartAnalysis?.map((analysis, index) => {
                    const hasImage = !!analysis.image_url && String(analysis.image_url).trim() !== "";
                    const timeAgo = formatDistanceToNow(new Date(analysis.created_at), { addSuffix: true });

                    return (
                      <Card
                        key={analysis.id}
                        className="group overflow-hidden hover:shadow-xl transition-all duration-300"
                      >
                        {hasImage && (
                          <div
                            className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                            onClick={() => openLightbox(index)}
                          >
                            <img
                              src={analysis.image_url}
                              alt={analysis.title || "Trading idea chart"}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/15 transition-colors duration-300 flex items-center justify-center">
                              <Button
                                size="icon"
                                variant="secondary"
                                className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-background/90 hover:bg-background"
                              >
                                <Maximize2 className="h-5 w-5 text-foreground" />
                              </Button>
                            </div>
                          </div>
                        )}

                        <CardHeader className="pb-2">
                          {analysis.title && (
                            <CardTitle className="text-lg group-hover:text-primary transition-colors">
                              {analysis.title}
                            </CardTitle>
                          )}
                          <p className="text-xs text-muted-foreground">{timeAgo}</p>
                        </CardHeader>

                        {analysis.description && (
                          <CardContent className="pt-0 pb-2">
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {analysis.description}
                            </p>
                          </CardContent>
                        )}

                        <CardContent className="pt-2 border-t border-border/50">
                          <ChartReactions chartId={analysis.id} />
                        </CardContent>
                      </Card>
                    );
                  })}
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
          {mainCategory !== "MARKET IDEAS" && (
            <>
              {isLoading ? (
                <SignalsSkeleton />
              ) : (
                <div className="space-y-6">
                  {signals && signals.length > 0 && (() => {
                    const filteredSignals = signals;

                    if (filteredSignals.length === 0) {
                      return (
                        <div className="text-center py-20">
                          <p className="text-muted-foreground text-lg">No signals found</p>
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
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4">
                            {daySignals.map((signal) => (
                              <SignalCardNew 
                                key={signal.id} 
                                signal={signal as any}
                                hasAccess={hasAccess}
                                subscriptionStatus={subscriptionStatus}
                                livePrice={livePrices[signal.pair] ? parseFloat(livePrices[signal.pair]) : undefined}
                              />
                            ))}
                          </div>
                          <div className="border-t border-border/50 my-4"></div>
                        </div>
                        
                        {/* Show affiliate banner carousel after first date group (Today's signals) */}
                        {index === 0 && dateEntries.length > 1 && (
                          <AffiliateBannerCarousel />
                        )}
                        
                        {/* Show affiliate banner before last date group */}
                        {index === dateEntries.length - 2 && dateEntries.length > 2 && (
                          <AffiliateBannerCarousel />
                        )}
                      </div>
                    ));
                  })()}
                  
                  {/* Infinite scroll loader */}
                  <div ref={loadMoreRef} className="py-8 flex justify-center">
                    {isFetchingNextPage && (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    )}
                    {!hasNextPage && signals.length > 0 && (
                      <p className="text-muted-foreground text-sm">All signals loaded</p>
                    )}
                  </div>
                </div>
              )}

              {!isLoading && signals?.length === 0 && (
                <div className="text-center py-20">
                  <p className="text-muted-foreground text-lg">No signals found</p>
                </div>
              )}
            </>
          )}

          {/* Bottom Ad Banner - Only for non-premium users */}
          {subscriptionStatus !== 'premium' && (
            <div className="mt-6">
              <AdBanner />
            </div>
          )}
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
