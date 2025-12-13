import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdBanner from "@/components/AdBanner";
import SEO from "@/components/SEO";
import { getBreadcrumbStructuredData } from "@/components/StructuredData";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, TrendingUp, Coins, Activity, Bitcoin, BarChart3, LineChart, Maximize2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import TrialExpiredLockScreen from "@/components/TrialExpiredLockScreen";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";
import SignalSection from "@/components/signals/SignalSection";
import LiveSignalCard from "@/components/signals/LiveSignalCard";
import OpenTradeCard from "@/components/signals/OpenTradeCard";
import ClosedTradeCard from "@/components/signals/ClosedTradeCard";
import SignalsSkeleton from "@/components/SignalsSkeleton";
import ChartLightbox from "@/components/ChartLightbox";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { ExnessPopup } from "@/components/ExnessPopup";

const SIGNALS_PER_PAGE = 50;

const SignalsDashboard = () => {
  const { hasAccess, loading: accessLoading, subscriptionStatus } = useSubscriptionAccess();
  const [mainCategory, setMainCategory] = useState("COMMODITIES");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);
  const loadMoreRef = useRef<HTMLDivElement>(null);

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

  const isPremiumUser = subscriptionStatus === 'premium';

  // Fetch signals using secure RPC
  const {
    data: signalsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useInfiniteQuery({
    queryKey: ["signals-infinite", mainCategory],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase.rpc('get_signals_filtered', {
        p_main_category: mainCategory,
        p_sub_category: 'all',
        p_limit: SIGNALS_PER_PAGE,
        p_offset: pageParam * SIGNALS_PER_PAGE
      });

      if (error) throw error;
      return { data: data || [], nextPage: (data?.length || 0) === SIGNALS_PER_PAGE ? pageParam + 1 : undefined };
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
    enabled: mainCategory !== "CHART ANALYSIS",
    staleTime: 30000,
  });

  const signals = signalsData?.pages.flatMap(page => page.data) || [];

  // Categorize signals into three sections
  const { liveSignals, openTrades, closedTrades } = useMemo(() => {
    if (!signals) return { liveSignals: [], openTrades: [], closedTrades: [] };

    const live: any[] = [];
    const open: any[] = [];
    const closed: any[] = [];

    signals.forEach((signal) => {
      const status = signal.signal_status || "OPEN";
      const hasAnyTpHit = signal.tp1_hit || signal.tp2_hit || signal.tp3_hit || signal.tp4_hit;
      const isClosed = status === "CLOSE" || signal.sl_hit;

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

  // Realtime subscription
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel('signals-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'signals' }, () => refetch())
        .subscribe();

      return () => supabase.removeChannel(channel);
    }, 2000);

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

    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
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
    enabled: mainCategory === "CHART ANALYSIS",
    staleTime: 60000,
  });

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Live Signals Dashboard - Real-time Trading Signals"
        description="Access real-time trading signals for Forex, Crypto, Commodities, and Indices."
        keywords="live signals dashboard, trading signals, forex signals"
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
              {subscriptionStatus !== 'premium' && (
                <div className="mb-4">
                  <AdBanner />
                </div>
              )}

              {/* Category Tabs */}
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
                      onClick={() => setMainCategory(category.key)}
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

              {/* Three-Section Signal Layout */}
              {mainCategory !== "CHART ANALYSIS" && (
                <>
                  {isLoading ? (
                    <SignalsSkeleton />
                  ) : (
                    <div className="space-y-8">
                      {/* Live Signals Section */}
                      <SignalSection type="live" title="Live Signals" count={liveSignals.length}>
                        {liveSignals.length === 0 ? (
                          <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground">
                              No live signals right now. Check back soon!
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {liveSignals.map((signal) => (
                              <LiveSignalCard
                                key={signal.id}
                                signal={signal as any}
                                isPremiumUser={isPremiumUser}
                              />
                            ))}
                          </div>
                        )}
                      </SignalSection>

                      {/* Affiliate Banner */}
                      <AffiliateBannerCarousel />

                      {/* Open Trades Section */}
                      <SignalSection type="open" title="Open Trades" count={openTrades.length}>
                        {openTrades.length === 0 ? (
                          <Card className="border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground">
                              No open trades. Active trades will appear here.
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {openTrades.map((signal) => (
                              <OpenTradeCard
                                key={signal.id}
                                signal={signal as any}
                                isPremiumUser={isPremiumUser}
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
                              No closed trades yet.
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {closedTrades.slice(0, 10).map((signal) => (
                              <ClosedTradeCard
                                key={signal.id}
                                signal={signal as any}
                                isPremiumUser={isPremiumUser}
                              />
                            ))}
                          </div>
                        )}
                        {closedTrades.length > 10 && (
                          <p className="text-center text-sm text-muted-foreground mt-4">
                            Showing 10 of {closedTrades.length} closed trades
                          </p>
                        )}
                      </SignalSection>

                      {/* Infinite scroll loader */}
                      <div ref={loadMoreRef} className="py-4 flex justify-center">
                        {isFetchingNextPage && (
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
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
