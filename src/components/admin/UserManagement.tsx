import { useEffect, useRef, useState } from "react";
import { Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Edit, CheckSquare, Trash2 } from "lucide-react";
import UserStatsCards, { STAT_LABELS } from "./UserStatsCards";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

const UserManagement = ({ initialSearch }: { initialSearch?: string } = {}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statFilter, setStatFilter] = useState<string | null>(null);
  const [statIds, setStatIds] = useState<Set<string> | null>(null);
  const [statLoading, setStatLoading] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewingUserSubs, setViewingUserSubs] = useState<string | null>(null);
  const [newPlan, setNewPlan] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkPlan, setBulkPlan] = useState("");
  const [bulkEndDate, setBulkEndDate] = useState("");

  // Telegram messaging state
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramMessage, setTelegramMessage] = useState("");
  const [sendingTelegram, setSendingTelegram] = useState(false);

  // Telegram contact map
  const [telegramByUser, setTelegramByUser] = useState<Record<string, { username: string | null; first_name: string | null }>>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (initialSearch) setSearchTerm(initialSearch);
  }, [initialSearch]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);

      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      const { data: tgRows } = await supabase
        .from('user_telegram' as any)
        .select('user_id, username, first_name');
      const tgMap: Record<string, { username: string | null; first_name: string | null }> = {};
      for (const r of (tgRows as any[]) || []) tgMap[r.user_id] = { username: r.username, first_name: r.first_name };
      setTelegramByUser(tgMap);
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

  // Filtered users logic
  const filteredUsers = users.filter((u) => {
    if (statIds && !statIds.has(u.id)) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const tgName = (telegramByUser[u.id]?.username || "").toLowerCase();
    return (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q) || tgName.includes(q.replace(/^@/, ""));
  });

  // FIX 1: Select All sirf abhi screen par dikhne waale (Filtered) users ko select karega
  const toggleSelectAll = () => {
    const filteredIds = filteredUsers.map(u => u.id);
    const isAllFilteredSelected = filteredIds.every(id => selectedUsers.includes(id));

    if (isAllFilteredSelected) {
      // Unselect only filtered users
      setSelectedUsers(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      // Select filtered users along with existing selection
      setSelectedUsers(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // FIX 2: Telegram Message Sending Logic
  const handleSendTelegramBulk = async () => {
    if (!telegramMessage.trim()) {
      toast.error("Kripya message likhein");
      return;
    }

    // Sirf unhi selected users ko filter karein jinka telegram username maujood hai
    const targetTelegramUsers = selectedUsers
      .map(id => ({ userId: id, tg: telegramByUser[id] }))
      .filter(item => item.tg && item.tg.username);

    if (targetTelegramUsers.length === 0) {
      toast.error("Selected users me se kisi ka Telegram username nahi milaa!");
      return;
    }

    setSendingTelegram(true);
    try {
      // Edge Function call (ya aapke telegram broadcast API endpoint par)
      const { data, error } = await supabase.functions.invoke('send-telegram-bulk', {
        body: {
          users: targetTelegramUsers.map(u => ({
            user_id: u.userId,
            username: u.tg.username
          })),
          message: telegramMessage
        }
      });

      if (error) throw error;

      toast.success(`${targetTelegramUsers.length} Telegram user(s) ko message bhej diya gaya!`);
      setTelegramDialogOpen(false);
      setTelegramMessage("");
    } catch (err: any) {
      console.error("Telegram send error:", err);
      toast.error("Message bhejne me dikkat aayi: " + (err.message || "Unknown error"));
    } finally {
      setSendingTelegram(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }

    if (!bulkAction) {
      toast.error("Please select an action");
      return;
    }

    try {
      const updates: any = {};
      
      if (bulkAction === 'activate_premium') {
        updates.subscription_status = 'premium';
        updates.subscription_start_date = new Date().toISOString();
        if (bulkPlan) updates.subscription_plan = bulkPlan;
        if (bulkEndDate) updates.subscription_end_date = bulkEndDate;
      } else if (bulkAction === 'deactivate') {
        updates.subscription_status = 'expired';
      } else if (bulkAction === 'extend_trial') {
        updates.subscription_status = 'free_trial';
        if (bulkEndDate) updates.trial_end_date = bulkEndDate;
      } else if (bulkAction === 'extend_premium') {
        if (bulkEndDate) updates.subscription_end_date = bulkEndDate;
      }

      for (const userId of selectedUsers) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) throw error;
      }

      toast.success(`Successfully updated ${selectedUsers.length} user(s)`);
      setSelectedUsers([]);
      setBulkActionDialogOpen(false);
      setBulkAction("");
      setBulkPlan("");
      setBulkEndDate("");
      fetchUsers();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const telegramSelectedCount = selectedUsers.filter(id => telegramByUser[id]?.username).length;

  return (
    <div className="space-y-6">
      <UserStatsCards selected={statFilter} onSelect={setStatFilter} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>User Management</CardTitle>
            
            {selectedUsers.length > 0 && (
              <div className="flex gap-2">
                {/* Bulk Action Dialog */}
                <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm">
                      <CheckSquare className="h-4 w-4 mr-2" />
                      Bulk Edit ({selectedUsers.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Bulk Update {selectedUsers.length} User(s)</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Action</Label>
                        <Select value={bulkAction} onValueChange={setBulkAction}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activate_premium">Activate Premium</SelectItem>
                            <SelectItem value="deactivate">Deactivate (Expire)</SelectItem>
                            <SelectItem value="extend_trial">Extend Trial</SelectItem>
                            <SelectItem value="extend_premium">Extend Premium</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {bulkAction === 'activate_premium' && (
                        <div className="space-y-2">
                          <Label>Plan Type</Label>
                          <Select value={bulkPlan} onValueChange={setBulkPlan}>
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
                      )}

                      <Button onClick={handleBulkAction} className="w-full">
                        Apply to {selectedUsers.length} User(s)
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Bulk Telegram Message Dialog */}
                <Dialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Send className="h-4 w-4 mr-2" />
                      Telegram Msg ({telegramSelectedCount})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send Telegram Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <p className="text-xs text-muted-foreground">
                        Selected {selectedUsers.length} users me se {telegramSelectedCount} users ke paas valid Telegram Username hai.
                      </p>
                      <div className="space-y-2">
                        <Label>Message Text</Label>
                        <Textarea
                          rows={4}
                          placeholder="Type your broadcast message here..."
                          value={telegramMessage}
                          onChange={(e) => setTelegramMessage(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSendTelegramBulk} disabled={sendingTelegram || telegramSelectedCount === 0} className="w-full">
                        {sendingTelegram ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                        Send to {telegramSelectedCount} Users
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>

          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by email or name..."
              className="pl-8 max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={
                        filteredUsers.length > 0 && 
                        filteredUsers.every(u => selectedUsers.includes(u.id))
                      }
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>{user.full_name}</TableCell>
                    <TableCell>
                      {telegramByUser[user.id]?.username ? (
                        <a href={`https://t.me/${telegramByUser[user.id].username}`} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline">
                          @{telegramByUser[user.id].username}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{user.subscription_status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
