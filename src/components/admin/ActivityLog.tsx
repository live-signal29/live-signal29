import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ActivityLog {
  id: string;
  admin_email: string;
  action_type: string;
  target_user_email: string | null;
  details: any;
  created_at: string;
}

const ActivityLog = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      toast.error("Failed to load activity logs");
    } finally {
      setLoading(false);
    }
  };

  const formatDetails = (details: any) => {
    if (!details) return "-";
    
    const parts = [];
    if (details.old_status) parts.push(`Status: ${details.old_status} → ${details.new_status}`);
    if (details.plan) parts.push(`Plan: ${details.plan}`);
    if (details.end_date) parts.push(`End: ${new Date(details.end_date).toLocaleDateString()}`);
    if (details.user_count) parts.push(`Users: ${details.user_count}`);
    
    return parts.length > 0 ? parts.join(', ') : "-";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Admin Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target User</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No activity logs yet
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.admin_email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 rounded text-xs font-semibold bg-primary/20 text-primary capitalize">
                        {log.action_type.replace(/_/g, ' ')}
                      </span>
                    </TableCell>
                    <TableCell>{log.target_user_email || "-"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDetails(log.details)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;