import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Check, X, Eye, EyeOff } from "lucide-react";
import { signupSchema } from "@/lib/validations";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get('returnUrl') || '/onboarding';
  const refCode = searchParams.get('ref') || '';
  const [referralCode, setReferralCode] = useState(refCode);

  // Live Password Validation Rules
  const passwordRules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "Contains a number (0-9)", valid: /\d/.test(password) },
    { label: "Contains special character (@$!%*?&)", valid: /[@$!%*?&]/.test(password) },
    { label: "Uppercase & Lowercase letter", valid: /[a-z]/.test(password) && /[A-Z]/.test(password) }
  ];

  // Calculate Strength Score (0 to 4)
  const strengthScore = passwordRules.filter((r) => r.valid).length;

  const getStrengthLabel = () => {
    if (strengthScore === 0) return { text: "Too Weak", color: "bg-destructive", textColor: "text-destructive" };
    if (strengthScore <= 2) return { text: "Weak", color: "bg-orange-500", textColor: "text-orange-500" };
    if (strengthScore === 3) return { text: "Medium", color: "bg-yellow-500", textColor: "text-yellow-500" };
    return { text: "Strong", color: "bg-emerald-500", textColor: "text-emerald-500" };
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = signupSchema.safeParse({
      fullName,
      email,
      password,
      termsAccepted,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}${returnUrl}`,
          data: {
            full_name: validation.data.fullName,
            terms_accepted: validation.data.termsAccepted,
            referred_by_code: referralCode ? referralCode.trim().toUpperCase() : undefined,
          }
        }
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message || "Signup failed. Please try again.");
        }
        return;
      }

      if (data.user) {
        if (data.session) {
          toast.success("Account created! Welcome aboard 🎉");
          navigate(returnUrl);
        } else {
          toast.success("Account created! Please confirm your email, then sign in.");
          navigate(`/login${returnUrl !== '/onboarding' ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`);
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${returnUrl}`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
      {/* Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <Card className="glass-card w-full max-w-md animate-fade-in shadow-2xl border-primary/10 relative z-10 rounded-3xl">
        <CardHeader className="text-center space-y-4 pb-6 pt-8">
          <div className="mx-auto mb-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>
            <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 w-fit mx-auto transform group-hover:scale-110 transition-transform duration-500">
              <UserPlus className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <p className="text-muted-foreground text-sm">Join us today and get started</p>
          </div>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleSignup} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.01]"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.01]"
              />
            </div>

            {/* Referral Code (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="referralCode">Referral Code (Optional)</Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="REF123"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                className="transition-all duration-300 focus:scale-[1.01]"
              />
            </div>

            {/* Password Field + Eye Toggle + Strength Meter */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10 transition-all duration-300 focus:scale-[1.01]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* DYNAMIC PASSWORD STRENGTH BAR */}
              {password.length > 0 && (
                <div className="space-y-2 pt-1 animate-fade-in">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Strength:</span>
                    <span className={`font-semibold ${getStrengthLabel().textColor}`}>
                      {getStrengthLabel().text}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getStrengthLabel().color}`}
                      style={{ width: `${(strengthScore / 4) * 100}%` }}
                    ></div>
                  </div>

                  {/* LIVE TICK MARKS LIST */}
                  <div className="mt-2 space-y-1.5 text-xs rounded-xl bg-muted/60 p-3 border border-border/60">
                    {passwordRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 transition-colors duration-200 ${
                          rule.valid ? "text-emerald-500 font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {rule.valid ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                        )}
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Terms & Conditions */}
            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-tight cursor-pointer">
                I agree to the <span className="text-primary hover:underline">Terms & Privacy Policy</span>
              </label>
            </div>

            {/* Submit Button */}
            <Button type="submit" className="w-full btn-glow relative overflow-hidden group" disabled={loading}>
              <span className="relative z-10">{loading ? "Creating Account..." : "Sign Up"}</span>
            </Button>

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            {/* Google Signup Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full hover:border-primary/50 hover:bg-primary/5"
              onClick={handleGoogleSignup}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign up with Google</span>
            </Button>

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
