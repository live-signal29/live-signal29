import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn } from "lucide-react";
import { loginSchema } from "@/lib/validations";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  
  // Get return URL from query params
  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get('returnUrl') || '/onboarding';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate input
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
        // Map common errors to user-friendly messages
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
        
        // Track login event asynchronously (non-blocking)
        supabase.from('user_login_history').insert({
          user_id: data.session.user.id,
          ip_address: null,
          user_agent: navigator.userAgent,
          device_type: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 
                   navigator.userAgent.includes('Firefox') ? 'Firefox' : 
                   navigator.userAgent.includes('Safari') ? 'Safari' : 'Other'
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
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${returnUrl}`,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message || "Google login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <Card className="glass-card w-full max-w-md animate-fade-in shadow-2xl border-primary/10 relative z-10 rounded-3xl">
        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto mb-2 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-500 animate-pulse"></div>
            <div className="relative p-4 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 w-fit mx-auto transform group-hover:scale-110 transition-transform duration-500">
              <LogIn className="h-10 w-10 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
              Welcome Back
            </CardTitle>
            <p className="text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Sign in to your account
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
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
            <div className="space-y-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="transition-all duration-300 focus:scale-[1.02] focus:shadow-lg focus:shadow-primary/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full btn-glow relative overflow-hidden group animate-fade-in transform hover:scale-[1.02] transition-all duration-300" 
              disabled={loading}
              style={{ animationDelay: '0.5s' }}
            >
              <span className="relative z-10">{loading ? "Signing in..." : "Sign In"}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            </Button>

            <div className="relative animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full group hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 animate-fade-in"
              onClick={handleGoogleLogin}
              style={{ animationDelay: '0.7s' }}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
              <span className="group-hover:scale-110 transition-transform duration-300 inline-block">Sign in with Google</span>
            </Button>

            <p className="text-center text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.8s' }}>
              Don't have an account?{" "}
              <a href="/signup" className="text-primary hover:underline font-semibold transition-all hover:text-primary/80">
                Sign up
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
