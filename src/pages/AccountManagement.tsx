import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  TrendingUp,
  Shield,
  ShieldCheck,
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
  Crown,
  Star,
  Lock,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { z } from "zod";

const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  whatsapp: z
    .string()
    .regex(/^\+\d{1,4}\d{6,14}$/, "Enter valid WhatsApp with country code (e.g., +92300...)"),
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
    id: "$100",
    tier: "Starter",
    title: "Starter Fund",
    amount: "$100",
    profitSharing: "50 / 50",
    dailyReturn: "1.5%",
    icon: Wallet,
    features: [
      "Hybrid AI + Manual Trading",
      "Daily Screenshot Reports",
      "Low-Risk Settings",
      "Easy Withdrawals",
    ],
  },
  {
    id: "$1,000",
    tier: "Professional",
    title: "Capital Growth",
    amount: "$1,000",
    profitSharing: "60 / 40",
    dailyReturn: "2.2%",
    popular: true,
    icon: TrendingUp,
    features: [
      "Advanced Risk Control",
      "Dedicated Support",
      "Daily Trade Summary",
      "Verified Performance Reports",
    ],
  },
  {
    id: "$10,000",
    tier: "Elite",
    title: "Institutional",
    amount: "$10,000",
    profitSharing: "70 / 30",
    dailyReturn: "3.0%",
    icon: Crown,
    features: [
      "VIP Trading Mode",
      "Weekly Portfolio Reports",
      "Smart Lot Optimization",
      "Auto-Risk Protection",
    ],
  },
  {
    id: "$50,000",
    tier: "Private",
    title: "Private Wealth",
    amount: "$50,000",
    profitSharing: "80 / 20",
    dailyReturn: "3.5%",
    icon: Star,
    features: [
      "Institutional Grade Strategy",
      "Private Client Manager",
      "Full Trading Journal",
      "Priority Withdrawals",
    ],
  },
];

const steps = [
  {
    icon: Link2,
    title: "Capital Allocation",
    description: "Fund your own regulated broker account. Capital never leaves your name.",
  },
  {
    icon: Settings2,
    title: "Portfolio Activation",
    description: "We link our trading engine via secure API. No withdrawal permissions granted.",
  },
  {
    icon: DollarSign,
    title: "Automated Yields",
    description: "Profits credited daily. Withdraw or compound anytime from your dashboard.",
  },
];

// Palette (Emerald Prestige) — used inline to guarantee brand color regardless of theme
const C = {
  deep: "#064e3b",
  green: "#0d7a5f",
  gold: "#c9a84c",
  cream: "#f5f0e0",
};

