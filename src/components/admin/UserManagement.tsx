import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Edit } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  subscription_status: string;
  subscription_plan: string | null;
  trial_end_date: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: string;
  category: string;
  amount: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingUserSubs, setViewingUserSubs] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newEndDate, setNewEndDate] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);

      // Fetch all subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const calculateDaysRemaining = (endDate: string | null) => {
    if (!endDate) return "-";
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? `${diffDays} days` : "Expired";
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const updates: any = {
        subscription_status: newStatus || editingUser.subscription_status,
        subscription_plan: newPlan || editingUser.subscription_plan,
      };

      if (newEndDate) {
        if (newStatus === 'premium') {
          updates.subscription_end_date = newEndDate;
          updates.subscription_start_date = new Date().toISOString();
        } else {
          updates.trial_end_date = newEndDate;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success("User updated successfully");
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user");
    }
  };

  const openEditDialog = (user: UserProfile) => {
    setEditingUser(user);
    setNewStatus(user.subscription_status);
    setNewPlan(user.subscription_plan || "");
    setNewEndDate("");
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const getUserSubscriptions = (userId: string) => {
    return subscriptions.filter(sub => sub.user_id === userId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Remaining</TableHead>
                  <TableHead>Premium Expires</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const userSubs = getUserSubscriptions(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.email}</TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.subscription_plan ? 'bg-primary/20 text-primary' : 'bg-muted'
                        }`}>
                          {user.subscription_plan || 'Free Trial'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.subscription_status === 'premium' 
                            ? 'bg-success/20 text-success' 
                            : user.subscription_status === 'free_trial'
                            ? 'bg-warning/20 text-warning'
                            : 'bg-destructive/20 text-destructive'
                        }`}>
                          {user.subscription_status}
                        </span>
                      </TableCell>
                      <TableCell>{calculateDaysRemaining(user.trial_end_date)}</TableCell>
                      <TableCell>
                        {user.subscription_end_date 
                          ? new Date(user.subscription_end_date).toLocaleDateString() 
                          : "-"}
                      </TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openEditDialog(user)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit User: {user.email}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Subscription Status</Label>
                                  <Select value={newStatus} onValueChange={setNewStatus}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="free_trial">Free Trial</SelectItem>
                                      <SelectItem value="premium">Premium</SelectItem>
                                      <SelectItem value="expired">Expired</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Subscription Plan</Label>
                                  <Select value={newPlan} onValueChange={setNewPlan}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="monthly">Monthly</SelectItem>
                                      <SelectItem value="quarterly">Quarterly</SelectItem>
                                      <SelectItem value="half-yearly">Half-Yearly</SelectItem>
                                      <SelectItem value="yearly">Yearly</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>
                                    {newStatus === 'premium' ? 'Premium End Date' : 'Trial End Date'}
                                  </Label>
                                  <Input
                                    type="date"
                                    value={newEndDate}
                                    onChange={(e) => setNewEndDate(e.target.value)}
                                  />
                                </div>

                                <Button onClick={handleUpdateUser} className="w-full">
                                  Update User
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {userSubs.length > 0 && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setViewingUserSubs(user.id)}
                                >
                                  View Purchases ({userSubs.length})
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl">
                                <DialogHeader>
                                  <DialogTitle>Purchase History - {user.email}</DialogTitle>
                                </DialogHeader>
                                <div className="max-h-96 overflow-y-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Plan</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>End Date</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {userSubs.map((sub) => (
                                        <TableRow key={sub.id}>
                                          <TableCell className="font-medium capitalize">{sub.plan_type}</TableCell>
                                          <TableCell className="uppercase">{sub.category}</TableCell>
                                          <TableCell>${sub.amount}</TableCell>
                                          <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                              sub.status === 'active' 
                                                ? 'bg-success/20 text-success' 
                                                : sub.status === 'pending'
                                                ? 'bg-warning/20 text-warning'
                                                : 'bg-muted'
                                            }`}>
                                              {sub.status}
                                            </span>
                                          </TableCell>
                                          <TableCell>{new Date(sub.start_date).toLocaleDateString()}</TableCell>
                                          <TableCell>{new Date(sub.end_date).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
