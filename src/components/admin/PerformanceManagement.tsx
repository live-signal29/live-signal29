import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, Loader2, BarChart3, TrendingUp, Edit2, Save, X } from "lucide-react";

interface PerformanceEntry {
  id: string;
  period: string;
  date: string;
  total_trades: number;
  winning_trades: number;
  profit_percentage: number;
  notes: string | null;
  is_published: boolean;
}

const PerformanceManagement = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    period: 'daily',
    date: format(new Date(), 'yyyy-MM-dd'),
    total_trades: 0,
    winning_trades: 0,
    profit_percentage: 0,
    notes: '',
    is_published: true
  });

  const { data: performanceData, isLoading } = useQuery({
    queryKey: ['admin-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_performance')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as PerformanceEntry[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('account_performance')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-performance'] });
      toast.success("Performance entry added");
      resetForm();
    },
    onError: () => {
      toast.error("Failed to add entry");
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const { error } = await supabase
        .from('account_performance')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-performance'] });
      toast.success("Entry updated");
      setEditingId(null);
    },
    onError: () => {
      toast.error("Failed to update");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('account_performance')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-performance'] });
      toast.success("Entry deleted");
    },
    onError: () => {
      toast.error("Failed to delete");
    }
  });

  const resetForm = () => {
    setFormData({
      period: 'daily',
      date: format(new Date(), 'yyyy-MM-dd'),
      total_trades: 0,
      winning_trades: 0,
      profit_percentage: 0,
      notes: '',
      is_published: true
    });
    setShowForm(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const startEdit = (entry: PerformanceEntry) => {
    setEditingId(entry.id);
    setFormData({
      period: entry.period,
      date: entry.date,
      total_trades: entry.total_trades,
      winning_trades: entry.winning_trades,
      profit_percentage: entry.profit_percentage,
      notes: entry.notes || '',
      is_published: entry.is_published
    });
  };

  const saveEdit = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Live Performance Management
            </CardTitle>
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              {showForm ? "Cancel" : "Add Entry"}
            </Button>
          </div>
        </CardHeader>
        
        {showForm && (
          <CardContent className="border-t pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select value={formData.period} onValueChange={(v) => setFormData({ ...formData, period: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Profit %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.profit_percentage}
                    onChange={(e) => setFormData({ ...formData, profit_percentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total Trades</Label>
                  <Input
                    type="number"
                    value={formData.total_trades}
                    onChange={(e) => setFormData({ ...formData, total_trades: parseInt(e.target.value) || 0 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Winning Trades</Label>
                  <Input
                    type="number"
                    value={formData.winning_trades}
                    onChange={(e) => setFormData({ ...formData, winning_trades: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_published}
                  onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                />
                <Label>Published (visible to users)</Label>
              </div>
              
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Performance Entry
              </Button>
            </form>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !performanceData || performanceData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No performance data yet</p>
          ) : (
            <div className="space-y-3">
              {performanceData.map((entry) => (
                <Card key={entry.id} className="border-border/50">
                  <CardContent className="p-4">
                    {editingId === entry.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={formData.profit_percentage}
                            onChange={(e) => setFormData({ ...formData, profit_percentage: parseFloat(e.target.value) || 0 })}
                            placeholder="Profit %"
                          />
                          <Input
                            type="number"
                            value={formData.total_trades}
                            onChange={(e) => setFormData({ ...formData, total_trades: parseInt(e.target.value) || 0 })}
                            placeholder="Total trades"
                          />
                          <Input
                            type="number"
                            value={formData.winning_trades}
                            onChange={(e) => setFormData({ ...formData, winning_trades: parseInt(e.target.value) || 0 })}
                            placeholder="Winning trades"
                          />
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={formData.is_published}
                              onCheckedChange={(v) => setFormData({ ...formData, is_published: v })}
                            />
                            <span className="text-sm">Published</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{format(new Date(entry.date), 'PP')}</span>
                              <Badge variant="outline" className="capitalize">{entry.period}</Badge>
                              {!entry.is_published && (
                                <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">Draft</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {entry.winning_trades}/{entry.total_trades} trades
                              {entry.notes && ` • ${entry.notes}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="flex items-center gap-1 text-emerald-500 font-semibold">
                              <TrendingUp className="h-4 w-4" />
                              +{entry.profit_percentage}%
                            </div>
                          </div>
                          
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => startEdit(entry)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteMutation.mutate(entry.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceManagement;
