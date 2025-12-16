import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, Lightbulb, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { MarketIdea } from "@/hooks/useMarketIdeas";

const MarketIdeasManagement = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    published: true,
  });

  // Fetch all market ideas (including unpublished for admin)
  const { data: ideas, isLoading } = useQuery({
    queryKey: ["admin-market-ideas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("market_ideas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MarketIdea[];
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("market_ideas").insert({
        title: data.title,
        description: data.description,
        image_url: data.image_url || null,
        published: data.published,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-market-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["market-ideas"] });
      toast.success("Market idea added");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add: " + error.message);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("market_ideas")
        .update({
          title: data.title,
          description: data.description,
          image_url: data.image_url || null,
          published: data.published,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-market-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["market-ideas"] });
      toast.success("Market idea updated");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("market_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-market-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["market-ideas"] });
      toast.success("Market idea deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", image_url: "", published: true });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (idea: MarketIdea) => {
    setFormData({
      title: idea.title,
      description: idea.description,
      image_url: idea.image_url || "",
      published: idea.published,
    });
    setEditingId(idea.id);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      addMutation.mutate(formData);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          Market Ideas
        </h2>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Idea
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {editingId ? "Edit Market Idea" : "New Market Idea"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="title" className="text-xs">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. XAUUSD bullish setup"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-xs">Analysis / Idea *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Write your market analysis or idea..."
                  className="mt-1 min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="image_url" className="text-xs flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  Image URL (optional)
                </Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://example.com/chart.png"
                  className="mt-1"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
                <Label htmlFor="published" className="text-xs">Published</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addMutation.isPending || updateMutation.isPending}>
                  {editingId ? "Update" : "Add"}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Ideas List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-muted/50 rounded-lg h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {ideas?.map((idea) => (
            <Card key={idea.id} className={!idea.published ? "opacity-60" : ""}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">{idea.title}</h4>
                      {!idea.published && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">Draft</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {idea.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(idea)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(idea.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {ideas?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No market ideas yet
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MarketIdeasManagement;
