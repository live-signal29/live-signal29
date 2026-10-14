import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Edit, CheckSquare, Trash2 } from "lucide-react";
import UserStatsCards, { STAT_LABELS } from "./UserStatsCards";
import TelegramBroadcastDialog from "./TelegramBroadcastDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const LIFETIME_END_DATE = "2099-12-31T23:59:59.000Z";

// Plan values are stored in profiles.subscription_plan as "premium-<id>" (same as payments / Play Billing).
const PLAN_OPTIONS: { value: string; label: string; months: number; days?: number }[] = [
  { value: "premium-weekly", label: "Weekly", months: 0, days: 7 },
  { value: "premium-monthly", label: "Monthly", months: 1 },
  { value: "premium-quarterly", label: "Quarterly", months: 3 },
  { value: "premium-half-yearly", label: "Half-Yearly", months: 6 },
  { value: "premium-yearly", label: "Yearly", months: 12 },
  { value: "premium-lifetime", label: "Lifetime", months: 0 },
];

// older admin edits saved plain "monthly" etc. -> show them as the matching "premium-..." option
const normalizePlan = (plan: string | null) => {
  if (!plan) return "";
  if (PLAN_OPTIONS.some((o) => o.value === plan)) return plan;
  const prefixed = `premium-${plan}`;
  return PLAN_OPTIONS.some((o) => o.value === prefixed) ? prefixed : plan;
};

