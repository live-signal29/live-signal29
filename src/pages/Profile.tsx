import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Mail, Phone, Calendar, Crown, CreditCard, Gift, Edit2, Check, X, LogOut, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const Profile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
        setEditedName(profileData.full_name || "");
        
        const endDate = profileData.subscription_status === 'premium'
          ? profileData.subscription_end_date
          : profileData.trial_end_date;

        if (endDate) {
          const end = new Date(endDate);
          const now = new Date();
          const diffTime = end.getTime() - now.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (diffDays > 0) {
            setDaysRemaining(diffDays);
            
            const years = Math.floor(diffDays / 365);
            const months = Math.floor((diffDays % 365) / 30);
            const days = diffDays % 30;
            
            let timeStr = "";
            if (years > 0) {
              timeStr += `${years} year${years > 1 ? 's' : ''}`;
            }
            if (months > 0) {
              if (timeStr) timeStr += ", ";
              timeStr += `${months} month${months > 1 ? 's' : ''}`;
            }
            if (days > 0 && years === 0) {
              if (timeStr) timeStr += ", ";
              timeStr += `${days} day${days > 1 ? 's' : ''}`;
            }
            
            setTimeRemaining(timeStr || `${diffDays} days`);
          }
        }
      }

      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setSubscriptions(subData || []);
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editedName.trim() })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, full_name: editedName.trim() });
      setIsEditingName(false);
      toast.success("Name updated successfully");
    } catch (error) {
      console.error("Error updating name:", error);
      toast.error("Failed to update name");
    }
  };

  const handleCancelEdit = () => {
    setEditedName(profile?.full_name || "");
    setIsEditingName(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = profile?.subscription_status === 'premium';
  const isTrial = profile?.subscription_status === 'free_trial';

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />
      
      <main className="flex-1 pb-12">
        <div className="container mx-auto px-4 py-8 max-w-3xl">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Profile
            </h1>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl transition-all"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Logout
            </Button>
          </div>

          {/* Subscription Banner */}
          <div className={`relative overflow-hidden rounded-3xl border p-6 mb-6 backdrop-blur-xl transition-all ${
            isPremium 
              ? 'border-emerald-500/30 bg-emerald-500/10' 
              : 'border-amber-500/30 bg-amber-500/10'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl flex items-center justify-center ${
                  isPremium ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                }`}>
                  <Crown className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-xl tracking-tight">
                      {isPremium ? 'Premium Member' : isTrial ? 'Free Trial' : 'Trial Expired'}
                    </p>
                    {isPremium && (
                      <Badge className="bg-emerald-500 text-black font-bold border-none text-[10px] px-2">
                        PREMIUM
                      </Badge>
                    )}
                  </div>
                  {daysRemaining !== null && daysRemaining > 0 ? (
                    <p className={`text-sm font-semibold ${isPremium ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {timeRemaining} remaining
                    </p>
                  ) : (
                    <p className="text-destructive text-sm font-semibold">
                      Access expired
                    </p>
                  )}
                </div>
              </div>

              {!isPremium ? (
                <Button 
                  onClick={() => navigate('/premium')}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl py-3 px-6 shadow-lg shadow-amber-500/20"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              ) : (
                <Button 
                  onClick={() => navigate('/premium')}
                  variant="outline"
                  className="w-full sm:w-auto border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold rounded-2xl py-3 px-6"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Extend Premium
                </Button>
              )}
            </div>
          </div>

          {/* Subscription Details */}
          {profile?.subscription_plan && (
            <Card className="mb-6 rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Subscription Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Plan Type:</span>
                  <Badge variant="secondary" className="capitalize rounded-xl px-3 py-0.5 bg-muted/60 text-foreground border border-border/50">
                    {profile.subscription_plan}
                  </Badge>
                </div>
                {profile.subscription_start_date && (
                  <div className="flex justify-between items-center py-1 border-t border-border/40">
                    <span className="text-muted-foreground">Started:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(profile.subscription_start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {profile.subscription_end_date && (
                  <div className="flex justify-between items-center py-1 border-t border-border/40">
                    <span className="text-muted-foreground">Expires:</span>
                    <span className="font-semibold text-foreground">
                      {new Date(profile.subscription_end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Account Information */}
          <Card className="mb-6 rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              
              {/* Full Name Field */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <User className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Full Name</p>
                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input 
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="h-8 text-sm rounded-xl bg-background border-border"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={handleUpdateName} className="h-8 w-8 p-0">
                        <Check className="h-4 w-4 text-emerald-500" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">{profile?.full_name || "Not set"}</p>
                      <Button size="sm" variant="ghost" onClick={() => setIsEditingName(true)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Field */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">Email (cannot be changed)</p>
                  <p className="font-semibold text-sm truncate">{profile?.email}</p>
                </div>
              </div>

              {/* Phone Field */}
              {profile?.phone_number && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Phone</p>
                    <p className="font-semibold text-sm">{profile?.country_code} {profile?.phone_number}</p>
                  </div>
                </div>
              )}

              {/* Member Since Field */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Member Since</p>
                  <p className="font-semibold text-sm">{new Date(profile?.created_at).toLocaleDateString()}</p>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Payment History */}
          {subscriptions.length > 0 && (
            <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Payment History
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {subscriptions.map((sub) => (
                  <div 
                    key={sub.id} 
                    className="flex justify-between items-center p-3.5 rounded-2xl bg-muted/40 border border-border/50"
                  >
                    <div>
                      <p className="font-semibold text-sm capitalize">
                        {sub.category} - {sub.plan_type}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">
                        ${sub.amount}
                      </p>
                      <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="text-[10px] rounded-lg px-2 py-0">
                        {sub.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
