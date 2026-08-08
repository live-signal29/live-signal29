import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { signupSchema } from "@/lib/validations";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Get return URL from query params
  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get('returnUrl') || '/onboarding';
  const refCode = searchParams.get('ref') || '';
  const [referralCode, setReferralCode] = useState(refCode);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
    const validation = signupSchema.safeParse({
      fullName,
      email,
      password,
      countryCode,
      phoneNumber,
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
        if (msg.includes("already registered") || msg.includes("already been registered") || msg.includes("user already")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else if (msg.includes("weak") || msg.includes("pwned") || msg.includes("easy to guess")) {
          toast.error("This password appears in known data breaches. Please choose a stronger, unique password.");
        } else if (msg.includes("invalid") && msg.includes("email")) {
          toast.error("Please enter a valid email address.");
        } else if (msg.includes("rate") || msg.includes("too many") || msg.includes("429")) {
          toast.error("Too many attempts. Please wait a minute and try again.");
        } else if (msg.includes("failed to fetch") || msg.includes("network")) {
          toast.error("Network issue. Check your connection and try again.");
        } else {
          toast.error(error.message || "Signup failed. Please try again.");
        }
        return;
      }

      if (data.user) {
        // Save the extra profile fields (works because the trigger already created the row)
        if (validation.data.countryCode || validation.data.phoneNumber) {
          await supabase.from('profiles').update({
            country_code: validation.data.countryCode || null,
            phone_number: validation.data.phoneNumber || null,
          }).eq('id', data.user.id);
        }

        if (data.session) {
          // Email confirmation disabled -> user is already signed in, go straight in.
          toast.success("Account created! Welcome aboard ðŸŽ‰");
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }}></div>
      </div>
      
      <Card className="w-full max-w-md animate-fade-in shadow-2xl border-primary/10 relative z-10 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto mb-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>
            <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 w-fit mx-auto transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-500">
              <UserPlus className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Create Account
            </CardTitle>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Join VIP Gold Signals today
            </p>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
              />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="space-y-2">
                <Label htmlFor="countryCode" className="text-sm font-medium">Code</Label>
                <Input
                  id="countryCode"
                  type="text"
                  placeholder="+1"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm font-medium">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
              />
            </div>

            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.65s' }}>
              <Label htmlFor="referralCode" className="text-sm font-medium flex items-center gap-1">
                Referral Code <span className="text-xs text-muted-foreground">(optional, +3 free days for friend)</span>
              </Label>
              <Input
                id="referralCode"
                type="text"
                placeholder="ABC12345"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={12}
                className="uppercase tracking-wider font-mono transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
              />
            </div>

            <div className="flex items-start space-x-2 animate-fade-in" style={{ animationDelay: '0.7s' }}>
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                I agree to the{" "}
                <a href="/terms" className="text-primary hover:underline font-semibold transition-all">
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href="/privacy" className="text-primary hover:underline font-semibold transition-all">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full btn-glow relative overflow-hidden group animate-fade-in transform hover:scale-[1.02] transition-all duration-300" 
              disabled={loading}
              style={{ animationDelay: '0.8s' }}
            >
              <span className="relative z-10">{loading ? "Creating Account..." : "Sign Up"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>

            <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.9s' }}>
              Already have an account?{" "}
              <a href="/login" className="text-primary hover:underline font-semibold transition-all hover:text-primary/80">
                Sign in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