// "2026-11-14" from a date input -> end of that day (local time) as an ISO string
const endOfDayIso = (d: string) => new Date(`${d}T23:59:59`).toISOString();

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
  const [bulkBusy, setBulkBusy] = useState(false);
  // Telegram contact of each user (connected via "Continue with Telegram" / "Connect Telegram")
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

      // Fetch all subscriptions
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      // Telegram contacts (best-effort: the list still works without them)
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

  const logAdminAction = async (actionType: string, targetUserId: string | null, targetUserEmail: string | null, details: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('admin_activity_log')
        .insert({
          admin_id: user.id,
          admin_email: user.email || '',
          action_type: actionType,
          target_user_id: targetUserId,
          target_user_email: targetUserEmail,
          details: details
        } as any);
    } catch (error) {
      console.error("Error logging admin action:", error);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const status = newStatus || editingUser.subscription_status;
      const plan = newPlan || editingUser.subscription_plan;
      const updates: any = {
        subscription_status: status,
        subscription_plan: plan,
      };

      if (status === 'premium' && plan === 'premium-lifetime') {
        updates.subscription_end_date = LIFETIME_END_DATE;
        if (editingUser.subscription_status !== 'premium') updates.subscription_start_date = new Date().toISOString();
      } else if (newEndDate) {
        if (status === 'premium') {
          updates.subscription_end_date = endOfDayIso(newEndDate);
          if (editingUser.subscription_status !== 'premium') updates.subscription_start_date = new Date().toISOString();
        } else {
          updates.trial_end_date = endOfDayIso(newEndDate);
        }
      }

      const { data: updated, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', editingUser.id)
        .select('id');

      if (error) throw error;
      if (!updated || updated.length === 0) throw new Error("No permission to update this user");

      // Log the action
      await logAdminAction(
        'user_update',
        editingUser.id,
        editingUser.email,
        {
          old_status: editingUser.subscription_status,
          new_status: status,
          plan: plan,
          end_date: newEndDate
        }
      );

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
    setNewPlan(normalizePlan(user.subscription_plan));
    setNewEndDate("");
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // "Select all" applies only to the users currently shown in the table
  // (the tapped stat box, the search filter...), never to every user.
  const toggleSelectAll = () => {
    const shownIds = filteredUsers.map(u => u.id);
    const allShownSelected = shownIds.length > 0 && shownIds.every(id => selectedUsers.includes(id));
    if (allShownSelected) {
      setSelectedUsers(prev => prev.filter(id => !shownIds.includes(id)));
    } else {
      setSelectedUsers(prev => Array.from(new Set([...prev, ...shownIds])));
    }
  };

  const handleBulkAction = async () => {
    if (bulkBusy) return;

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user");
      return;
    }
    if (!bulkAction) {
      toast.error("Please select an action");
      return;
    }
    if (bulkAction === 'activate_premium' && !bulkPlan) {
      toast.error("Please select a plan");
      return;
    }
    if ((bulkAction === 'extend_premium' || bulkAction === 'extend_trial') && !bulkEndDate) {
      toast.error("Please choose an end date");
      return;
    }

    setBulkBusy(true);
    try {
      const byId = new Map(users.map((u) => [u.id, u]));
      const now = new Date();
      const nowIso = now.toISOString();
      const planInfo = PLAN_OPTIONS.find((o) => o.value === bulkPlan);
      const jobs: { id: string; updates: Record<string, unknown> }[] = [];
      let skipped = 0;

      for (const id of selectedUsers) {
        const u = byId.get(id);
        if (!u) { skipped++; continue; }

        const isPremium = u.subscription_status === 'premium';
        const isLifetime = u.subscription_plan === 'premium-lifetime';
        const currentEnd = u.subscription_end_date ? new Date(u.subscription_end_date) : null;

        if (bulkAction === 'activate_premium') {
          // never downgrade someone who already has Lifetime
          if (isPremium && isLifetime) { skipped++; continue; }

          let end: string;
          if (bulkPlan === 'premium-lifetime') {
            end = LIFETIME_END_DATE;
          } else if (bulkEndDate) {
            end = endOfDayIso(bulkEndDate);
          } else {
            // no date given: plan length, counted from the current end date if still premium, else from today
            const base = isPremium && currentEnd && currentEnd > now ? currentEnd : now;
            const d = new Date(base);
            if (planInfo?.days) d.setDate(d.getDate() + planInfo.days);
            else d.setMonth(d.getMonth() + (planInfo?.months || 1));
            end = d.toISOString();
          }

          const updates: Record<string, unknown> = {
            subscription_status: 'premium',
            subscription_plan: bulkPlan,
            subscription_end_date: end,
          };
          if (!isPremium) updates.subscription_start_date = nowIso;
          jobs.push({ id, updates });
        } else if (bulkAction === 'deactivate') {
          jobs.push({ id, updates: { subscription_status: 'expired' } });
        } else if (bulkAction === 'extend_trial') {
          // trial extension is only for non-premium users (it would otherwise cancel their premium)
          if (isPremium) { skipped++; continue; }
          jobs.push({
            id,
            updates: { subscription_status: 'free_trial', trial_end_date: endOfDayIso(bulkEndDate) },
          });
        } else if (bulkAction === 'extend_premium') {
          if (!isPremium || isLifetime) { skipped++; continue; }
          jobs.push({ id, updates: { subscription_end_date: endOfDayIso(bulkEndDate) } });
        }
      }

      if (jobs.length === 0) {
        toast.error(
          skipped
            ? `Nothing to update: ${skipped} selected user(s) do not fit this action.`
            : "Nothing to update."
        );
        return;
      }

      // update in small parallel batches; every row is checked so a blocked / failed update is never reported as success
      const failedIds: string[] = [];
      let okCount = 0;
      for (let i = 0; i < jobs.length; i += 10) {
        const results = await Promise.all(
          jobs.slice(i, i + 10).map(async (j) => {
            const { data, error } = await supabase
              .from('profiles')
              .update(j.updates as any)
              .eq('id', j.id)
              .select('id');
            if (error) console.error("Bulk update failed for", j.id, error);
            return { id: j.id, ok: !error && !!data && data.length > 0 };
          })
        );
        for (const r of results) {
          if (r.ok) okCount++;
          else failedIds.push(r.id);
        }
      }

      if (okCount > 0) {
        await logAdminAction(
          `bulk_${bulkAction}`,
          null,
          null,
          {
            user_count: okCount,
            failed_count: failedIds.length,
            skipped_count: skipped,
            action: bulkAction,
            plan: bulkPlan,
            end_date: bulkEndDate
          }
        );
      }

      if (okCount > 0) {
        toast.success(
          `Updated ${okCount} user(s)` + (skipped ? ` • ${skipped} skipped` : "")
        );
      }
      if (failedIds.length > 0) {
        toast.error(`${failedIds.length} user(s) could not be updated. They stay selected, try again.`);
      }

      if (failedIds.length === 0) {
        setSelectedUsers([]);
        setBulkActionDialogOpen(false);
        setBulkAction("");
        setBulkPlan("");
        setBulkEndDate("");
      } else {
        setSelectedUsers(failedIds);
      }
      fetchUsers();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error("Failed to perform bulk action");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    try {
      // Server-side deletion: removes auth user, revokes sessions, and deletes related data
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { userId: user.id },
      });

      if (error) {
        throw new Error(error.message);
      }

      if ((data as any)?.error) {
        throw new Error((data as any).error);
      }

      // Log the admin action
      await logAdminAction(
        'user_delete',
        user.id,
        user.email,
        { deleted_user: user.email, deleted_at: new Date().toISOString() }
      );

      toast.success(`User ${user.email} deleted successfully`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(`Failed to delete user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleStatSelect = async (key: string) => {
    // Tap the same box again to clear the filter
    if (statFilter === key) {
      setStatFilter(null);
      setStatIds(null);
      return;
    }

    setStatFilter(key);
    setStatLoading(true);

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      const { data, error } = await (supabase as any).rpc("admin_user_stat_ids", {
        _kind: key,
        _tz: tz,
      });
      if (error) throw error;

      const ids = new Set<string>(
        (data || []).map((row: any) => (typeof row === "string" ? row : Object.values(row)[0] as string))
      );
      setStatIds(ids);
      setSearchTerm("");
      setTimeout(
        () => listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
        100
      );
    } catch (e: any) {
      console.error("admin_user_stat_ids failed:", e);
      toast.error("Could not load these users. Please try again.");
      setStatFilter(null);
      setStatIds(null);
    } finally {
      setStatLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statIds && !statIds.has(u.id)) return false;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;
    const tgName = (telegramByUser[u.id]?.username || "").toLowerCase();
    return (u.email || "").toLowerCase().includes(q) || (u.full_name || "").toLowerCase().includes(q) || tgName.includes(q.replace(/^@/, ""));
  });

  // Drop selected users that are no longer shown (when another stat box / search is applied)
  const shownKey = filteredUsers.map(u => u.id).join(",");
  useEffect(() => {
    const shown = new Set(shownKey ? shownKey.split(",") : []);
    setSelectedUsers(prev => (prev.every(id => shown.has(id)) ? prev : prev.filter(id => shown.has(id))));
  }, [shownKey]);

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
      <UserStatsCards selected={statFilter} onSelect={handleStatSelect} />

      <div ref={listRef} />
      {statFilter && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
          <span className="font-semibold">
            {STAT_LABELS[statFilter] || statFilter}:{" "}
            {statLoading ? "loading…" : `${filteredUsers.length} users`}
          </span>
          <button
            type="button"
            className="text-xs font-semibold text-emerald-700 underline"
            onClick={() => {
              setStatFilter(null);
              setStatIds(null);
            }}
          >
            Clear filter
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>User Management</CardTitle>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
              <TelegramBroadcastDialog
                userIds={selectedUsers}
                connectedIds={new Set(Object.keys(telegramByUser))}
                onDone={() => setSelectedUsers([])}
              />
              <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm">
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Bulk Actions ({selectedUsers.length})
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
                            {PLAN_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {(bulkAction === 'activate_premium' || bulkAction === 'extend_premium' || bulkAction === 'extend_trial') &&
                      !(bulkAction === 'activate_premium' && bulkPlan === 'premium-lifetime') && (
                      <div className="space-y-2">
                        <Label>
                          {bulkAction === 'extend_trial' ? 'Trial End Date' : 'Premium End Date'}
                        </Label>
                        <Input
                          type="date"
                          value={bulkEndDate}
                          onChange={(e) => setBulkEndDate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                          {bulkAction === 'activate_premium'
                            ? 'Leave empty to use the plan length (added to the current end date if the user is still premium).'
                            : bulkAction === 'extend_trial'
                            ? 'Applies to non-premium users only.'
                            : 'Applies to premium users only (Lifetime users are skipped).'}
                        </p>
                      </div>
                    )}

                    <Button onClick={handleBulkAction} className="w-full" disabled={bulkBusy}>
                      {bulkBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {bulkBusy ? "Applying..." : `Apply to ${selectedUsers.length} User(s)`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              </div>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing {filteredUsers.length} user(s) • {selectedUsers.length} selected
          </p>
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
                      checked={filteredUsers.length > 0 && filteredUsers.every(u => selectedUsers.includes(u.id))}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Telegram</TableHead>
                  <TableHead>Plan Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trial Remaining</TableHead>
                  <TableHead>Premium Expires</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const userSubs = getUserSubscriptions(user.id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox 
                          checked={selectedUsers.includes(user.id)}
                          onCheckedChange={() => toggleUserSelection(user.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.email}
                      </TableCell>
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>
                        {telegramByUser[user.id] ? (
                          telegramByUser[user.id].username ? (
                            <a
                              href={`https://t.me/${telegramByUser[user.id].username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-600 hover:underline"
                            >
                              @{telegramByUser[user.id].username}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">Connected (no username)</span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
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
                      <TableCell>
                        {/* "Trial Remaining" only means something for a free-trial
                           user. A premium user's plan length lives in "Premium
                           Expires" — trial_end_date is a leftover field from
                           their original free trial and is unrelated to any
                           plan they later bought, so don't show it here once
                           they're premium (it was confusingly showing e.g.
                           "31 days" for every paid plan, regardless of
                           monthly/quarterly/yearly/lifetime). */}
                        {user.subscription_status === 'premium'
                          ? '—'
                          : calculateDaysRemaining(user.trial_end_date)}
                      </TableCell>
                      <TableCell>
                        {user.subscription_plan === 'premium-lifetime'
                          ? 'Never (Lifetime)'
                          : user.subscription_end_date
                          ? new Date(user.subscription_end_date).toLocaleString()
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
                                      {PLAN_OPTIONS.map((o) => (
                                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                      ))}
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

                          {/* Delete User Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="destructive" 
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete <strong>{user.email}</strong>? 
                                  This action cannot be undone and will remove all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDeleteUser(user)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete User
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
