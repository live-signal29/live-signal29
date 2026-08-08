import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { signupSchema } from "@/lib/validations";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  User,
  Mail,
  Phone,
  Lock,
  Gift,
  UserPlus,
  ArrowRight,
} from "lucide-react";

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
  const returnUrl = searchParams.get("returnUrl") || "/onboarding";
  const refCode = searchParams.get("ref") || "";
  const [referralCode, setReferralCode] = useState(refCode);

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
            referred_by_code: referralCode
              ? referralCode.trim().toUpperCase()
              : undefined,
          },
        },
      });

      if (error) {
        const msg = (error.message || "").toLowerCase();

        if (
          msg.includes("already registered") ||
          msg.includes("user already")
        ) {
          toast.error(
            "This email is already registered. Please sign in instead."
          );
        } else {
          toast.error(error.message || "Signup failed. Please try again.");
        }

        return;
      }

      if (data.user) {
        if (countryCode || phoneNumber) {
          await supabase
            .from("profiles")
            .update({
              country_code: countryCode || null,
              phone_number: phoneNumber || null,
            })
            .eq("id", data.user.id);
        }

        if (data.session) {
          toast.success("Account created! Welcome aboard 🎉");
          navigate(returnUrl);
        } else {
          toast.success("Account created! Please confirm your email.");

          navigate(
            `/login${
              returnUrl !== "/onboarding"
                ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                : ""
            }`
          );
        }
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 relative overflow-hidden bg-background">

      {/* Soft background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
      </div>

      {/* Signup Card */}
      <div className="relative z-10 w-full max-w-[400px]">

        <div className="overflow-hidden rounded-[26px] border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">

          {/* Top accent */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

          {/* Header */}
          <div className="px-7 pt-6 pb-3 text-center">

            <div className="mx-auto mb-3 relative w-fit">
              <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-lg" />

              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
                <UserPlus className="h-5.5 w-5.5 text-primary" />
              </div>
            </div>

            <h1 className="text-[24px] font-bold tracking-tight">
              Create Account
            </h1>

            <p className="mt-1 text-xs text-muted-foreground">
              Join VIP Gold Signals today
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSignup}
            className="space-y-3.5 px-7 pb-6 pt-4"
          >

            {/* Full Name */}
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                required
                className="h-10.5 rounded-xl border-border/70 bg-background/50 pl-10 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {/* Email */}
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
                className="h-10.5 rounded-xl border-border/70 bg-background/50 pl-10 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {/* Phone */}
            <div className="flex gap-2.5">
              <div className="relative w-[92px] shrink-0">
                <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />

                <Input
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="+1"
                  className="h-10.5 rounded-xl border-border/70 bg-background/50 pl-8 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>

              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Phone number"
                className="h-10.5 rounded-xl border-border/70 bg-background/50 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create password"
                required
                className="h-10.5 rounded-xl border-border/70 bg-background/50 pl-10 text-sm focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            {/* Referral */}
            <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <Gift className="h-3.5 w-3.5 text-primary" />

                <span className="text-[11px] font-medium text-foreground/80">
                  Referral code
                </span>

                <span className="text-[10px] text-muted-foreground">
                  Optional · +3 free days
                </span>
              </div>

              <Input
                value={referralCode}
                onChange={(e) =>
                  setReferralCode(e.target.value.toUpperCase())
                }
                placeholder="ABC12345"
                maxLength={12}
                className="h-9.5 rounded-lg border-border/60 bg-background/60 text-xs uppercase tracking-wider font-mono"
              />
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2.5 pt-0.5">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) =>
                  setTermsAccepted(checked === true)
                }
                className="mt-0.5 h-4 w-4 rounded border-border"
              />

              <label
                htmlFor="terms"
                className="text-[11px] leading-[17px] text-muted-foreground cursor-pointer"
              >
                I agree to the{" "}
                <a
                  href="/terms"
                  className="font-medium text-primary hover:underline"
                >
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="font-medium text-primary hover:underline"
                >
                  Privacy Policy
                </a>
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="group h-10.5 w-full rounded-xl font-semibold shadow-lg shadow-primary/10 transition-all hover:-translate-y-[1px] hover:shadow-primary/20"
            >
              <span>
                {loading ? "Creating Account..." : "Create Account"}
              </span>

              {!loading && (
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>

            {/* Login */}
            <p className="pt-0.5 text-center text-xs text-muted-foreground">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-semibold text-primary hover:text-primary/80 hover:underline"
              >
                Sign in
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Signup;
