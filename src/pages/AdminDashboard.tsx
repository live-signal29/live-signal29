import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";
import SignalForm from "@/components/admin/SignalForm";
import SignalsList from "@/components/admin/SignalsList";
import ChartAnalysisForm from "@/components/admin/ChartAnalysisForm";
import ChartAnalysisList from "@/components/admin/ChartAnalysisList";
import UserManagement from "@/components/admin/UserManagement";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showSignalForm, setShowSignalForm] = useState(false);
  const [showChartForm, setShowChartForm] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin/login");
        return;
      }

      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .single();

      if (!roles) {
        toast.error("Access denied. Admin privileges required.");
        await supabase.auth.signOut();
        navigate("/admin/login");
        return;
      }

      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/admin/login");
      }
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
  };

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="signals">Trading Signals</TabsTrigger>
            <TabsTrigger value="charts">Chart Analysis</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="signals" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Manage Signals</CardTitle>
                  <Button onClick={() => setShowSignalForm(!showSignalForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {showSignalForm ? "Hide Form" : "Add Signal"}
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

          <TabsContent value="charts" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Manage Chart Analysis</CardTitle>
                  <Button onClick={() => setShowChartForm(!showChartForm)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {showChartForm ? "Hide Form" : "Add Analysis"}
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

          <TabsContent value="users" className="space-y-4">
            <UserManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
