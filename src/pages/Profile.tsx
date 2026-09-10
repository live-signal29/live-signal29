import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Mail, Phone, Calendar, Crown, CreditCard, Gift, Edit2, Check, X, LogOut } from "lucide-react";
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
            
            // Calculate months and years
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

      // Load payment history
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isPremium = profile?.subscription_status === 'premium';
  const isTrial = profile?.subscription_status === 'free_trial';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8 gap-2">
              <h1 className="text-xl sm:text-4xl font-bold truncate">
                <span className="gradient-text">My Profile</span>
              </h1>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="shrink-0 h-8 px-2.5 text-xs border-destructive text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Logout
              </Button>
            </div>

            {/* Plan Status Card */}
            <Card className={`mb-6 ${isPremium ? 'border-success bg-gradient-to-r from-success/10 to-success/5' : isTrial ? 'border-warning bg-warning/5' : 'border-destructive bg-destructive/5'}`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${isPremium ? 'bg-success/20' : 'bg-warning/20'}`}>
                      <Crown className={`h-8 w-8 ${isPremium ? 'text-success' : 'text-warning'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-xl">
                          {isPremium ? 'Premium Member' : isTrial ? 'Free Trial' : 'Trial Expired'}
                        </p>
                        {isPremium && (
                          <Badge className="bg-success text-success-foreground font-bold">
                            PREMIUM
                          </Badge>
                        )}
                      </div>
                      {daysRemaining !== null && daysRemaining > 0 ? (
                        <p className={`text-base font-semibold ${isPremium ? 'text-success' : 'text-warning'}`}>
                          {timeRemaining} remaining
                        </p>
                      ) : (
                        <p className="text-destructive font-semibold">
                          Access expired
                        </p>
                      )}
                      {isPremium && profile?.subscription_end_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Valid until {new Date(profile.subscription_end_date).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {!isPremium && (
                      <Button 
                        onClick={() => navigate('/premium')}
                        className="bg-warning hover:bg-warning/90 text-black font-semibold"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        Upgrade to Premium
                      </Button>
                    )}
                    {isPremium && (
                      <Button 
                        onClick={() => navigate('/premium')}
                        variant="outline"
                        className="border-success text-success hover:bg-success/10"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        Extend Premium
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Info */}
            {profile?.subscription_plan && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Subscription Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plan Type:</span>
                    <Badge variant="secondary" className="capitalize">
                      {profile.subscription_plan}
                    </Badge>
                  </div>
                  {profile.selected_categories && profile.selected_categories.length > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Categories:</span>
                      <span className="font-medium">
                        {profile.selected_categories.join(', ')}
                      </span>
                    </div>
                  )}
                  {profile.subscription_start_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Started:</span>
                      <span className="font-medium">
                        {new Date(profile.subscription_start_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {profile.subscription_end_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Expires:</span>
                      <span className="font-medium">
                        {new Date(profile.subscription_end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Account Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <User className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Full Name</p>
                    {isEditingName ? (
                      <div className="flex items-center gap-2">
                        <Input 
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-9"
                          autoFocus
                        />
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleUpdateName}
                          className="h-9 w-9 p-0"
                        >
                          <Check className="h-4 w-4 text-success" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={handleCancelEdit}
                          className="h-9 w-9 p-0"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{profile?.full_name || "Not set"}</p>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setIsEditingName(true)}
                          className="h-8 px-2"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <Mail className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email (cannot be changed)</p>
                    <p className="font-medium">{profile?.email}</p>
                  </div>
                </div>

                {profile?.phone_number && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                    <Phone className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">
                        {profile?.country_code} {profile?.phone_number}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/50">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">
                      {new Date(profile?.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            {subscriptions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {subscriptions.map((sub) => (
                      <div 
                        key={sub.id} 
                        className="flex justify-between items-center p-3 rounded-lg bg-accent/50"
                      >
                        <div>
                          <p className="font-medium capitalize">
                            {sub.category} - {sub.plan_type}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            ${sub.amount}
                          </p>
                          <Badge 
                            variant={sub.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {sub.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
