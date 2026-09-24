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
const [fullName, setFullName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [showPassword, setShowPassword] = useState(false);
const [termsAccepted, setTermsAccepted] = useState(false);
const [loading, setLoading] = useState(false);

const navigate = useNavigate();

const searchParams = new URLSearchParams(window.location.search);
const returnUrl = searchParams.get("returnUrl") || "/onboarding";

// Password rules
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
label: "Contains special character (@$!%?&)",
valid: /[@$!%?&]/.test(password),
},
{
label: "Uppercase & Lowercase letter",
valid: /[a-z]/.test(password) && /[A-Z]/.test(password),
},
];

const handleSignup = async (e: React.FormEvent) => {
e.preventDefault();

const cleanName = fullName.trim();

const validation = signupSchema.safeParse({
  fullName: cleanName,
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

        // Keep metadata compatible with existing profiles
        first_name: cleanName,
        last_name: "",

        terms_accepted: validation.data.termsAccepted,
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
      toast.error(
        error.message || "Signup failed. Please try again."
      );
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
  toast.error(
    "An unexpected error occurred. Please try again."
  );
} finally {
  setLoading(false);
}

};

const handleOAuthSignup = async (
provider: "google" | "apple"
) => {
try {
const { error } = await supabase.auth.signInWithOAuth({
provider,

    options: {
      redirectTo: `${window.location.origin}${returnUrl}`,
    },
  });

  if (error) throw error;
} catch (error: any) {
  toast.error(
    error.message || `${provider} signup failed`
  );
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

  {/* Dark Theme Background */}
  <div
    className="
      pointer-events-none
      absolute
      inset-0
      opacity-0
      dark:opacity-100
      transition-opacity
      duration-300
      bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.05),transparent_35%)]
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
      dark:shadow-black/30

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
          dark:hover:bg-slate-800/70
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
        Create an Account
      </h1>

      <p
        className="
          text-slate-500
          dark:text-slate-400

          text-xs
          mt-1
        "
      >
        Fill in your details to get started with us
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

      <Link
        to={`/login${
          returnUrl !== "/onboarding"
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
        Log In
      </Link>

      <button
        type="button"
        className="
          py-2.5
          text-xs
          font-bold
          rounded-lg

          bg-amber-400
          hover:bg-amber-300

          text-slate-950

          shadow-md
        "
      >
        Sign Up
      </button>

    </div>

    {/* Form */}
    <form
      onSubmit={handleSignup}
      className="space-y-4"
    >

      {/* Full Name */}
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
          Full Name
        </label>

        <Input
          type="text"
          placeholder="John Doe"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          className="
            w-full
            h-11

            bg-slate-50
            dark:bg-[#0b0f19]

            border
            border-slate-200
            dark:border-slate-800

            focus:border-amber-400
            focus-visible:ring-0

            text-slate-900
            dark:text-white

            text-sm
            rounded-xl
            px-4

            placeholder:text-slate-400
            dark:placeholder:text-slate-600

            transition
          "
        />

      </div>

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
            h-11

            bg-slate-50
            dark:bg-[#0b0f19]

            border
            border-slate-200
            dark:border-slate-800

            focus:border-amber-400
            focus-visible:ring-0

            text-slate-900
            dark:text-white

            text-sm
            rounded-xl
            px-4

            placeholder:text-slate-400
            dark:placeholder:text-slate-600

            transition
          "
        />

      </div>

      {/* Password */}
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
          Password
        </label>

        <div className="relative">

          <Input
            type={showPassword ? "text" : "password"}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
            className="
              w-full
              h-11

              bg-slate-50
              dark:bg-[#0b0f19]

              border
              border-slate-200
              dark:border-slate-800

              focus:border-amber-400
              focus-visible:ring-0

              text-slate-900
              dark:text-white

              text-sm
              rounded-xl
              px-4
              pr-11

              placeholder:text-slate-400
              dark:placeholder:text-slate-600

              transition
            "
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(!showPassword)
            }
            className="
              absolute
              right-3.5
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

        {/* Password Instructions */}
        <div
          className="
            mt-2.5
            p-3

            bg-slate-50
            dark:bg-[#0b0f19]

            rounded-xl

            border
            border-slate-200
            dark:border-slate-800

            space-y-2
            text-[10px]
          "
        >

          {passwordRules.map((rule, index) => (
            <div
              key={index}
              className={`
                flex
                items-center
                gap-2
                transition-colors
                duration-200
                ${
                  rule.valid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 dark:text-slate-500"
                }
              `}
            >

              {rule.valid ? (
                <Check
                  className="
                    h-3.5
                    w-3.5
                    shrink-0
                    text-emerald-500
                    dark:text-emerald-400
                  "
                />
              ) : (
                <X
                  className="
                    h-3.5
                    w-3.5
                    shrink-0
                    text-slate-300
                    dark:text-slate-600
                  "
                />
              )}

              <span>
                {rule.label}
              </span>

            </div>
          ))}

        </div>

      </div>

      {/* Terms */}
      <div className="flex items-start gap-2.5 pt-1">

        <Checkbox
          id="terms"
          checked={termsAccepted}
          onCheckedChange={(checked) =>
            setTermsAccepted(checked === true)
          }
          className="
            mt-0.5
            h-4
            w-4

            border-slate-300
            dark:border-slate-700

            data-[state=checked]:bg-amber-400
            data-[state=checked]:border-amber-400
            data-[state=checked]:text-slate-950

            rounded
          "
        />

        <label
          htmlFor="terms"
          className="
            text-[10px]

            text-slate-500
            dark:text-slate-400

            leading-relaxed
            cursor-pointer
          "
        >
          I agree to the{" "}

          <span className="text-amber-500 dark:text-amber-400 hover:underline">
            Terms of Service
          </span>{" "}
          and{" "}

          <span className="text-amber-500 dark:text-amber-400 hover:underline">
            Privacy Policy
          </span>
          .
        </label>

      </div>

      {/* Register Button */}
      <Button
        type="submit"
        disabled={loading}
        className="
          w-full
          h-12

          bg-amber-400
          hover:bg-amber-300

          text-slate-950
          font-bold

          rounded-xl
          text-sm

          transition
          duration-200

          shadow-lg
          shadow-amber-400/20

          mt-2
        "
      >
        {loading
          ? "Creating Account..."
          : "Register"}
      </Button>

    </form>

    {/* Divider */}
    <div className="relative my-6 text-center">

      <div className="absolute inset-0 flex items-center">
        <div
          className="
            w-full
            border-t
            border-slate-200
            dark:border-slate-800
          "
        />
      </div>

      <span
        className="
          relative

          bg-white
          dark:bg-[#131926]

          px-3

          text-[11px]

          text-slate-400
          dark:text-slate-500

          uppercase
          tracking-wider
          font-semibold
        "
      >
        Or register with
      </span>

    </div>

    {/* Social Login */}
    <div className="grid grid-cols-2 gap-3">

      {/* Google */}
      <button
        type="button"
        onClick={() =>
          handleOAuthSignup("google")
        }
        className="
          flex
          items-center
          justify-center
          gap-2

          bg-slate-50
          hover:bg-slate-100

          dark:bg-[#0b0f19]
          dark:hover:bg-slate-800/80

          border
          border-slate-200
          dark:border-slate-800

          py-3
          rounded-xl

          text-xs
          font-semibold

          text-slate-700
          dark:text-slate-200

          transition
        "
      >

        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
        >
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
            d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1-3.7 1-2.8 0-5.2-1.9-6.1-4.5L2.2 17C4 20.5 7.7 23 12 23z"
          />
        </svg>

        Google

      </button>

      {/* Apple */}
      <button
        type="button"
        onClick={() =>
          handleOAuthSignup("apple")
        }
        className="
          flex
          items-center
          justify-center
          gap-2

          bg-slate-50
          hover:bg-slate-100

          dark:bg-[#0b0f19]
          dark:hover:bg-slate-800/80

          border
          border-slate-200
          dark:border-slate-800

          py-3
          rounded-xl

          text-xs
          font-semibold

          text-slate-700
          dark:text-slate-200

          transition
        "
      >

        <svg
          className="h-4 w-4 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.16-.57 2.81-1.37z" />
        </svg>

        Apple

      </button>

    </div>

    {/* Login */}
    <div className="text-center pt-5 pb-1 text-xs">

      <p
        className="
          text-slate-500
          dark:text-slate-300
        "
      >
        Already have an account?{" "}

        <Link
          to={`/login${
            returnUrl !== "/onboarding"
              ? `?returnUrl=${encodeURIComponent(returnUrl)}`
              : ""
          }`}
          className="
            text-amber-500
            dark:text-amber-400

            font-semibold
            hover:underline
          "
        >
          Log In
        </Link>

      </p>

    </div>

  </div>
</div>

);
};

export default Signup;
