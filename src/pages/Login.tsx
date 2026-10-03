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

    // Track login history
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      const ua = navigator.userAgent;
      await supabase.from("user_login_history").insert({
        user_id: userData.user.id,
        device_type: /Mobi|Android|iPhone/i.test(ua)
          ? "mobile"
          : "desktop",
        browser: ua,
      });
    }

    navigate(returnUrl);
  }
} catch {
  toast.error("Failed to sign in. Please try again.");
} finally {
  setLoading(false);
}

};

return (
<div
className="
min-h-screen
flex
items-center
justify-center
p-4
font-sans
text-slate-900
dark:text-slate-100

    bg-white
    dark:bg-[#0b0f19]

    relative
    overflow-hidden
  "
>
  {/* Light Theme Soft Blue + Green Background */}
  <div
    className="
      pointer-events-none
      absolute
      inset-0
      opacity-100
      dark:opacity-0
      transition-opacity
      duration-300

      bg-[radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_85%_75%,rgba(16,185,129,0.13),transparent_32%),linear-gradient(135deg,#f8fbff_0%,#f5fbfa_50%,#ffffff_100%)]
    "
  />

  {/* Light Theme Grid */}
  <div
    className="
      pointer-events-none
      absolute
      inset-0
      opacity-[0.35]
      dark:opacity-0
      transition-opacity
      duration-300

      bg-[linear-gradient(rgba(59,130,246,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.045)_1px,transparent_1px)]
      bg-[size:32px_32px]
    "
  />

  {/* Dark Theme Background - unchanged */}
  <div
    className="
      pointer-events-none
      absolute
      inset-0
      opacity-0
      dark:opacity-100
      transition-opacity
      duration-300

      bg-[#0b0f19]
    "
  />

  {/* Premium Auth Card */}
  <div
    className="
      relative
      z-10

      w-full
      max-w-md

      bg-white/90
      dark:bg-[#131926]

      border
      border-slate-200/80
      dark:border-slate-800/80

      rounded-2xl
      p-6

      shadow-xl
      shadow-slate-900/5
      dark:shadow-2xl

      backdrop-blur-xl
      transition-colors
      duration-300
    "
  >
    {/* Header */}
    <div className="flex justify-between items-center mb-6">

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="
          text-slate-500
          hover:text-slate-900

          dark:text-slate-400
          dark:hover:text-white

          transition
          p-2
          rounded-lg

          bg-slate-100
          hover:bg-slate-200

          dark:bg-slate-800/40
        "
        aria-label="Go back"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <span
        className="
          text-xs
          font-semibold

          text-emerald-600
          dark:text-emerald-400

          bg-emerald-500/10
          border
          border-emerald-500/20

          px-3
          py-1
          rounded-full

          flex
          items-center
          gap-1.5
        "
      >
        <Globe className="h-3 w-3" />
        AUTO
      </span>
    </div>

    {/* Title */}
    <div className="text-center mb-6">

      <h1
        className="
          text-2xl
          font-bold
          tracking-tight

          text-slate-900
          dark:text-white
        "
      >
        Welcome Back
      </h1>

      <p
        className="
          text-slate-500
          dark:text-slate-400

          text-xs
          mt-1
        "
      >
        Enter your credentials to access your account
      </p>
    </div>

    {/* Login / Signup Tabs */}
    <div
      className="
        grid
        grid-cols-2

        bg-slate-100/80
        dark:bg-[#0b0f19]

        p-1
        rounded-xl
        mb-6

        border
        border-slate-200
        dark:border-slate-800
      "
    >

      <button
        type="button"
        className="
          py-2.5
          text-xs
          font-bold
          rounded-lg

          bg-blue-600
          text-white

          shadow-md
        "
      >
        Log In
      </button>

      <Link
        to={`/signup${
          returnUrl !== "/"
            ? `?returnUrl=${encodeURIComponent(returnUrl)}`
            : ""
        }`}
        className="
          py-2.5
          text-xs
          font-bold

          text-slate-500
          hover:text-slate-800

          dark:text-slate-400
          dark:hover:text-slate-200

          rounded-lg
          transition-all
          duration-200
          text-center
        "
      >
        Sign Up
      </Link>

    </div>

    {/* Form */}
    <form onSubmit={handleLogin} className="space-y-4">

      {/* Email */}
      <div>

        <label
          className="
            block
            text-xs

            text-slate-600
            dark:text-slate-300

            mb-1
            font-medium
          "
        >
          Email
        </label>

        <Input
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="
            w-full
            h-12

            bg-slate-50
            dark:bg-[#0b0f19]

            border
            border-slate-200
            dark:border-slate-800

            focus:border-blue-500
            focus-visible:ring-0

            text-slate-900
            dark:text-white

            text-sm
            rounded-xl
            px-4
            outline-none

            transition

            placeholder:text-slate-400
            dark:placeholder:text-slate-600
          "
        />

      </div>

      {/* Password */}
      <div>

        <div className="flex justify-between items-center mb-1">

          <label
            className="
              block
              text-xs
              text-slate-600
              dark:text-slate-300
              font-medium
            "
          >
            Password
          </label>

          <Link
            to="/forgot-password"
            className="
              text-xs
              text-blue-500
              dark:text-blue-400
              hover:underline
            "
          >
            Forgot password?
          </Link>

        </div>

        <div className="relative">

          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="
              w-full
              h-12

              bg-slate-50
              dark:bg-[#0b0f19]

              border
              border-slate-200
              dark:border-slate-800

              focus:border-blue-500
              focus-visible:ring-0

              text-slate-900
              dark:text-white

              text-sm
              rounded-xl
              px-4
              pr-11
              outline-none

              transition

              placeholder:text-slate-400
              dark:placeholder:text-slate-600
            "
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2

              text-slate-400
              hover:text-slate-600

              dark:text-slate-500
              dark:hover:text-slate-300

              transition
            "
            aria-label={
              showPassword
                ? "Hide password"
                : "Show password"
            }
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
        className="
          w-full
          h-12

          bg-blue-600
          hover:bg-blue-500

          text-white
          font-bold

          rounded-xl
          text-sm

          transition
          duration-200

          shadow-lg
          shadow-blue-600/20

          mt-2
        "
      >
        {loading ? "Logging in..." : "Log In"}
      </Button>

    </form>

    <div className="pt-4" />

    {/* Register */}
    <div className="text-center pt-5 pb-1 text-xs">

      <p
        className="
          text-slate-500
          dark:text-slate-300
        "
      >
        Don't have an account?{" "}

        <Link
          to={`/signup${
            returnUrl !== "/"
              ? `?returnUrl=${encodeURIComponent(returnUrl)}`
              : ""
          }`}
          className="
            text-blue-500
            dark:text-blue-400

            font-semibold
            hover:underline
          "
        >
          Sign Up
        </Link>

      </p>

    </div>

  </div>
</div>

);
};

export default Login;
