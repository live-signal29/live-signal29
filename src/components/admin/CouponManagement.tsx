import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, Plus, Edit } from "lucide-react";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";

const CouponManagement = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [formData, setFormData] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    expiry_date: "",
    usage_limit: "",
    applicable_plans: [] as string[],
    is_active: true,
  });

  const plans = ["Monthly", "Quarterly", "Half-Yearly", "Yearly"];

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: couponUsage } = useQuery({
    queryKey: ["coupon-usage"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupon_usage")
        .select("*, coupons(code)")
        .order("used_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.code || !formData.discount_value) {
      toast.error("Please fill in all required fields");
      return;
    }

    const couponData = {
      code: formData.code.toUpperCase(),
      discount_type: formData.discount_type,
      discount_value: parseFloat(formData.discount_value),
      expiry_date: formData.expiry_date || null,
      usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
      applicable_plans: formData.applicable_plans.length > 0 ? formData.applicable_plans : null,
      is_active: formData.is_active,
    };

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from("coupons")
          .update(couponData)
          .eq("id", editingCoupon.id);
        if (error) throw error;
        toast.success("Coupon updated successfully");
      } else {
        const { error } = await supabase.from("coupons").insert([couponData]);
        if (error) throw error;
        toast.success("Coupon created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Failed to save coupon");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
      toast.success("Coupon deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete coupon");
    }
  };

  const handleEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value.toString(),
      expiry_date: coupon.expiry_date ? format(new Date(coupon.expiry_date), "yyyy-MM-dd") : "",
      usage_limit: coupon.usage_limit?.toString() || "",
      applicable_plans: coupon.applicable_plans || [],
      is_active: coupon.is_active,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      discount_type: "percentage",
      discount_value: "",
      expiry_date: "",
      usage_limit: "",
      applicable_plans: [],
      is_active: true,
    });
    setEditingCoupon(null);
    setShowForm(false);
  };

  const togglePlan = (plan: string) => {
    setFormData((prev) => ({
      ...prev,
      applicable_plans: prev.applicable_plans.includes(plan)
        ? prev.applicable_plans.filter((p) => p !== plan)
        : [...prev.applicable_plans, plan],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Coupon Management</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : <><Plus className="h-4 w-4 mr-2" /> Add Coupon</>}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Coupon Code *</Label>
                  <Input
                    placeholder="NEWYEAR2025"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                  />
                </div>
                <div>
                  <Label>Discount Type *</Label>
                  <Select value={formData.discount_type} onValueChange={(value) => setFormData({ ...formData, discount_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Discount Value *</Label>
                  <Input
                    type="number"
                    placeholder={formData.discount_type === "percentage" ? "20" : "10"}
                    value={formData.discount_value}
                    onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Usage Limit</Label>
                  <Input
                    type="number"
                    placeholder="Leave empty for unlimited"
                    value={formData.usage_limit}
                    onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                    min="1"
                  />
                </div>
              </div>

              <div>
                <Label>Applicable Plans (leave empty for all)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {plans.map((plan) => (
                    <div key={plan} className="flex items-center space-x-2">
                      <Checkbox
                        id={plan}
                        checked={formData.applicable_plans.includes(plan)}
                        onCheckedChange={() => togglePlan(plan)}
                      />
                      <label htmlFor={plan} className="text-sm cursor-pointer">
                        {plan}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                />
                <label htmlFor="is_active" className="text-sm cursor-pointer">
                  Active
                </label>
              </div>

              <Button type="submit" className="w-full">
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Existing Coupons</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Plans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons?.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                    <TableCell>
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `$${coupon.discount_value}`}
                    </TableCell>
                    <TableCell>
                      {coupon.expiry_date ? format(new Date(coupon.expiry_date), "MMM dd, yyyy") : "No expiry"}
                    </TableCell>
                    <TableCell>
                      {coupon.usage_count} / {coupon.usage_limit || "∞"}
                    </TableCell>
                    <TableCell>
                      {coupon.applicable_plans && coupon.applicable_plans.length > 0
                        ? coupon.applicable_plans.join(", ")
                        : "All"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active ? "default" : "secondary"}>
                        {coupon.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(coupon)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(coupon.id)}>
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

      <Card>
        <CardHeader>
          <CardTitle>Coupon Usage History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Discount Applied</TableHead>
                <TableHead>Used At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponUsage?.map((usage) => (
                <TableRow key={usage.id}>
                  <TableCell className="font-mono">{usage.coupons?.code}</TableCell>
                  <TableCell className="text-xs">{usage.user_id}</TableCell>
                  <TableCell className="text-success font-semibold">${usage.discount_applied}</TableCell>
                  <TableCell>{format(new Date(usage.used_at), "MMM dd, yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CouponManagement;
