import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SignalCardNew from "@/components/SignalCardNew";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const SharedSignal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [signal, setSignal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Redirect to signup with return URL
        navigate(`/signup?returnUrl=/signal/${id}`);
        return;
      }
      
      setIsAuthenticated(true);
      fetchSignal();
    };

    checkAuth();
  }, [id, navigate]);

  const fetchSignal = async () => {
    try {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        toast.error("Signal not found");
        navigate("/");
        return;
      }

      setSignal(data);
    } catch (error) {
      console.error('Error fetching signal:', error);
      toast.error("Failed to load signal");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!signal) return null;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Shared Signal</h1>
            <p className="text-sm text-muted-foreground">View this trading signal</p>
          </div>
        </div>

        <SignalCardNew signal={signal} hasAccess={true} showFavoriteButton={true} />

        <Button
          onClick={() => navigate("/")}
          className="w-full"
        >
          View All Signals
        </Button>
      </div>
    </div>
  );
};

export default SharedSignal;
