import { useState, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { MT5CopierBanner } from "@/components/MT5CopierBanner";
import { SpecialOfferBanner } from "@/components/SpecialOfferBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, 
  Shield, 
  Clock, 
  MessageCircle, 
  FileText, 
  Wallet,
  BarChart3,
  CheckCircle2,
  Send,
  Link2,
  Settings2,
  DollarSign,
  Zap,
  Crown,
  Star
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { z } from "zod";

const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  whatsapp: z.string().regex(/^\+\d{1,4}\d{6,14}$/, "Enter a valid WhatsApp number with your own country code (e.g., +447911..., +1415..., +9198..., +92300...)"),
  telegram_username: z.string()
    .transform((v) => v.replace(/^@/, "").trim())
    .refine((v) => v.length >= 5 && v.length <= 32, "Telegram username must be 5-32 characters")
    .refine((v) => /^[a-zA-Z0-9_]+$/.test(v), "Telegram username can only contain letters, numbers and underscores"),
  email: z.string().email("Enter valid email address"),
  preferred_broker: z.string().min(2, "Enter your preferred broker"),
  platform_type: z.string().min(1, "Select platform type"),
  broker_server: z.string().min(2, "Enter broker server"),
  trading_login: z.string().regex(/^\d+$/, "Login must contain only numbers"),
  trading_password: z.string().min(4, "Password must be at least 4 characters"),
  account_size: z.string().min(1, "Select an account size"),
});

const plans = [
  {
    title: "Starter Plan",
    amount: "$100",
    profitSharing: "50 / 50",
    dailyReturn: "Up to 45%",
    color: "from-blue-500/15 to-cyan-500/15 text-blue-500 dark:text-blue-400",
    icon: Wallet,
    features: ["Hybrid AI + Manual", "Daily Reports", "Low-Risk Settings"]
  },
  {
    title: "Growth Plan",
    amount: "$1,000",
    profitSharing: "40 / 60",
    dailyReturn: "Up to 35%",
    color: "from-emerald-500/15 to-green-500/15 text-emerald-500 dark:text-emerald-400",
    icon: TrendingUp,
    popular: true,
    features: ["Advanced Risk Control", "Dedicated Support", "Verified Reports"]
  },
  {
    title: "Pro Trader",
    amount: "$10,000",
    profitSharing: "30 / 70",
    dailyReturn: "Up to 25%",
    color: "from-purple-500/15 to-violet-500/15 text-purple-500 dark:text-purple-400",
    icon: Crown,
    features: ["VIP Trading Mode", "Smart Lot Optimization", "Auto-Risk Protection"]
  },
  {
    title: "Institutional",
    amount: "$50,000",
    profitSharing: "20 / 80",
    dailyReturn: "Up to 16%",
    color: "from-amber-500/15 to-orange-500/15 text-amber-500 dark:text-amber-400",
    icon: Star,
    features: ["Private Client Manager", "Highest Capital Protection", "Priority Payouts"]
  }
];

const steps = [
  { icon: Link2, title: "Connect Account", desc: "Link securely via MT4/MT5" },
  { icon: Settings2, title: "Expert Management", desc: "AI + Manual trade execution" },
  { icon: DollarSign, title: "Get Profits", desc: "Regular profit distribution" }
];

