import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Megaphone, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

interface Headline {
  id: string;
  text: string;
  headline_type: "normal" | "high_alert";
  is_active: boolean;
  created_at: string;
}

const HeadlinesManagement = () => {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    text: "",
    headline_type: "normal" as "normal" | "high_alert",
    is_active: true,
  });

  const { data: headlines, isLoading } = useQuery({
    queryKey: ["admin-headlines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("headlines")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Headline[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Deactivate all other headlines first
      if (data.is_active) {
        await supabase.from("headlines").update({ is_active: false }).neq("id", "");
      }
      const { error } = await supabase.from("headlines").insert({
        text: data.text,
        headline_type: data.headline_type,
        is_active: data.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-headlines"] });
      queryClient.invalidateQueries({ queryKey: ["active-headline"] });
      toast.success("Headline added");
      resetForm();
    },
    onError: (error) => {
      toast.error("Failed to add: " + error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (is_active) {
        // Deactivate all others first
        await supabase.from("headlines").update({ is_active: false }).neq("id", id);
      }
      const { error } = await supabase.from("headlines").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-headlines"] });
      queryClient.invalidateQueries({ queryKey: ["active-headline"] });
      toast.success("Headline updated");
    },
    onError: (error) => {
      toast.error("Failed to update: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("headlines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-headlines"] });
      queryClient.invalidateQueries({ queryKey: ["active-headline"] });
      toast.success("Headline deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ text: "", headline_type: "normal", is_active: true });
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) {
      toast.error("Headline text is required");
      return;
    }
    if (formData.text.length > 120) {
      toast.error("Headline must be 120 characters or less");
      return;
    }
    addMutation.mutate(formData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Headlines / Ticker
        </h2>
        {!isAdding && (
          <Button onClick={() => setIsAdding(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Headline
          </Button>
        )}
      </div>

      {isAdding && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">New Headline (max 120 chars)</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label htmlFor="text" className="text-xs">Headline Text *</Label>
                <Input
                  id="text"
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Breaking: Gold hits new highs..."
                  maxLength={120}
                  className="mt-1"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formData.text.length}/120 characters
                </p>
              </div>

              <div>
                <Label htmlFor="type" className="text-xs">Type</Label>
                <Select
                  value={formData.headline_type}
                  onValueChange={(val: "normal" | "high_alert") =>
                    setFormData({ ...formData, headline_type: val })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high_alert">🔴 High Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active" className="text-xs">Active (replaces current)</Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={addMutation.isPending}>
                  Add
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-muted/50 rounded-lg h-16" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {headlines?.map((headline) => (
            <Card key={headline.id} className={!headline.is_active ? "opacity-60" : ""}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {headline.headline_type === "high_alert" ? (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : (
                      <Megaphone className="h-4 w-4 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{headline.text}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(headline.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={headline.is_active}
                      onCheckedChange={(checked) =>
                        toggleMutation.mutate({ id: headline.id, is_active: checked })
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(headline.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {headlines?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No headlines yet
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default HeadlinesManagement;
