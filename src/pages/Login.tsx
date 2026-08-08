import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, Mail, Lock, ArrowRight } from "lucide-react";
import { loginSchema } from "@/lib/validations";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get("returnUrl") || "/onboarding";
  const reason = searchParams.get("reason");

  useEffect(() => {
    if (reason === "deleted") {
      toast.error("This email is not registered. Please sign up again.");
    }
  }, [reason]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = loginSchema.safeParse({ email, password });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: validation.data.email,
        password: validation.data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error("Login failed. Please try again.");
        }
        return;
      }

      if (data.session) {
        toast.success("Login successful!");
        navigate(returnUrl);

        supabase.from("user_login_history").insert({
          user_id: data.session.user.id,
          ip_address: null,
          user_agent: navigator.userAgent,
          device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent)
            ? "Mobile"
            : "Desktop",
          browser: navigator.userAgent.includes("Chrome")
            ? "Chrome"
            : navigator.userAgent.includes("Firefox")
            ? "Firefox"
            : navigator.userAgent.includes("Safari")
            ? "Safari"
            : "Other",
        });
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${returnUrl}`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden bg-background">

      {/* Soft background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-primary/10 blur-[90px]" />
        <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full bg-accent/10 blur-[90px]" />
      </div>

      {/* Login Card */}
      <Card className="relative z-10 w-full max-w-[390px] overflow-hidden rounded-[26px] border border-border/60 bg-card/90 shadow-2xl backdrop-blur-xl">

        {/* Top accent */}
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />

        <CardHeader className="px-7 pb-3 pt-7 text-center">

          {/* Small Logo */}
          <div className="mx-auto mb-4 relative w-fit">
            <div className="absolute inset-0 rounded-2xl bg-primary/25 blur-lg" />

            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
              <LogIn className="h-6 w-6 text-primary" />
            </div>
          </div>

          <CardTitle className="text-[25px] font-bold tracking-tight">
            Welcome Back
          </CardTitle>

          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to continue to your account
          </p>
        </CardHeader>

        <CardContent className="px-7 pb-7 pt-4">

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-foreground/80"
              >
                Email address
              </Label>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/70 bg-background/50 pl-10 text-sm transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-foreground/80"
              >
                Password
              </Label>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl border-border/70 bg-background/50 pl-10 text-sm transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
                />
              </div>
            </div>

            {/* Sign In */}
            <Button
              type="submit"
              disabled={loading}
              className="group h-11 w-full rounded-xl font-semibold shadow-lg shadow-primary/10 transition-all hover:-translate-y-[1px] hover:shadow-primary/20"
            >
              <span>
                {loading ? "Signing in..." : "Sign In"}
              </span>

              {!loading && (
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                OR
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              className="h-11 w-full rounded-xl border-border/70 bg-background/40 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
            >
              <svg
                className="mr-2.5 h-[17px] w-[17px]"
                viewBox="0 0 24 24"
              >
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

              Continue with Google
            </Button>

            {/* Signup */}
            <p className="pt-1 text-center text-xs text-muted-foreground">
              Don't have an account?{" "}
              <a
                href="/signup"
                className="font-semibold text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                Create account
              </a>
            </p>

          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
