import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import ChartLightbox from "@/components/ChartLightbox";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { ChartReactions } from "@/components/ChartReactions";
import MarketIdeaCard from "@/components/MarketIdeaCard";

interface CombinedIdea {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  source: "chart" | "market";
}

const ChartAnalysis = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);

  const { data: chartAnalyses } = useQuery({
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
  });

  const { data: marketIdeas } = useQuery({
    queryKey: ["market-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_ideas")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = !chartAnalyses && !marketIdeas;

  // Merge both sources and sort by date
  const allIdeas: CombinedIdea[] = [
    ...(chartAnalyses?.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      image_url: a.image_url,
      created_at: a.created_at,
      source: "chart" as const,
    })) || []),
    ...(marketIdeas?.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      image_url: m.image_url,
      created_at: m.created_at,
      source: "market" as const,
    })) || []),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // For lightbox, only use chart_analysis items that have images
  const lightboxCharts = chartAnalyses?.filter((a) => a.image_url && a.image_url.trim() !== "") || [];

  const openLightbox = (chartId: string) => {
    const idx = lightboxCharts.findIndex((c) => c.id === chartId);
    if (idx >= 0) {
      setSelectedChartIndex(idx);
      setLightboxOpen(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text">💡 Ideas</span>
            </h1>
            <p className="text-muted-foreground">Expert trading ideas and market insights</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allIdeas.map((idea, index) => (
                <div key={idea.id}>
                  {idea.source === "chart" ? (
                    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full">
                      {idea.image_url && idea.image_url.trim() !== '' && (
                        <div 
                          className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                          onClick={() => openLightbox(idea.id)}
                        >
                          <img
                            src={idea.image_url}
                            alt={idea.title || "Chart"}
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
                      )}
                      <CardHeader className="pb-2">
                        {idea.title && (
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {idea.title}
                          </CardTitle>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                        </p>
                      </CardHeader>
                      {idea.description && (
                        <CardContent className="pt-0 pb-2">
                          <p className="text-muted-foreground line-clamp-2">
                            {idea.description}
                          </p>
                        </CardContent>
                      )}
                      <CardContent className="pt-2 border-t border-border/50">
                        <ChartReactions chartId={idea.id} />
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="group overflow-hidden hover:shadow-xl transition-all duration-300 h-full">
                      {idea.image_url && idea.image_url.trim() !== '' && (
                        <div className="relative aspect-video w-full overflow-hidden bg-muted">
                          <img
                            src={idea.image_url}
                            alt={idea.title || "Market Idea"}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <CardHeader className="pb-2">
                        {idea.title && (
                          <CardTitle className="text-xl group-hover:text-primary transition-colors">
                            {idea.title}
                          </CardTitle>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                        </p>
                      </CardHeader>
                      {idea.description && (
                        <CardContent className="pt-0 pb-2">
                          <p className="text-muted-foreground line-clamp-3">
                            {idea.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  )}

                  {/* Add affiliate banner after first item */}
                  {index === 0 && (
                    <div className="md:col-span-2 mt-6">
                      <AffiliateBannerCarousel />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Lightbox */}
          {lightboxCharts.length > 0 && (
            <ChartLightbox
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              charts={lightboxCharts}
              initialIndex={selectedChartIndex}
            />
          )}

          {!isLoading && allIdeas.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No ideas found</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ChartAnalysis;
