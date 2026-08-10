import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

// LAZY LOADING FOR HEAVY TAB COMPONENTS (Loads only when tab is clicked)
const SignalForm = lazy(() => import("@/components/admin/SignalForm"));
const SignalsList = lazy(() => import("@/components/admin/SignalsList"));
const ChartAnalysisForm = lazy(() => import("@/components/admin/ChartAnalysisForm"));
const ChartAnalysisList = lazy(() => import("@/components/admin/ChartAnalysisList"));
const UserManagement = lazy(() => import("@/components/admin/UserManagement"));
const ActivityLog = lazy(() => import("@/components/admin/ActivityLog"));
const CouponManagement = lazy(() => import("@/components/admin/CouponManagement"));
const SpecialOfferManagement = lazy(() => import("@/components/admin/SpecialOfferManagement"));
const UserActivityDashboard = lazy(() => import("@/components/admin/UserActivityDashboard"));
const AccountApplications = lazy(() => import("@/components/admin/AccountApplications"));
const PerformanceManagement = lazy(() => import("@/components/admin/PerformanceManagement"));
const HeadlinesManagement = lazy(() => import("@/components/admin/HeadlinesManagement"));
const MT5ConnectionSettings = lazy(() => import("@/components/admin/MT5ConnectionSettings"));

// Tab Loading Fallback Component
const TabLoader = () => (
  <div className="flex h-32 w-full items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [showChartForm, setShowChartForm] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (mounted) navigate("/admin/login");
          return;
        }

        // Check if user has admin role
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();

        if (!roles) {
          toast.error("Access denied. Admin privileges required.");
          await supabase.auth.signOut();
          if (mounted) navigate("/admin/login");
          return;
        }

        if (mounted) {
          setUser(session.user);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/admin/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-8">
      <div className="container mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage signals and chart analysis</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="signals" className="w-full">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-11 h-auto">
            <TabsTrigger value="signals" className="text-xs sm:text-sm py-2">Signals</TabsTrigger>
            <TabsTrigger value="ideas" className="text-xs sm:text-sm py-2">Ideas</TabsTrigger>
            <TabsTrigger value="headlines" className="text-xs sm:text-sm py-2">Headlines</TabsTrigger>
            <TabsTrigger value="users" className="text-xs sm:text-sm py-2">Users</TabsTrigger>
            <TabsTrigger value="accounts" className="text-xs sm:text-sm py-2">Accounts</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm py-2">Performance</TabsTrigger>
            <TabsTrigger value="coupons" className="text-xs sm:text-sm py-2">Coupons</TabsTrigger>
            <TabsTrigger value="offers" className="text-xs sm:text-sm py-2">Offers</TabsTrigger>
            <TabsTrigger value="user-activity" className="text-xs sm:text-sm py-2">Analytics</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm py-2">Activity</TabsTrigger>
            <TabsTrigger value="integrations" className="text-xs sm:text-sm py-2">MT5</TabsTrigger>
          </TabsList>

          <Suspense fallback={<TabLoader />}>
            <TabsContent value="integrations" className="space-y-4">
              <MT5ConnectionSettings />
            </TabsContent>

            <TabsContent value="signals" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                    <CardTitle className="text-base sm:text-lg">Manage Signals</CardTitle>
                    <Button onClick={() => setShowSignalForm(!showSignalForm)} className="text-xs sm:text-sm h-8 sm:h-9">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {showSignalForm ? "Hide" : "Add"}
                    </Button>
                  </div>
                </CardHeader>
                {showSignalForm && (
                  <CardContent>
                    <SignalForm onSuccess={() => setShowSignalForm(false)} />
                  </CardContent>
                )}
              </Card>
              <SignalsList />
            </TabsContent>

            <TabsContent value="ideas" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                    <CardTitle className="text-base sm:text-lg">Ideas</CardTitle>
                    <Button onClick={() => setShowChartForm(!showChartForm)} className="text-xs sm:text-sm h-8 sm:h-9">
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      {showChartForm ? "Hide" : "Add"}
                    </Button>
                  </div>
                </CardHeader>
                {showChartForm && (
                  <CardContent>
                    <ChartAnalysisForm onSuccess={() => setShowChartForm(false)} />
                  </CardContent>
                )}
              </Card>
              <ChartAnalysisList />
            </TabsContent>

            <TabsContent value="headlines" className="space-y-4">
              <HeadlinesManagement />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <UserManagement />
            </TabsContent>

            <TabsContent value="accounts" className="space-y-4">
              <AccountApplications />
            </TabsContent>

            <TabsContent value="performance" className="space-y-4">
              <PerformanceManagement />
            </TabsContent>

            <TabsContent value="coupons" className="space-y-4">
              <CouponManagement />
            </TabsContent>

            <TabsContent value="offers" className="space-y-4">
              <SpecialOfferManagement />
            </TabsContent>

            <TabsContent value="user-activity" className="space-y-4">
              <UserActivityDashboard />
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <ActivityLog />
            </TabsContent>
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
