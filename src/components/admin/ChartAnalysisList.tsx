import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ChartAnalysisList = () => {
  const queryClient = useQueryClient();

  const { data: analyses, isLoading } = useQuery({
    queryKey: ["admin-chart-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chart_analysis")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const togglePublished = async (id: string, currentValue: boolean) => {
    try {
      const { error } = await supabase
        .from("chart_analysis")
        .update({ published: !currentValue })
        .eq("id", id);
      
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-chart-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["chart-analysis"] });
      toast.success(currentValue ? "Analysis unpublished" : "Analysis published");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteAnalysis = async (id: string) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;

    try {
      const { error } = await supabase.from("chart_analysis").delete().eq("id", id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["admin-chart-analysis"] });
      queryClient.invalidateQueries({ queryKey: ["chart-analysis"] });
      toast.success("Analysis deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {analyses?.map((analysis) => (
        <Card key={analysis.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>{analysis.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(analysis.created_at), "MMM dd, yyyy")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => togglePublished(analysis.id, analysis.published)}>
                  {analysis.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button size="sm" variant="destructive" onClick={() => deleteAnalysis(analysis.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <img src={analysis.image_url} alt={analysis.title} className="w-full max-h-60 object-cover rounded mb-4" />
            {analysis.description && <p className="text-muted-foreground">{analysis.description}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ChartAnalysisList;
