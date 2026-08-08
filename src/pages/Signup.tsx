import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ FIX: Sirf 4 fields validate hongi (Phone/Code ko validation se hata diya)
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
        if (countryCode || phoneNumber) {
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-950">
      <div className="w-full max-w-md mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-cyan-500 mb-2">
            Create Account
          </h1>
          <p className="text-gray-500 text-sm">
            Join VIP Gold Signals today
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* Full Name */}
          <div>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              required
              className="h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
            />
          </div>

          {/* Email */}
          <div>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              className="h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
            />
          </div>

          {/* Phone Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <Input
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                placeholder="+1"
                className="h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="1234567890"
                className="h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="h-12 bg-gray-50 border-gray-200 rounded-xl text-base"
            />
          </div>

          {/* Referral */}
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">(optional, +3 free days for friend)</p>
            <Input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              maxLength={12}
              className="h-12 bg-gray-50 border-gray-200 rounded-xl text-base uppercase tracking-wider font-mono"
            />
          </div>

          {/* Terms */}
          <div className="flex items-start space-x-3 pt-2">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              className="mt-1 border-gray-400 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
              I agree to the{" "}
              <a href="/terms" className="text-blue-600 hover:underline font-medium">
                Terms & Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-blue-600 hover:underline font-medium">
                Privacy Policy
              </a>
            </label>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold text-base rounded-xl transition-all duration-300 shadow-md shadow-blue-500/20" 
            disabled={loading}
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          {/* Footer */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{" "}
            <a href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
