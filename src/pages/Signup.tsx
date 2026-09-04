import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Globe, Eye, EyeOff, Check, X } from "lucide-react";
import { signupSchema } from "@/lib/validations";

const Signup = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get("returnUrl") || "/onboarding";
  const refCode = searchParams.get("ref") || "";
  const [referralCode, setReferralCode] = useState(refCode);

  const isCommonPattern =
    /(123|password|admin|qwerty|azazi|aziz)/i.test(password);

  const passwordRules = [
    {
      label: "At least 8 characters",
      valid: password.length >= 8,
    },
    {
      label: "Contains a number (0-9)",
      valid: /\d/.test(password),
    },
    {
      label: "Contains special character (@$!%*?&)",
      valid: /[@$!%*?&]/.test(password),
    },
    {
      label: "Uppercase & Lowercase letter",
      valid: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      label: "Avoid common phrases",
      valid: !isCommonPattern && password.length > 0,
    },
  ];

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    const fullName = `${firstName} ${lastName}`.trim();

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
            first_name: firstName,
            last_name: lastName,
            terms_accepted: validation.data.termsAccepted,
            referred_by_code: referralCode
              ? referralCode.trim().toUpperCase()
              : undefined,
          },
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();

        if (msg.includes("already registered")) {
          toast.error(
            "This email is already registered. Please sign in instead."
          );
        } else if (
          msg.includes("weak") ||
          msg.includes("easy to guess") ||
          msg.includes("pwned")
        ) {
          toast.error(
            "This password is too easy to guess. Please choose a unique password."
          );
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
          toast.success(
            "Account created! Please confirm your email, then sign in."
          );

          navigate(
            `/login${
              returnUrl !== "/onboarding"
                ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                : ""
            }`
          );
        }
      }
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignup = async (provider: "google" | "apple") => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}${returnUrl}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || `${provider} signup failed`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070908] text-white flex flex-col px-5 py-5 font-sans relative overflow-x-hidden">

      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[260px] h-[260px] bg-emerald-900/15 rounded-full blur-[90px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[280px] h-[280px] bg-emerald-950/20 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4 z-10 shrink-0">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-white hover:opacity-80 transition-opacity p-1"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-bold tracking-wide">
          Register
        </h1>

        <button
          type="button"
          className="flex items-center gap-1 text-emerald-500 font-semibold text-[10px] tracking-wider uppercase"
        >
          <Globe className="h-3.5 w-3.5" />
          AUTO
        </button>
      </div>

      {/* Signup Section */}
      <div className="max-w-sm w-full mx-auto z-10">

        <form onSubmit={handleSignup} className="space-y-3">

          {/* First & Last Name */}
          <div className="grid grid-cols-2 gap-2.5">
            <Input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoComplete="given-name"
              className="h-11 bg-[#1f2220]/90 border-0 rounded-xl text-white text-sm placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
            />

            <Input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              autoComplete="family-name"
              className="h-11 bg-[#1f2220]/90 border-0 rounded-xl text-white text-sm placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Email */}
          <div className="relative pt-1">
            <label className="absolute -top-1 left-3 text-[11px] text-emerald-500 bg-[#070908] px-1 z-10 font-medium">
              Email
            </label>

            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-11 bg-[#1f2220]/90 border-0 rounded-xl text-white text-sm placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
          </div>

          {/* Password */}
          <div className="relative pt-1">
            <label className="absolute -top-1 left-3 text-[11px] text-emerald-500 bg-[#070908] px-1 z-10 font-medium">
              Password
            </label>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                className="h-11 bg-[#1f2220]/90 border-0 rounded-xl text-white text-sm placeholder:text-gray-500 pr-11 focus-visible:ring-1 focus-visible:ring-emerald-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>

            {/* Password Rules */}
            {password.length > 0 && (
              <div className="mt-2 p-2.5 bg-[#181a19]/90 rounded-xl border border-gray-800 space-y-1 text-[10px]">
                {passwordRules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 ${
                      rule.valid ? "text-emerald-400" : "text-gray-500"
                    }`}
                  >
                    {rule.valid ? (
                      <Check className="h-3 w-3 shrink-0" />
                    ) : (
                      <X className="h-3 w-3 shrink-0" />
                    )}

                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Referral */}
          <Input
            type="text"
            placeholder="Referral code (Optional)"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            className="h-11 bg-[#1f2220]/90 border-0 rounded-xl text-white text-sm placeholder:text-gray-500 focus-visible:ring-1 focus-visible:ring-emerald-500"
          />

          {/* Terms */}
          <div className="flex items-start gap-2.5 pt-1">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) =>
                setTermsAccepted(checked as boolean)
              }
              className="mt-0.5 h-4 w-4 border-gray-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 rounded"
            />

            <label
              htmlFor="terms"
              className="text-[10px] text-gray-300 leading-relaxed cursor-pointer"
            >
              I accept the{" "}
              <span className="text-emerald-500">
                Terms & Conditions
              </span>
              ,{" "}
              <span className="text-emerald-500">
                Privacy Policy
              </span>
              , &{" "}
              <span className="text-emerald-500">
                Cookie Policy
              </span>
              .
            </label>
          </div>

          {/* Register Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[#42434a] hover:bg-[#4f5058] text-gray-200 font-semibold rounded-xl text-sm transition-colors mt-1"
          >
            {loading ? "Creating Account..." : "Register"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-800" />
          </div>

          <div className="relative flex justify-center text-[10px]">
            <span className="bg-[#070908] px-3 text-gray-500">
              Or Register with
            </span>
          </div>
        </div>

        {/* Social Buttons */}
        <div className="flex justify-center items-center gap-3">

          {/* Google */}
          <button
            type="button"
            onClick={() => handleOAuthSignup("google")}
            className="w-11 h-11 rounded-full bg-[#1f2220] flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 1.7 14.9 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6c-.3 1.4-1 2.5-2.2 3.3l3.6 2.8c2.1-1.9 3.2-4.7 3.2-8.1z"
              />
              <path
                fill="#FBBC05"
                d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.2-1.4.4-2.1L2.2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z"
              />
              <path
                fill="#34A853"
                d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5L2.2 17C4 20.5 7.7 23 12 23z"
              />
            </svg>
          </button>

          {/* Apple */}
          <button
            type="button"
            onClick={() => handleOAuthSignup("apple")}
            className="w-11 h-11 rounded-full bg-[#1f2220] flex items-center justify-center hover:bg-gray-800 transition-colors text-white"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.16-.57 2.81-1.37z" />
            </svg>
          </button>

        </div>

        {/* Already Have Account */}
        <div className="text-center mt-5 pb-4">
          <p className="text-xs text-gray-300">
            Have an account?{" "}
            <Link
              to={`/login${
                returnUrl !== "/onboarding"
                  ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                  : ""
              }`}
              className="text-emerald-500 font-semibold underline underline-offset-2"
            >
              Login
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Signup;
