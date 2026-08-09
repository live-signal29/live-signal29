import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Check, X } from "lucide-react";
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

  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get('returnUrl') || '/onboarding';
  const refCode = searchParams.get('ref') || '';
  const [referralCode, setReferralCode] = useState(refCode);

  // Password Validations Logic
  const passwordRules = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "Contains a number (0-9)", valid: /\d/.test(password) },
    { label: "Contains special character (@$!%*?&)", valid: /[@$!%*?&]/.test(password) },
    { label: "Uppercase & Lowercase letter", valid: /[a-z]/.test(password) && /[A-Z]/.test(password) }
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

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
        if (msg.includes("already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message || "Signup failed. Please try again.");
        }
        return;
      }

      if (data.user) {
        if (validation.data.countryCode || validation.data.phoneNumber) {
          await supabase.from('profiles').update({
            country_code: validation.data.countryCode || null,
            phone_number: validation.data.phoneNumber || null,
          }).eq('id', data.user.id);
        }

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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/5">
      <Card className="w-full max-w-md animate-fade-in shadow-2xl border-primary/10 relative z-10 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center space-y-4 pb-6">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Create Account
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {/* LIVE PASSWORD REQUIREMENTS WITH TICK MARKS */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1 text-xs rounded-lg bg-muted/50 p-3 border border-border">
                  {passwordRules.map((rule, idx) => (
                    <div key={idx} className={`flex items-center gap-2 ${rule.valid ? "text-emerald-500 font-medium" : "text-muted-foreground"}`}>
                      {rule.valid ? <Check className="h-3.5 w-3.5 text-emerald-500 stroke-[3]" /> : <X className="h-3.5 w-3.5 text-muted-foreground/50" />}
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} />
              <label htmlFor="terms" className="text-sm text-muted-foreground">I agree to the Terms & Privacy</label>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