const AccountManagement = () => {
  const [formData, setFormData] = useState({
    name: "", whatsapp: "", telegram_username: "", email: "", preferred_broker: "",
    platform_type: "", broker_server: "", trading_login: "",
    trading_password: "", account_size: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSlide, setActiveSlide] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (sliderRef.current) {
      const scrollLeft = sliderRef.current.scrollLeft;
      const cardWidth = sliderRef.current.offsetWidth * 0.75;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveSlide(Math.min(index, plans.length - 1));
    }
  };

  const { data: performanceData } = useQuery({
    queryKey: ['account-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_performance')
        .select('*')
        .eq('is_published', true)
        .order('date', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const validated = applicationSchema.parse(formData);
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('account_management_applications')
        .insert([validated]);

      if (error) throw error;

      supabase.functions
        .invoke('account-management-notify', { body: validated })
        .catch((err) => console.error('Notify failed:', err));

      toast.success("Application submitted successfully!", {
        description: "We'll contact you on WhatsApp shortly."
      });
      
      setFormData({
        name: "", whatsapp: "", telegram_username: "", email: "", preferred_broker: "",
        platform_type: "", broker_server: "", trading_login: "",
        trading_password: "", account_size: ""
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach(e => {
          if (e.path[0]) fieldErrors[e.path[0].toString()] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error("Failed to submit application");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 selection:bg-emerald-500/20 pb-16">
      <Header />
      
      <main className="container mx-auto px-4 py-4 space-y-8">
        <MT5CopierBanner />
        <SpecialOfferBanner page="account" />

        {/* Hero Section */}
        <section className="text-center space-y-3 py-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold tracking-wide uppercase">
            <Zap className="h-3.5 w-3.5 animate-pulse" />
            Institutional Grade PAMM / Copier Service
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
            Professional <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">Account Management</span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-xs md:text-sm max-w-lg mx-auto">
            Hands-free verified trading managed by elite professionals with strict risk parameters.
          </p>
        </section>

        {/* Strategy & Quick Trust Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md md:col-span-2 p-4 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">Hybrid AI + Manual Edge</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Our core strategy blends lightning-fast AI pattern detection with institutional price-action analysis to secure high-probability setups with optimized drawdowns.
            </p>
          </Card>

          <Card className="border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/60 backdrop-blur-md p-4 flex flex-col justify-center space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Win Rate</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-base">98%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Active Investors</span>
              <span className="font-bold text-primary text-base">500+</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Managed</span>
              <span className="font-bold text-amber-500 text-base">$2M+</span>
            </div>
          </Card>
        </div>

        {/* Investment Tiers - Taller & Slideable with Pagination Dots */}
        <section className="space-y-3">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-1">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Investment Tiers</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Swipe horizontally to explore packages</p>
            </div>
          </div>

          {/* Slider Container */}
          <div 
            ref={sliderRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 pt-1 px-1 no-scrollbar md:grid md:grid-cols-2 lg:grid-cols-4"
          >
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <div 
                  key={index}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, account_size: plan.amount }));
                    document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={cn(
                    "relative min-w-[285px] sm:min-w-[300px] md:min-w-0 min-h-[385px] snap-center rounded-2xl p-5 cursor-pointer transition-all duration-300 flex flex-col justify-between shadow-md",
                    "bg-white dark:bg-slate-900/80 border backdrop-blur-md",
                    "hover:border-emerald-500/50 hover:shadow-lg hover:-translate-y-1",
                    plan.popular 
                      ? "border-emerald-500/60 ring-2 ring-emerald-500/25 shadow-emerald-500/10" 
                      : "border-slate-200 dark:border-slate-800/80"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[10px] px-3 py-0.5 shadow-sm">
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("p-2.5 rounded-xl bg-gradient-to-br", plan.color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{plan.title}</span>
                    </div>

                    <div className="mb-4">
                      <div className="text-3xl font-black tracking-tight">{plan.amount}</div>
                    </div>

                    <div className="space-y-2.5 py-3 border-y border-slate-100 dark:border-slate-800/80 mb-4 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Profit Split</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{plan.profitSharing}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Target Return</span>
                        <span className="font-bold">{plan.dailyReturn}</span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Attractive Button */}
                  <Button 
                    size="sm" 
                    className="w-full text-xs font-bold py-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-md shadow-emerald-500/25 border border-emerald-400/30"
                  >
                    Select Plan
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Swipe Indicator Dots (Mobile Only) */}
          <div className="flex justify-center items-center gap-1.5 pt-1 md:hidden">
            {plans.map((_, idx) => (
              <span
                key={idx}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  activeSlide === idx ? "w-6 bg-emerald-500" : "w-1.5 bg-slate-300 dark:bg-slate-700"
                )}
              />
            ))}
          </div>
        </section>

        {/* Seamless Onboarding */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-center">Seamless Onboarding</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              return (
                <div key={idx} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <StepIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-primary mb-0.5">Step 0{idx + 1}</div>
                    <div className="font-bold text-xs">{step.title}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{step.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Application Form */}
        <section id="apply-form" className="max-w-xl mx-auto pt-2 scroll-mt-20">
          <Card className="border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-xl">
            <CardHeader className="text-center pb-1">
              <CardTitle className="text-lg font-bold">Secure Your Allocation</CardTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400">Submit your trading account details for connection review</p>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                    />
                    {errors.name && <p className="text-[10px] text-destructive">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-1">
                    <Label className="text-xs">WhatsApp Number <span className="text-red-500">*</span></Label>
                    <Input
                      placeholder="e.g., +447911123456"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                    />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      Use your own country code — e.g. +44 (UK), +1 (US/Canada), +91 (India),
                      +92 (Pakistan). Don't just enter +92 if that isn't your country.
                    </p>
                    {errors.whatsapp && <p className="text-[10px] text-destructive">{errors.whatsapp}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Telegram Username <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g., @aliraza"
                    value={formData.telegram_username}
                    onChange={(e) => setFormData({ ...formData, telegram_username: e.target.value })}
                    className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                  />
                  {errors.telegram_username && <p className="text-[10px] text-destructive">{errors.telegram_username}</p>}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                  />
                  {errors.email && <p className="text-[10px] text-destructive">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Preferred Broker</Label>
                    <Input
                      placeholder="Exness / XM / IC Markets"
                      value={formData.preferred_broker}
                      onChange={(e) => setFormData({ ...formData, preferred_broker: e.target.value })}
                      className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                    />
                    {errors.preferred_broker && <p className="text-[10px] text-destructive">{errors.preferred_broker}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Platform Type</Label>
                    <Select value={formData.platform_type} onValueChange={(v) => setFormData({ ...formData, platform_type: v })}>
                      <SelectTrigger className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MT4">MT4</SelectItem>
                        <SelectItem value="MT5">MT5</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.platform_type && <p className="text-[10px] text-destructive">{errors.platform_type}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Broker Server Name</Label>
                  <Input
                    placeholder="e.g., Exness-Real11"
                    value={formData.broker_server}
                    onChange={(e) => setFormData({ ...formData, broker_server: e.target.value })}
                    className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                  />
                  {errors.broker_server && <p className="text-[10px] text-destructive">{errors.broker_server}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Trading Login (ID)</Label>
                    <Input
                      placeholder="8373738"
                      value={formData.trading_login}
                      onChange={(e) => setFormData({ ...formData, trading_login: e.target.value.replace(/\D/g, '') })}
                      className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                    />
                    {errors.trading_login && <p className="text-[10px] text-destructive">{errors.trading_login}</p>}
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Trading Password</Label>
                    <Input
                      type="password"
                      placeholder="Investor/Master Password"
                      value={formData.trading_password}
                      onChange={(e) => setFormData({ ...formData, trading_password: e.target.value })}
                      className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50"
                    />
                    {errors.trading_password && <p className="text-[10px] text-destructive">{errors.trading_password}</p>}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Selected Account Tier Size</Label>
                  <Select value={formData.account_size} onValueChange={(v) => setFormData({ ...formData, account_size: v })}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50/50 dark:bg-slate-950/50">
                      <SelectValue placeholder="Select Account Size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="$100">$100 (Starter)</SelectItem>
                      <SelectItem value="$1,000">$1,000 (Growth)</SelectItem>
                      <SelectItem value="$10,000">$10,000 (Pro)</SelectItem>
                      <SelectItem value="$50,000">$50,000 (Institutional)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.account_size && <p className="text-[10px] text-destructive">{errors.account_size}</p>}
                </div>

                <Button type="submit" className="w-full mt-2 h-9 text-xs font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:to-cyan-700 text-white shadow-lg shadow-emerald-500/25" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting Application..." : (
                    <>
                      <Send className="h-3.5 w-3.5 mr-2" />
                      Submit Application Now
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Trust Badges */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5 py-2">
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <Shield className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">Secure Capital</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Protected Strategy</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">24/7 Monitoring</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Active Risk Control</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <MessageCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">WhatsApp Alerts</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Real-time Trade Logs</div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 shadow-sm">
            <FileText className="h-4 w-4 text-emerald-500 shrink-0" />
            <div>
              <div className="font-semibold text-xs">Full Transparency</div>
              <div className="text-[9px] text-slate-500 dark:text-slate-400">Verified Statements</div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default AccountManagement;
