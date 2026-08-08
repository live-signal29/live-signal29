import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { signupSchema } from "@/lib/validations";
import { cn } from "@/lib/utils";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get('returnUrl') || '/onboarding';
  const refCode = searchParams.get('ref') || '';
  const [referralCode, setReferralCode] = useState(refCode);

  // ===== PASSWORD STRENGTH LOGIC =====
  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(password);
  
  const getStrengthLabel = () => {
    if (password.length === 0) return { label: "Enter password", color: "text-slate-500", width: "0%" };
    if (strengthScore <= 2) return { label: "Weak", color: "text-red-400", width: "33%" };
    if (strengthScore <= 3) return { label: "Medium", color: "text-yellow-400", width: "66%" };
    return { label: "Strong", color: "text-emerald-400", width: "100%" };
  };

  const strength = getStrengthLabel();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // SAFE VALIDATION: Sirf wahi fields validate kar rahe hain jo aapke schema mein honge
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
        if (msg.includes("already registered") || msg.includes("user already")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message || "Signup failed. Please try again.");
        }
        return;
      }

      if (data.user) {
        // Optional fields save karna (agar schema mein nahi hain toh bhi code crash nahi karega)
        if (validation.data.countryCode || validation.data.phoneNumber) {
          await supabase.from('profiles').update({
            country_code: countryCode || null,
            phone_number: phoneNumber || null,
          }).eq('id', data.user.id);
        }

        if (data.session) {
          toast.success("Account created! Welcome aboard 🎉");
          navigate(returnUrl);
        } else {
          toast.success("Account created! Please confirm your email.");
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
    <div className="min-h-screen flex items-center justify-center p-4 py-12 relative overflow-hidden bg-[#0a0c16]">
      
      {/* ===== PREMIUM BACKGROUND GLOWS ===== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[80px] animate-pulse" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-purple-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      {/* ===== MAIN CARD ===== */}
      <Card className="w-full max-w-md border-white/10 bg-[#11131f]/90 backdrop-blur-xl shadow-2xl shadow-black/50 relative z-10 overflow-hidden">
        
        {/* Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />

        <CardHeader className="text-center space-y-3 pb-4 pt-6">
          <div className="mx-auto relative group">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500" />
            <div className="relative p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 w-fit mx-auto transform group-hover:scale-110 transition-all duration-500 border border-white/10">
              <UserPlus className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-white">
              Create Account
            </CardTitle>
            <p className="text-sm text-slate-400">
              Join VIP Gold Signals today
            </p>
          </div>
        </CardHeader>

        <CardContent className="pt-2 pb-6">
          <form onSubmit={handleSignup} className="space-y-3.5">
            
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 h-9 text-sm"
              />
            </div>

            {/* Phone Grid (Validation se bahar, sirf UI ke liye) */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Code</Label>
                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+1"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 h-9 text-sm"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">Phone Number</Label>
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="1234567890"
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 h-9 text-sm"
                />
              </div>
            </div>

            {/* PASSWORD WITH LOGIC */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="space-y-1 mt-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          strengthScore <= 2 ? "bg-red-500" : strengthScore <= 3 ? "bg-yellow-500" : "bg-emerald-500"
                        }`} 
                        style={{ width: strength.width }}
                      />
                    </div>
                    <span className={`text-[10px] font-medium ml-2 min-w-[60px] text-right ${strength.color}`}>
                      {strength.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-500">
                    <span className={cn(password.length >= 8 ? "text-emerald-400" : "text-slate-500")}>
                      {password.length >= 8 ? <CheckCircle2 className="h-3 w-3 inline" /> : <XCircle className="h-3 w-3 inline opacity-30" />}
                    </span>
                    8+ characters
                    <span className="mx-0.5 opacity-30">•</span>
                    <span className={cn(/[A-Z]/.test(password) ? "text-emerald-400" : "text-slate-500")}>
                      {/[A-Z]/.test(password) ? <CheckCircle2 className="h-3 w-3 inline" /> : <XCircle className="h-3 w-3 inline opacity-30" />}
                    </span>
                    Uppercase
                    <span className="mx-0.5 opacity-30">•</span>
                    <span className={cn(/[0-9]/.test(password) ? "text-emerald-400" : "text-slate-500")}>
                      {/[0-9]/.test(password) ? <CheckCircle2 className="h-3 w-3 inline" /> : <XCircle className="h-3 w-3 inline opacity-30" />}
                    </span>
                    Number
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                Referral Code <span className="text-[9px] text-slate-500 font-normal">(optional)</span>
              </Label>
              <Input
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="ABC12345"
                maxLength={12}
                className="uppercase tracking-wider font-mono bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/50 h-9 text-sm"
              />
            </div>

            <div className="flex items-start space-x-2 pt-1">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                className="mt-0.5 border-slate-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
              />
              <label htmlFor="terms" className="text-[11px] text-slate-400 leading-relaxed">
                I agree to the{" "}
                <a href="/terms" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                  Terms
                </a>{" "}
                &{" "}
                <a href="/privacy" className="text-blue-400 hover:text-blue-300 underline transition-colors">
                  Privacy Policy
                </a>
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold h-9 text-sm shadow-lg shadow-blue-500/20 transition-all duration-300 disabled:opacity-50" 
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </Button>

            <p className="text-center text-[12px] text-slate-400">
              Already have an account?{" "}
              <a href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
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
