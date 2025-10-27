import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const ChartAnalysis = () => {
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
              {analyses?.map((analysis) => (
                <Card key={analysis.id} className="card-hover overflow-hidden">
                  {analysis.image_url && (
                    <div className="aspect-video w-full overflow-hidden">
                      <img
                        src={analysis.image_url}
                        alt={analysis.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-xl">{analysis.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(analysis.created_at), "MMM dd, yyyy")}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{analysis.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
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
