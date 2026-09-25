import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotificationSettings from "@/components/NotificationSettings";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2,
  User,
  Mail,
  Phone,
  Calendar,
  Crown,
  CreditCard,
  Gift,
  Edit2,
  Check,
  X,
  LogOut,
  Star,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=co.median.android.krkqyaz";

// Keep in sync with APP_VERSION in SideDrawer.tsx
const APP_VERSION = "1.7.9";
const LAST_UPDATED = "Sep 5, 2026";

const Profile = () => {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await loadProfile(mounted);
      } catch (error) {
        console.error("Profile initialization error:", error);
      } finally {
        // VERY IMPORTANT:
        // Never allow the page to stay on the loading screen.
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const loadProfile = async (mounted = true) => {
    try {
      // ----------------------------------------------------
      // 1. GET CURRENT USER
      // ----------------------------------------------------
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.error("Auth error:", authError);
        if (mounted) {
          toast.error("Unable to verify your account");
          navigate("/login", { replace: true });
        }
        return;
      }

      if (!user) {
        if (mounted) {
          navigate("/login", { replace: true });
        }
        return;
      }

      // ----------------------------------------------------
      // 2. LOAD PROFILE
      // ----------------------------------------------------
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile query error:", profileError);

        if (mounted) {
          toast.error("Could not load your profile");
        }

        return;
      }

      // ----------------------------------------------------
      // 3. IF PROFILE DOES NOT EXIST
      // ----------------------------------------------------
      if (!profileData) {
        console.warn("No profile found for user:", user.id);

        if (mounted) {
          // Basic fallback profile so page doesn't remain blank/loading
          setProfile({
            id: user.id,
            email: user.email || "",
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              "",
            subscription_status: "free_trial",
            subscription_plan: null,
            subscription_start_date: null,
            subscription_end_date: null,
            trial_end_date: null,
            phone_number: null,
            country_code: null,
            created_at: user.created_at,
          });

          setEditedName(
            user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              ""
          );
        }

        // Don't return here.
        // We can still safely try payment history below.
      } else {
        // ----------------------------------------------------
        // 4. SET PROFILE
        // ----------------------------------------------------
        if (mounted) {
          setProfile(profileData);
          setEditedName(profileData.full_name || "");
        }

        // ----------------------------------------------------
        // 5. CALCULATE SUBSCRIPTION/TRIAL TIME
        // ----------------------------------------------------
        const endDate =
          profileData.subscription_status === "premium"
            ? profileData.subscription_end_date
            : profileData.trial_end_date;

        if (endDate && mounted) {
          const end = new Date(endDate);
          const now = new Date();
          const diffTime = end.getTime() - now.getTime();

          const diffDays = Math.ceil(
            diffTime / (1000 * 60 * 60 * 24)
          );

          if (diffDays > 0) {
            setDaysRemaining(diffDays);

            const years = Math.floor(diffDays / 365);
            const months = Math.floor((diffDays % 365) / 30);
            const days = diffDays % 30;

            const parts: string[] = [];

            if (years > 0) {
              parts.push(
                `${years} year${years > 1 ? "s" : ""}`
              );
            }

            if (months > 0) {
              parts.push(
                `${months} month${months > 1 ? "s" : ""}`
              );
            }

            if (days > 0 && years === 0) {
              parts.push(
                `${days} day${days > 1 ? "s" : ""}`
              );
            }

            setTimeRemaining(
              parts.length > 0
                ? parts.join(", ")
                : `${diffDays} days`
            );
          } else {
            setDaysRemaining(0);
            setTimeRemaining("");
          }
        } else if (mounted) {
          setDaysRemaining(null);
          setTimeRemaining("");
        }
      }

      // ----------------------------------------------------
      // 6. LOAD PAYMENT HISTORY
      // ----------------------------------------------------
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (subError) {
        // Don't break the whole profile page if subscriptions
        // table/query has an issue.
        console.error("Subscription query error:", subError);

        if (mounted) {
          setSubscriptions([]);
        }
      } else if (mounted) {
        setSubscriptions(subData || []);
      }
    } catch (error) {
      console.error("Unexpected profile error:", error);

      if (mounted) {
        toast.error("Something went wrong while loading your profile");
      }
    }
  };

  // ----------------------------------------------------
  // UPDATE NAME
  // ----------------------------------------------------
  const handleUpdateName = async () => {
    const name = editedName.trim();

    if (!name) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        toast.error("Session expired. Please login again.");
        navigate("/login", { replace: true });
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: name,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Update name error:", error);
        throw error;
      }

      setProfile((prev: any) => ({
        ...prev,
        full_name: name,
      }));

      setEditedName(name);
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

  // ----------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  // ----------------------------------------------------
  // RATE US
  // ----------------------------------------------------
  const handleRateUs = () => {
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  };

  // ----------------------------------------------------
  // LOADING
  // ----------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // NO PROFILE SAFETY
  // ----------------------------------------------------
  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Header />

        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md rounded-3xl">
            <CardContent className="p-8 text-center">
              <User className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />

              <h2 className="text-xl font-bold mb-2">
                Profile unavailable
              </h2>

              <p className="text-sm text-muted-foreground mb-5">
                We couldn't load your profile information.
              </p>

              <Button
                onClick={() => window.location.reload()}
                className="rounded-xl"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    );
  }

  const isPremium =
    profile.subscription_status === "premium";

  const isTrial =
    profile.subscription_status === "free_trial";

  const isLifetime =
    profile.subscription_plan === "premium-lifetime";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Header />

      <main className="flex-1 pb-12">
        <div className="container mx-auto px-4 py-8 max-w-3xl">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Profile
            </h1>

            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="h-9 px-3 text-xs border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Logout
            </Button>
          </div>

          {/* Subscription Banner */}
          <div
            className={`relative overflow-hidden rounded-3xl border p-6 mb-6 backdrop-blur-xl ${
              isPremium
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-amber-500/30 bg-amber-500/10"
            }`}
          >
            <div className="flex items-center justify-between flex-wrap gap-4">

              <div className="flex items-center gap-4">
                <div
                  className={`p-3.5 rounded-2xl flex items-center justify-center ${
                    isPremium
                      ? "bg-emerald-500/20 text-emerald-500"
                      : "bg-amber-500/20 text-amber-500"
                  }`}
                >
                  <Crown className="h-7 w-7" />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-xl tracking-tight">
                      {isLifetime
                        ? "Lifetime Member"
                        : isPremium
                        ? "Premium Member"
                        : isTrial
                        ? "Free Trial"
                        : "Trial Expired"}
                    </p>

                    {isPremium && (
                      <Badge className="bg-emerald-500 text-black font-bold border-none text-[10px] px-2">
                        {isLifetime ? "LIFETIME" : "PREMIUM"}
                      </Badge>
                    )}
                  </div>

                  {isLifetime ? (
                    <p className="text-sm font-semibold text-emerald-500">
                      Lifetime access — never expires
                    </p>
                  ) : daysRemaining !== null &&
                  daysRemaining > 0 ? (
                    <p
                      className={`text-sm font-semibold ${
                        isPremium
                          ? "text-emerald-500"
                          : "text-amber-500"
                      }`}
                    >
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
                  onClick={() => navigate("/premium")}
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-2xl py-3 px-6 shadow-lg shadow-amber-500/20"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Upgrade to Premium
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/premium")}
                  variant="outline"
                  className="w-full sm:w-auto border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 font-bold rounded-2xl py-3 px-6"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Extend Premium
                </Button>
              )}
            </div>
          </div>

          {/* Rate Us */}
          <Card className="mb-6 rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Star className="h-4 w-4 text-primary" />
                Rate Us
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium text-sm">
                    Enjoying our app?
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Your honest feedback helps us improve the app and provide
                    a better experience for everyone.
                  </p>
                </div>

                <Button
                  onClick={handleRateUs}
                  className="w-full sm:w-auto rounded-2xl"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Rate Us
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card className="mb-6 rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                Account Information
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">

              {/* Name */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <User className="h-5 w-5 text-primary shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Full Name
                  </p>

                  {isEditingName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        value={editedName}
                        onChange={(e) =>
                          setEditedName(e.target.value)
                        }
                        className="h-8 text-sm rounded-xl bg-background border-border"
                        autoFocus
                      />

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleUpdateName}
                        className="h-8 w-8 p-0"
                      >
                        <Check className="h-4 w-4 text-emerald-500" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCancelEdit}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm truncate">
                        {profile.full_name || "Not set"}
                      </p>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setIsEditingName(true)
                        }
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Email (cannot be changed)
                  </p>

                  <p className="font-semibold text-sm truncate">
                    {profile.email || "Not available"}
                  </p>
                </div>
              </div>

              {/* Phone */}
              {profile.phone_number && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary shrink-0" />

                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">
                      Phone
                    </p>

                    <p className="font-semibold text-sm">
                      {profile.country_code || ""}{" "}
                      {profile.phone_number}
                    </p>
                  </div>
                </div>
              )}

              {/* Member Since */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/50 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary shrink-0" />

                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Member Since
                  </p>

                  <p className="font-semibold text-sm">
                    {profile.created_at
                      ? new Date(
                          profile.created_at
                        ).toLocaleDateString()
                      : "Not available"}
                  </p>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Payment History */}
          {subscriptions.length > 0 && (
            <Card className="mb-6 rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
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
                        {sub.created_at
                          ? new Date(
                              sub.created_at
                            ).toLocaleDateString()
                          : ""}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-primary text-sm">
                        ${sub.amount}
                      </p>

                      <Badge
                        variant={
                          sub.status === "active"
                            ? "default"
                            : "secondary"
                        }
                        className="text-[10px] rounded-lg px-2 py-0"
                      >
                        {sub.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Notification Settings */}
          <div className="mb-6">
            <NotificationSettings />
          </div>

          {/* App Information */}
          <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground">
                App Information
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-muted-foreground">
                  App Version
                </span>
                <span className="font-semibold text-foreground">
                  {APP_VERSION}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-muted-foreground">
                  Last Updated
                </span>
                <span className="font-semibold text-foreground">
                  {LAST_UPDATED}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-t border-border/40">
                <span className="text-muted-foreground">
                  Platform
                </span>
                <span className="font-semibold text-foreground">
                  Web App
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
