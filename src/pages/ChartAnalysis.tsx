import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Maximize2 } from "lucide-react";
import { format } from "date-fns";
import ChartLightbox from "@/components/ChartLightbox";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";
import { ChartReactions } from "@/components/ChartReactions";

const ChartAnalysis = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedChartIndex, setSelectedChartIndex] = useState(0);

  const { data: analyses, isLoading } = useQuery({
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

  const openLightbox = (index: number) => {
    setSelectedChartIndex(index);
    setLightboxOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">
              <span className="gradient-text">Chart Analysis Setup</span>
            </h1>
            <p className="text-muted-foreground">Expert chart analysis and trading setups</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {analyses?.map((analysis, index) => (
                <>
                  <Card 
                    key={analysis.id} 
                    className="group overflow-hidden hover:shadow-xl transition-all duration-300"
                  >
                    {analysis.image_url && (
                      <div 
                        className="relative aspect-video w-full overflow-hidden bg-muted cursor-pointer"
                        onClick={() => openLightbox(index)}
                      >
                        <img
                          src={analysis.image_url}
                          alt={analysis.title || "Chart"}
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
                      {analysis.title && (
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {analysis.title}
                        </CardTitle>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(analysis.created_at), "MMM dd, yyyy")}
                      </p>
                    </CardHeader>
                    {analysis.description && (
                      <CardContent className="pt-0 pb-2">
                        <p className="text-muted-foreground line-clamp-2">
                          {analysis.description}
                        </p>
                      </CardContent>
                    )}
                    <CardContent className="pt-2 border-t border-border/50">
                      <ChartReactions chartId={analysis.id} />
                    </CardContent>
                  </Card>
                  
                  {/* Add affiliate banner after first chart */}
                  {index === 0 && (
                    <div className="md:col-span-2">
                      <AffiliateBannerCarousel />
                    </div>
                  )}
                  
                  {/* Add affiliate banner before last chart */}
                  {analyses && index === analyses.length - 2 && analyses.length > 1 && (
                    <div className="md:col-span-2">
                      <AffiliateBannerCarousel />
                    </div>
                  )}
                </>
              ))}
            </div>
          )}

          {/* Lightbox */}
          {analyses && analyses.length > 0 && (
            <ChartLightbox
              isOpen={lightboxOpen}
              onClose={() => setLightboxOpen(false)}
              charts={analyses}
              initialIndex={selectedChartIndex}
            />
          )}

          {!isLoading && analyses?.length === 0 && (
            <div className="text-center py-20">
              <p className="text-muted-foreground text-lg">No chart analysis found</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ChartAnalysis;
