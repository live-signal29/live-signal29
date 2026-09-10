import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Edit, Clock } from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

const SpecialOfferManagement = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    end_date: "",
    is_active: false,
  });

  const { data: offers, isLoading } = useQuery({
    queryKey: ["special-offers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.end_date) {
      toast.error("Please fill in all required fields");
      return;
    }

    const offerData = {
      title: formData.title,
      description: formData.description || null,
      end_date: new Date(formData.end_date).toISOString(),
      is_active: formData.is_active,
    };

    try {
      if (editingOffer) {
        const { error } = await supabase
          .from("special_offers")
          .update(offerData)
          .eq("id", editingOffer.id);
        if (error) throw error;
        toast.success("Special offer updated successfully");
      } else {
        const { error } = await supabase.from("special_offers").insert([offerData]);
        if (error) throw error;
        toast.success("Special offer created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["special-offers"] });
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save special offer");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this special offer?")) return;

    try {
      const { error } = await supabase.from("special_offers").delete().eq("id", id);
      if (error) throw error;
      toast.success("Special offer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["special-offers"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete special offer");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      // Multiple offers can be active and slide together in the
      // carousel — no longer force-deactivating the others.
      const { error } = await supabase
        .from("special_offers")
        .update({ is_active: !currentStatus })
        .eq("id", id);
      if (error) throw error;

      toast.success(currentStatus ? "Special offer deactivated" : "Special offer activated");
      queryClient.invalidateQueries({ queryKey: ["special-offers"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to toggle special offer");
    }
  };

  const handleEdit = (offer: any) => {
    setEditingOffer(offer);
    setFormData({
      title: offer.title,
      description: offer.description || "",
      end_date: format(new Date(offer.end_date), "yyyy-MM-dd'T'HH:mm"),
      is_active: offer.is_active,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      end_date: "",
      is_active: false,
    });
    setEditingOffer(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Special Offer Countdown</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-2" /> Add Offer</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingOffer ? "Edit Special Offer" : "Create New Special Offer"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Offer Title *</Label>
                <Input
                  placeholder="Happy New Year ðŸŽŠ Special Offer"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Limited time offer - Ends soon!"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label>End Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <label htmlFor="is_active" className="text-sm cursor-pointer">
                  Activate this offer (shows in the Premium page banner —
                  multiple active offers slide together)
                </label>
              </div>
              <Button type="submit" className="w-full">
                {editingOffer ? "Update Offer" : "Create Offer"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active & Past Offers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers?.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="font-semibold">{offer.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {offer.description || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(offer.end_date), "MMM dd, yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={offer.is_active}
                          onCheckedChange={() => handleToggleActive(offer.id, offer.is_active)}
                        />
                        <Badge variant={offer.is_active ? "default" : "secondary"}>
                          {offer.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(offer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(offer.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SpecialOfferManagement;
