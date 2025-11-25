import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Loader2, TrendingUp, Users, Eye, Activity } from "lucide-react";
import { toast } from "sonner";

interface UserActivity {
  user_id: string;
  email: string;
  full_name: string;
  total_logins: number;
  last_login: string;
  total_signal_views: number;
  favorite_category?: string;
}

interface LoginHistory {
  id: string;
  login_at: string;
  ip_address?: string;
  device_type?: string;
  browser?: string;
  user_email: string;
}

interface SignalView {
  id: string;
  viewed_at: string;
  signal_pair: string;
  signal_type: string;
  user_email: string;
}

const UserActivityDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [signalViews, setSignalViews] = useState<SignalView[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeToday: 0,
    totalSignalViews: 0,
    avgViewsPerUser: 0
  });

  useEffect(() => {
    fetchActivityData();
  }, []);

  const fetchActivityData = async () => {
    setLoading(true);
    try {
      // Fetch user activity summary
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      if (profilesError) throw profilesError;

      // Fetch login history
      const { data: logins, error: loginsError } = await supabase
        .from('user_login_history')
        .select('*')
        .order('login_at', { ascending: false })
        .limit(100);

      if (loginsError) throw loginsError;

      // Fetch signal views
      const { data: views, error: viewsError } = await supabase
        .from('user_signal_views')
        .select(`
          *,
          signals (pair, type)
        `)
        .order('viewed_at', { ascending: false })
        .limit(100);

      if (viewsError) throw viewsError;

      // Process user activities
      const activities: UserActivity[] = (profiles || []).map(profile => {
        const userLogins = (logins || []).filter(l => l.user_id === profile.id);
        const userViews = (views || []).filter(v => v.user_id === profile.id);
        
        return {
          user_id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          total_logins: userLogins.length,
          last_login: userLogins[0]?.login_at || 'Never',
          total_signal_views: userViews.length,
        };
      }).sort((a, b) => b.total_logins - a.total_logins);

      // Process login history with email
      const loginsWithEmail = (logins || []).map(login => ({
        ...login,
        user_email: profiles?.find(p => p.id === login.user_id)?.email || 'Unknown'
      }));

      // Process signal views with email and signal details
      const viewsWithDetails = (views || []).map((view: any) => ({
        id: view.id,
        viewed_at: view.viewed_at,
        signal_pair: view.signals?.pair || 'Unknown',
        signal_type: view.signals?.type || 'Unknown',
        user_email: profiles?.find(p => p.id === view.user_id)?.email || 'Unknown'
      }));

      // Calculate stats
      const today = new Date().toDateString();
      const activeToday = new Set(
        (logins || [])
          .filter(l => new Date(l.login_at).toDateString() === today)
          .map(l => l.user_id)
      ).size;

      setUserActivities(activities);
      setLoginHistory(loginsWithEmail);
      setSignalViews(viewsWithDetails);
      setStats({
        totalUsers: profiles?.length || 0,
        activeToday,
        totalSignalViews: views?.length || 0,
        avgViewsPerUser: profiles?.length ? Math.round(((views?.length || 0) / profiles.length) * 10) / 10 : 0
      });

    } catch (error: any) {
      console.error('Error fetching activity data:', error);
      toast.error('Failed to load activity data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Today</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.activeToday}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signal Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSignalViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Views/User</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgViewsPerUser}</div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tables */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">User Overview</TabsTrigger>
          <TabsTrigger value="logins">Login History</TabsTrigger>
          <TabsTrigger value="views">Signal Views</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Total Logins</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Signal Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userActivities.map((activity) => (
                    <TableRow key={activity.user_id}>
                      <TableCell className="font-medium">{activity.email}</TableCell>
                      <TableCell>{activity.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{activity.total_logins}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {activity.last_login !== 'Never' 
                          ? format(new Date(activity.last_login), 'MMM dd, yyyy hh:mm a')
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-primary/10 text-primary">
                          {activity.total_signal_views}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Login History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginHistory.map((login) => (
                    <TableRow key={login.id}>
                      <TableCell className="text-sm">
                        {format(new Date(login.login_at), 'MMM dd, yyyy hh:mm a')}
                      </TableCell>
                      <TableCell className="font-medium">{login.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{login.device_type || 'Unknown'}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {login.browser || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {login.ip_address || 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Signal Views</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User Email</TableHead>
                    <TableHead>Signal</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signalViews.map((view) => (
                    <TableRow key={view.id}>
                      <TableCell className="text-sm">
                        {format(new Date(view.viewed_at), 'MMM dd, yyyy hh:mm a')}
                      </TableCell>
                      <TableCell className="font-medium">{view.user_email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{view.signal_pair}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={view.signal_type === 'Buy' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                          {view.signal_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserActivityDashboard;
