import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Globe, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully!");
        navigate(returnUrl);
      }
    } catch {
      toast.error("Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    if (provider === "google") setGoogleLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) toast.error(error.message);
    } catch {
      toast.error(`Failed to connect with ${provider}.`);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col px-5 py-5 font-sans relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-0 left-0 w-[280px] h-[280px] bg-blue-900/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-indigo-950/30 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between z-10 mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white transition-colors p-2 rounded-xl bg-slate-900/60 border border-slate-800/60"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <h1 className="text-xl font-bold tracking-tight text-white">Login</h1>

        <button
          type="button"
          className="flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full font-semibold text-[10px] tracking-wider uppercase"
        >
          <Globe className="h-3 w-3" />
          AUTO
        </button>
      </div>

      {/* Login Main Container */}
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col justify-center z-10">
        <!-- Welcoming Text -->
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h2>
          <p className="text-slate-400 text-xs mt-1">
            Enter your credentials to access your account
          </p>
        </div>

        <!-- Segmented Tab Switcher -->
        <div className="grid grid-cols-2 bg-[#080b13] p-1 rounded-xl mb-6 border border-slate-800/80">
          <button
            type="button"
            className="py-2.5 text-xs font-bold rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/20 transition-all"
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() =>
              navigate(
                `/signup${
                  returnUrl !== "/"
                    ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                    : ""
                }`
              )
            }
            className="py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 transition-all"
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div className="relative pt-1">
            <label className="absolute -top-1 left-3 text-[11px] text-blue-400 bg-[#0b0f19] px-1 z-10 font-semibold tracking-wide">
              Email
            </label>
            <Input
              type="email"
              placeholder="e.g., mail@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12 bg-[#080b13] border border-slate-800 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/30 rounded-xl text-white text-sm placeholder:text-slate-600 transition-all"
            />
          </div>

          {/* Password */}
          <div className="relative pt-1">
            <label className="absolute -top-1 left-3 text-[11px] text-blue-400 bg-[#0b0f19] px-1 z-10 font-semibold tracking-wide">
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-12 bg-[#080b13] border border-slate-800 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500/30 rounded-xl text-white text-sm placeholder:text-slate-600 pr-11 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-blue-600/25 mt-2"
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800/80" />
          </div>
          <span className="relative bg-[#0b0f19] px-3 text-[11px] text-slate-500 font-medium tracking-wider uppercase">
            Or log in with
          </span>
        </div>

        {/* Social Login */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={googleLoading}
            onClick={() => handleOAuthLogin("google")}
            className="h-11 rounded-xl bg-[#080b13] border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            <svg className="h-4.5 w-4.5" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.4 1.7 14.9 1 12 1 7.7 1 4 3.5 2.2 7.1l3.7 2.8C6.8 7.3 9.2 5 12 5z" />
              <path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h6c-.3 1.4-1 2.5-2.2 3.3l3.6 2.8c2.1-1.9 3.2-4.7 3.2-8.1z" />
              <path fill="#FBBC05" d="M5.9 14.1c-.2-.7-.4-1.4-.4-2.1s.2-1.4.4-2.1L2.2 7.1C1.4 8.6 1 10.2 1 12s.4 3.4 1.2 4.9l3.7-2.8z" />
              <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.8 0-5.2-1.9-6.1-4.5L2.2 17C4 20.5 7.7 23 12 23z" />
            </svg>
            Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("apple")}
            className="h-11 rounded-xl bg-[#080b13] border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-2 text-xs font-semibold text-slate-200 transition-colors"
          >
            <svg className="h-4.5 w-4.5 fill-current" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.16-.57 2.81-1.37z" />
            </svg>
            Apple
          </button>
        </div>

        {/* Footer Navigation */}
        <div className="text-center pt-6 pb-2 text-xs space-y-2">
          <p className="text-slate-400">
            Don't have an account?{" "}
            <Link
              to={`/signup${
                returnUrl !== "/"
                  ? `?returnUrl=${encodeURIComponent(returnUrl)}`
                  : ""
              }`}
              className="text-amber-400 font-semibold hover:underline"
            >
              Register
            </Link>
          </p>

          <div>
            <Link
              to="/forgot-password"
              className="text-blue-400 hover:underline font-medium text-[11px]"
            >
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