const AccountManagement = () => {
  const [formData, setFormData] = useState({
    name: "",
    whatsapp: "",
    email: "",
    preferred_broker: "",
    platform_type: "",
    broker_server: "",
    trading_login: "",
    trading_password: "",
    account_size: "",
  });
  const [selectedPlan, setSelectedPlan] = useState<string>("$1,000");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: performanceData } = useQuery({
    queryKey: ["account-performance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_performance")
        .select("*")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .limit(7);
      if (error) throw error;
      return data;
    },
  });

  const selectPlan = (planId: string) => {
    setSelectedPlan(planId);
    setFormData((prev) => ({ ...prev, account_size: planId }));
    document.getElementById("apply-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    try {
      const validated = applicationSchema.parse(formData);
      setIsSubmitting(true);
      const { error } = await supabase.from("account_management_applications").insert([validated]);
      if (error) throw error;
      toast.success("Application submitted successfully!", {
        description: "We'll contact you on WhatsApp shortly.",
      });
      setFormData({
        name: "",
        whatsapp: "",
        email: "",
        preferred_broker: "",
        platform_type: "",
        broker_server: "",
        trading_login: "",
        trading_password: "",
        account_size: "",
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fe: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fe[e.path[0].toString()] = e.message;
        });
        setErrors(fe);
      } else {
        toast.error("Failed to submit application");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const serif = { fontFamily: "'DM Serif Display', serif" };
  const sans = { fontFamily: "'Fira Sans', sans-serif" };

  return (
    <div className="min-h-screen" style={{ backgroundColor: C.cream, ...sans }}>
      <Header />

      <main className="max-w-[1400px] mx-auto lg:px-6 py-6">
        <div
          className="w-full bg-white lg:rounded-3xl overflow-hidden flex flex-col lg:flex-row border"
          style={{
            borderColor: `${C.deep}1a`,
            boxShadow: "0 40px 80px -15px rgba(6,78,59,0.25)",
          }}
        >
          {/* ============ LEFT: STICKY PITCH ============ */}
          <aside
            className="lg:w-[40%] p-8 md:p-12 lg:p-14 flex flex-col justify-between relative overflow-hidden lg:sticky lg:top-0 lg:self-start lg:max-h-screen"
            style={{ backgroundColor: C.deep, color: C.cream }}
          >
            {/* Decorative glow */}
            <div
              className="absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl opacity-25 pointer-events-none"
              style={{ backgroundColor: C.green }}
            />

            <div className="relative z-10 space-y-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 border text-xs font-semibold tracking-[0.2em] uppercase"
                style={{ borderColor: C.gold, color: C.gold }}
              >
                <Sparkles className="h-3 w-3" />
                Institutional Grade
              </div>

              <h1 style={serif} className="text-4xl md:text-5xl lg:text-6xl leading-[1.05]">
                Wealth Management{" "}
                <span style={{ color: C.gold }}>Redefined.</span>
              </h1>

              <p className="text-base md:text-lg leading-relaxed max-w-md" style={{ color: `${C.cream}cc` }}>
                Managed by professional traders using a hybrid AI + manual chart strategy. Safe,
                transparent, result-focused.
              </p>

              <div className="space-y-5 pt-2 border-l-2 pl-6" style={{ borderColor: `${C.gold}55` }}>
                <div>
                  <span className="block font-bold text-2xl" style={{ color: C.gold }}>
                    500+
                  </span>
                  <span className="text-xs uppercase tracking-widest" style={{ color: `${C.cream}99` }}>
                    Active Managed Accounts
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-2xl" style={{ color: C.gold }}>
                    $2M+
                  </span>
                  <span className="text-xs uppercase tracking-widest" style={{ color: `${C.cream}99` }}>
                    Total Capital Under Management
                  </span>
                </div>
                <div>
                  <span className="block font-bold text-2xl" style={{ color: C.gold }}>
                    98%
                  </span>
                  <span className="text-xs uppercase tracking-widest" style={{ color: `${C.cream}99` }}>
                    Verified Monthly Win Rate
                  </span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-10 pt-8 border-t space-y-4" style={{ borderColor: `${C.cream}1a` }}>
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center border"
                  style={{ backgroundColor: C.green, borderColor: `${C.gold}44` }}
                >
                  <ShieldCheck className="h-5 w-5" style={{ color: C.gold }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Verified Performance</p>
                  <p className="text-xs" style={{ color: `${C.cream}88` }}>
                    Third-party audited reports
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center border"
                  style={{ backgroundColor: C.green, borderColor: `${C.gold}44` }}
                >
                  <Lock className="h-5 w-5" style={{ color: C.gold }} />
                </div>
                <div>
                  <p className="font-semibold text-sm">Secure Custody</p>
                  <p className="text-xs" style={{ color: `${C.cream}88` }}>
                    Capital stays in your own broker account
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ============ RIGHT: SCROLLABLE CONTENT ============ */}
          <div className="lg:w-[60%] p-6 md:p-10 lg:p-16 space-y-20 bg-white" style={{ color: C.deep }}>
            {/* --------- PLAN PICKER --------- */}
            <section>
              <header className="mb-8">
                <h2 style={serif} className="text-3xl md:text-4xl mb-2" >
                  Select Your Tier
                </h2>
                <p className="text-sm" style={{ color: `${C.deep}99` }}>
                  Tailored structures for every stage of capital deployment. Tap a plan to apply.
                </p>
              </header>

              <div className="space-y-4">
                {plans.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.id;
                  const isPopular = plan.popular;

                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => selectPlan(plan.id)}
                      className={cn(
                        "group relative w-full text-left p-5 md:p-6 rounded-2xl transition-all duration-300",
                        "flex flex-col md:flex-row md:items-center justify-between gap-5",
                        "hover:shadow-xl hover:-translate-y-0.5",
                      )}
                      style={{
                        backgroundColor: isPopular ? C.green : isSelected ? "#ffffff" : "#fafafa",
                        border: `2px solid ${
                          isPopular ? C.gold : isSelected ? C.green : `${C.deep}14`
                        }`,
                        color: isPopular ? C.cream : C.deep,
                        boxShadow: isPopular ? "0 12px 32px -8px rgba(13,122,95,0.35)" : undefined,
                      }}
                    >
                      {isPopular && (
                        <div
                          className="absolute -top-3 left-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em]"
                          style={{ backgroundColor: C.gold, color: C.deep }}
                        >
                          ★ Most Popular
                        </div>
                      )}

                      {/* Left: icon + tier + amount */}
                      <div className="flex items-center gap-4 md:flex-1">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: isPopular ? `${C.gold}22` : `${C.green}18`,
                            color: isPopular ? C.gold : C.green,
                          }}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <div>
                          <span
                            className="text-[10px] font-bold uppercase tracking-[0.2em]"
                            style={{ color: isPopular ? C.gold : C.green }}
                          >
                            {plan.tier}
                          </span>
                          <h3 style={serif} className="text-xl md:text-2xl leading-tight">
                            {plan.title}
                          </h3>
                          <p className="text-xs mt-0.5 opacity-70">
                            Min. Deposit:{" "}
                            <span className="font-bold">{plan.amount}</span>
                          </p>
                        </div>
                      </div>

                      {/* Middle: stats */}
                      <div className="flex gap-6 md:gap-8">
                        <div>
                          <p
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: isPopular ? `${C.cream}99` : `${C.deep}66` }}
                          >
                            Profit Split
                          </p>
                          <p style={serif} className="text-lg md:text-xl">
                            {plan.profitSharing}
                          </p>
                        </div>
                        <div>
                          <p
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: isPopular ? `${C.cream}99` : `${C.deep}66` }}
                          >
                            Daily Avg
                          </p>
                          <p style={serif} className="text-lg md:text-xl">
                            {plan.dailyReturn}
                          </p>
                        </div>
                      </div>

                      {/* CTA */}
                      <div
                        className={cn(
                          "px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-widest transition-all shrink-0",
                          "group-hover:brightness-110",
                        )}
                        style={{
                          backgroundColor: isPopular ? C.gold : C.deep,
                          color: isPopular ? C.deep : C.cream,
                        }}
                      >
                        {isSelected ? "Selected ✓" : "Select"}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Feature ribbon for currently selected */}
              <div
                className="mt-6 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
                style={{ backgroundColor: `${C.green}0d`, border: `1px solid ${C.green}22` }}
              >
                {plans
                  .find((p) => p.id === selectedPlan)
                  ?.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" style={{ color: C.green }} />
                      <span style={{ color: `${C.deep}cc` }}>{f}</span>
                    </div>
                  ))}
              </div>
            </section>

            {/* --------- STRATEGY --------- */}
            <section
              className="rounded-3xl p-8 md:p-10"
              style={{ backgroundColor: `${C.deep}08`, border: `1px solid ${C.deep}14` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: C.deep, color: C.gold }}
                >
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h2 style={serif} className="text-2xl md:text-3xl">
                  Our Trading Strategy
                </h2>
              </div>
              <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: `${C.deep}b0` }}>
                We trade using a{" "}
                <span className="font-semibold" style={{ color: C.deep }}>
                  hybrid system: AI-based signals + manual chart analysis
                </span>
                . Focus on low-risk entries, strong risk management, and high-probability setups for
                stable daily growth.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-4 rounded-xl" style={{ border: `1px solid ${C.deep}0d` }}>
                  <span className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: `${C.deep}66` }}>
                    Risk per Trade
                  </span>
                  <span className="font-semibold" style={{ color: C.green }}>
                    Max 1.5% Cap
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl" style={{ border: `1px solid ${C.deep}0d` }}>
                  <span className="block text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: `${C.deep}66` }}>
                    Leverage Control
                  </span>
                  <span className="font-semibold" style={{ color: C.green }}>
                    Conservative Only
                  </span>
                </div>
              </div>
            </section>

            {/* --------- HOW IT WORKS --------- */}
            <section>
              <h2 style={serif} className="text-3xl md:text-4xl mb-8">
                Engagement Process
              </h2>
              <div className="space-y-8 relative">
                <div
                  className="absolute left-[19px] top-4 bottom-4 w-px"
                  style={{ backgroundColor: `${C.gold}55` }}
                />
                {steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={i} className="relative flex gap-5">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 z-10"
                        style={{ backgroundColor: C.deep, color: C.gold }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </div>
                      <div className="pt-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="h-4 w-4" style={{ color: C.green }} />
                          <h4 style={serif} className="text-lg md:text-xl">
                            {step.title}
                          </h4>
                        </div>
                        <p className="text-sm" style={{ color: `${C.deep}80` }}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* --------- APPLY FORM --------- */}
            <section id="apply-form">
              <h2 style={serif} className="text-3xl md:text-4xl mb-2">
                Apply Now
              </h2>
              <p className="text-sm mb-8" style={{ color: `${C.deep}99` }}>
                Fill in your details and we'll contact you on WhatsApp shortly.
              </p>

              <form
                onSubmit={handleSubmit}
                className="space-y-4 p-6 md:p-8 rounded-2xl bg-white"
                style={{ border: `1px solid ${C.deep}14`, boxShadow: "0 8px 24px -12px rgba(6,78,59,0.15)" }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      placeholder="+92300..."
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className={errors.whatsapp ? "border-destructive" : ""}
                    />
                    {errors.whatsapp && <p className="text-xs text-destructive">{errors.whatsapp}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="broker">Preferred Broker</Label>
                    <Input
                      id="broker"
                      placeholder="Exness, XM, IC Markets…"
                      value={formData.preferred_broker}
                      onChange={(e) =>
                        setFormData({ ...formData, preferred_broker: e.target.value })
                      }
                      className={errors.preferred_broker ? "border-destructive" : ""}
                    />
                    {errors.preferred_broker && (
                      <p className="text-xs text-destructive">{errors.preferred_broker}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="platform_type">Platform</Label>
                    <Select
                      value={formData.platform_type}
                      onValueChange={(v) => setFormData({ ...formData, platform_type: v })}
                    >
                      <SelectTrigger className={errors.platform_type ? "border-destructive" : ""}>
                        <SelectValue placeholder="MT4 / MT5" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="MT4">MT4</SelectItem>
                        <SelectItem value="MT5">MT5</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.platform_type && (
                      <p className="text-xs text-destructive">{errors.platform_type}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="broker_server">Broker Server</Label>
                  <Input
                    id="broker_server"
                    placeholder="e.g., server3-mt5@broker"
                    value={formData.broker_server}
                    onChange={(e) => setFormData({ ...formData, broker_server: e.target.value })}
                    className={errors.broker_server ? "border-destructive" : ""}
                  />
                  {errors.broker_server && (
                    <p className="text-xs text-destructive">{errors.broker_server}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trading_login">Trading Login</Label>
                    <Input
                      id="trading_login"
                      placeholder="e.g., 8373738"
                      value={formData.trading_login}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        setFormData({ ...formData, trading_login: v });
                      }}
                      className={errors.trading_login ? "border-destructive" : ""}
                    />
                    {errors.trading_login && (
                      <p className="text-xs text-destructive">{errors.trading_login}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trading_password">Trading Password</Label>
                    <Input
                      id="trading_password"
                      type="password"
                      placeholder="Investor password"
                      value={formData.trading_password}
                      onChange={(e) =>
                        setFormData({ ...formData, trading_password: e.target.value })
                      }
                      className={errors.trading_password ? "border-destructive" : ""}
                    />
                    {errors.trading_password && (
                      <p className="text-xs text-destructive">{errors.trading_password}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_size">Account Size</Label>
                  <Select
                    value={formData.account_size}
                    onValueChange={(v) => {
                      setFormData({ ...formData, account_size: v });
                      setSelectedPlan(v);
                    }}
                  >
                    <SelectTrigger className={errors.account_size ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select account size" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      <SelectItem value="$100">$100</SelectItem>
                      <SelectItem value="$1,000">$1,000</SelectItem>
                      <SelectItem value="$10,000">$10,000</SelectItem>
                      <SelectItem value="$50,000">$50,000</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.account_size && (
                    <p className="text-xs text-destructive">{errors.account_size}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 text-sm font-bold uppercase tracking-widest"
                  style={{ backgroundColor: C.deep, color: C.cream }}
                >
                  {isSubmitting ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </form>
            </section>

            {/* --------- LIVE PERFORMANCE --------- */}
            <section>
              <h2 style={serif} className="text-3xl md:text-4xl mb-6">
                Live Performance
              </h2>
              {performanceData && performanceData.length > 0 ? (
                <div
                  className="rounded-2xl overflow-hidden bg-white"
                  style={{ border: `1px solid ${C.deep}14` }}
                >
                  <div className="divide-y" style={{ borderColor: `${C.deep}0d` }}>
                    {performanceData.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-4"
                        style={{ borderColor: `${C.deep}0d` }}
                      >
                        <div>
                          <div className="font-semibold" style={{ color: C.deep }}>
                            {new Date(item.date).toLocaleDateString()}
                          </div>
                          <div className="text-xs" style={{ color: `${C.deep}80` }}>
                            {item.period}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold" style={{ color: C.green }}>
                            +{item.profit_percentage}%
                          </div>
                          <div className="text-xs" style={{ color: `${C.deep}80` }}>
                            {item.winning_trades}/{item.total_trades} trades
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: `${C.deep}80` }}>
                  Verified daily performance publishes here weekly.
                </p>
              )}
            </section>

            {/* --------- FAQ --------- */}
            <section>
              <h2 style={serif} className="text-3xl md:text-4xl mb-6">
                Frequently Asked
              </h2>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="q1" style={{ borderColor: `${C.deep}14` }}>
                  <AccordionTrigger className="text-left" style={{ color: C.deep }}>
                    Can I withdraw my capital any time?
                  </AccordionTrigger>
                  <AccordionContent style={{ color: `${C.deep}b0` }}>
                    Yes. Funds remain in your own broker account. You can withdraw or close
                    the API connection whenever you want.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q2" style={{ borderColor: `${C.deep}14` }}>
                  <AccordionTrigger className="text-left" style={{ color: C.deep }}>
                    How is profit split calculated?
                  </AccordionTrigger>
                  <AccordionContent style={{ color: `${C.deep}b0` }}>
                    Profit is calculated monthly on net gains. You receive your share as per
                    the tier you selected; losing months carry no fees.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q3" style={{ borderColor: `${C.deep}14` }}>
                  <AccordionTrigger className="text-left" style={{ color: C.deep }}>
                    Do you have access to withdraw my funds?
                  </AccordionTrigger>
                  <AccordionContent style={{ color: `${C.deep}b0` }}>
                    No. We use investor (read/trade only) credentials. Withdrawals are
                    always initiated by you from your broker portal.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="q4" style={{ borderColor: `${C.deep}14` }}>
                  <AccordionTrigger className="text-left" style={{ color: C.deep }}>
                    What happens during high volatility?
                  </AccordionTrigger>
                  <AccordionContent style={{ color: `${C.deep}b0` }}>
                    Our risk engine automatically reduces exposure and pauses new entries
                    when abnormal volatility is detected.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </section>

            {/* --------- TRUST FOOTER --------- */}
            <section
              className="pt-10 border-t grid grid-cols-2 md:grid-cols-4 gap-4"
              style={{ borderColor: `${C.deep}14` }}
            >
              {[
                { icon: Shield, title: "Secure Funds", sub: "In your name" },
                { icon: Clock, title: "24/7 Support", sub: "Always available" },
                { icon: MessageCircle, title: "WhatsApp", sub: "Daily reports" },
                { icon: FileText, title: "Transparent", sub: "Verified results" },
              ].map((t, i) => {
                const Icon = t.icon;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <Icon className="h-6 w-6 shrink-0" style={{ color: C.green }} />
                    <div>
                      <div className="font-semibold text-sm" style={{ color: C.deep }}>
                        {t.title}
                      </div>
                      <div className="text-[11px]" style={{ color: `${C.deep}80` }}>
                        {t.sub}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountManagement;
