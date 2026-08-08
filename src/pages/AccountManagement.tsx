import { useState, useCallback, useEffect } from "react";
import { type CarouselApi } from "@/components/ui/carousel";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  TrendingUp, 
  Shield, 
  Clock, 
  MessageCircle, 
  FileText, 
  Wallet,
  Users,
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
import Autoplay from "embla-carousel-autoplay";
import { z } from "zod";

const applicationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  whatsapp: z.string().regex(/^\+\d{1,4}\d{6,14}$/, "Enter valid WhatsApp with country code (e.g., +92300...)"),
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
    title: "$100 Account",
    amount: "$100",
    profitSharing: "50 / 50",
    dailyReturn: "45%",
    color: "from-blue-500 to-cyan-500",
    icon: Wallet,
    features: [
      "Hybrid AI + Manual Trading",
      "Daily Screenshot Reports",
      "Low-Risk Settings",
      "Easy Withdrawals",
      "WhatsApp Updates"
    ]
  },
  {
    title: "$1,000 Account",
    amount: "$1,000",
    profitSharing: "40 / 60",
    dailyReturn: "35%",
    color: "from-emerald-500 to-teal-500",
    icon: TrendingUp,
    popular: true,
    features: [
      "Advanced Risk Control",
      "Dedicated Support",
      "Daily Trade Summary",
      "Verified Performance Reports",
      "Fast Payout System"
    ]
  },
  {
    title: "$10,000 Account",
    amount: "$10,000",
    profitSharing: "30 / 70",
    dailyReturn: "25%",
    color: "from-purple-500 to-indigo-500",
    icon: Crown,
    features: [
      "VIP Trading Mode",
      "Weekly Portfolio Reports",
      "Smart Lot Optimization",
      "Auto-Risk Protection",
      "Priority Support"
    ]
  },
  {
    title: "$50,000 Account",
    amount: "$50,000",
    profitSharing: "20 / 80",
    dailyReturn: "16%",
    color: "from-amber-500 to-rose-500",
    icon: Star,
    features: [
      "Institutional Grade Strategy",
      "Private Client Manager",
      "Full Trading Journal",
      "Priority Withdrawals",
      "Highest Capital Protection"
    ]
  }
];

const steps = [
  {
    icon: Link2,
    title: "Connect Your Account",
    description: "Link your trading account securely with us"
  },
  {
    icon: Settings2,
    title: "We Manage Trades",
    description: "Our experts handle all trading professionally"
  },
  {
    icon: DollarSign,
    title: "Receive Your Profits",
    description: "Get profits based on your chosen plan"
  }
];

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
    account_size: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!carouselApi) return;

    setCount(carouselApi.scrollSnapList().length);
    setCurrent(carouselApi.selectedScrollSnap());

    carouselApi.on("select", () => {
      setCurrent(carouselApi.selectedScrollSnap());
    });
  }, [carouselApi]);

  const { data: performanceData } = useQuery({
    queryKey: ['account-performance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('account_performance')
        .select('*')
        .eq('is_published', true)
        .order('date', { ascending: false })
        .limit(7);
      
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
        .insert([{
          name: validated.name,
          whatsapp: validated.whatsapp,
          email: validated.email,
          preferred_broker: validated.preferred_broker,
          platform_type: validated.platform_type,
          broker_server: validated.broker_server,
          trading_login: validated.trading_login,
          trading_password: validated.trading_password,
          account_size: validated.account_size
        }]);

      if (error) throw error;

      toast.success("Application submitted successfully!", {
        description: "We'll contact you on WhatsApp shortly."
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
        account_size: ""
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
    <div className="min-h-screen bg-[#080a12] text-white relative overflow-hidden">
      {/* Background Decorative Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[30%] right-0 w-[400px] h-[400px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-16 relative z-10">
        {/* Hero Section */}
        <section className="text-center py-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm font-medium mb-4 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Zap className="h-4 w-4 text-purple-400" />
            Professional Account Management
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
              Account Management Service
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium">
            Managed by Professional Traders — Safe, Transparent & Result-Focused.
          </p>
        </section>

        {/* Trading Strategy */}
        <section className="max-w-3xl mx-auto text-center">
          <Card className="border border-white/10 bg-[#0f1222]/80 backdrop-blur-xl shadow-2xl">
            <CardContent className="p-8">
              <div className="flex justify-center mb-4">
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/20 to-amber-950/40 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
                  <BarChart3 className="h-8 w-8" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Our Trading Strategy</h2>
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                We trade using a <span className="text-amber-400 font-bold">hybrid system: AI-based signals + manual chart analysis</span>. 
                Our strategy focuses on low-risk entries, strong risk management, and high-probability setups 
                to ensure stable daily growth.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Account Plans */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white mb-2">Choose Your Plan</h2>
            <p className="text-slate-400 text-sm">Select the account size that fits your investment goals</p>
          </div>
          
          <Carousel
            opts={{
              align: "start",
              loop: true,
            }}
            plugins={[
              Autoplay({
                delay: 3500,
                stopOnInteraction: false,
              }),
            ]}
            setApi={setCarouselApi}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-4">
              {plans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <CarouselItem key={index} className="pl-3 md:pl-4 basis-[95%] sm:basis-[55%] lg:basis-1/3 flex justify-center">
                    <Card 
                      className={cn(
                        "relative overflow-hidden border border-white/10 transition-all duration-500 group cursor-pointer h-full w-full max-w-[380px] min-h-[440px]",
                        "hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]",
                        "bg-[#0f1222]/90 backdrop-blur-2xl text-white",
                        plan.popular && "ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)]"
                      )}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, account_size: plan.amount }));
                        document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {plan.popular && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs px-3.5 py-1 shadow-lg border border-purple-400/40">
                            ⭐ Popular
                          </Badge>
                        </div>
                      )}
                      
                      <CardHeader className="pb-4 pt-6 px-5">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg border border-white/20",
                          plan.color
                        )}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <CardTitle className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{plan.title}</CardTitle>
                        <div className="relative inline-block mt-1">
                          <span className="text-4xl font-black text-white font-mono tracking-tight">
                            {plan.amount}
                          </span>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4 px-5 pb-5">
                        <div className="space-y-2.5 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-medium">Profit Share</span>
                            <span className="font-bold text-purple-400">{plan.profitSharing}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400 font-medium">Est. Daily</span>
                            <span className="font-bold text-emerald-400">{plan.dailyReturn}</span>
                          </div>
                        </div>
                        
                        <ul className="space-y-2.5">
                          {plan.features.slice(0, 4).map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs md:text-sm">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span className="text-slate-300 font-medium">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        
                        <Button 
                          className={cn(
                            "w-full h-12 text-sm font-bold mt-2 rounded-xl transition-all duration-300",
                            "bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] hover:scale-[1.01]"
                          )}
                        >
                          Select Plan
                        </Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-4 border-white/10 bg-[#14172a] text-white hover:bg-purple-900" />
            <CarouselNext className="hidden md:flex -right-4 border-white/10 bg-[#14172a] text-white hover:bg-purple-900" />
          </Carousel>
          
          {/* Dot indicators */}
          <div className="flex justify-center gap-2 mt-6">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  current === index 
                    ? "bg-purple-500 w-6" 
                    : "bg-white/20 hover:bg-white/40"
                )}
                onClick={() => carouselApi?.scrollTo(index)}
              />
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white mb-2">How It Works</h2>
            <p className="text-slate-400 text-sm">Simple 3-step process to get started</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="border border-white/10 bg-[#0f1222]/80 backdrop-blur-xl text-center p-6 text-white shadow-xl hover:border-purple-500/40 transition-all">
                  <div className="relative mx-auto mb-4">
                    <div className="w-16 h-16 rounded-full border border-purple-500/30 bg-purple-500/10 flex items-center justify-center mx-auto text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-xs shadow-md">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-xs md:text-sm text-slate-400 font-medium">{step.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Apply Now Form */}
        <section id="apply-form" className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white mb-2">Apply Now</h2>
            <p className="text-slate-400 text-sm">Fill in your details and we'll contact you shortly</p>
          </div>
          
          <Card className="border border-white/10 bg-[#0f1222]/95 backdrop-blur-2xl shadow-2xl text-white">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-300 font-semibold text-xs">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.name && "border-red-500")}
                    />
                    {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp" className="text-slate-300 font-semibold text-xs">WhatsApp Number</Label>
                    <Input
                      id="whatsapp"
                      placeholder="+92300..."
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.whatsapp && "border-red-500")}
                    />
                    {errors.whatsapp && <p className="text-xs text-red-400">{errors.whatsapp}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-300 font-semibold text-xs">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.email && "border-red-500")}
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="broker" className="text-slate-300 font-semibold text-xs">Preferred Broker</Label>
                    <Input
                      id="broker"
                      placeholder="e.g., Exness, XM, IC Markets"
                      value={formData.preferred_broker}
                      onChange={(e) => setFormData({ ...formData, preferred_broker: e.target.value })}
                      className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.preferred_broker && "border-red-500")}
                    />
                    {errors.preferred_broker && <p className="text-xs text-red-400">{errors.preferred_broker}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="platform_type" className="text-slate-300 font-semibold text-xs">Platform Type</Label>
                    <Select
                      value={formData.platform_type}
                      onValueChange={(value) => setFormData({ ...formData, platform_type: value })}
                    >
                      <SelectTrigger className={cn("bg-white/[0.05] border-white/10 text-white focus:border-purple-500", errors.platform_type && "border-red-500")}>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#14172a] border border-white/10 text-white z-50">
                        <SelectItem value="MT4">MT4</SelectItem>
                        <SelectItem value="MT5">MT5</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.platform_type && <p className="text-xs text-red-400">{errors.platform_type}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="broker_server" className="text-slate-300 font-semibold text-xs">Broker Server</Label>
                  <Input
                    id="broker_server"
                    placeholder="e.g., server3-mt5@broker"
                    value={formData.broker_server}
                    onChange={(e) => setFormData({ ...formData, broker_server: e.target.value })}
                    className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.broker_server && "border-red-500")}
                  />
                  {errors.broker_server && <p className="text-xs text-red-400">{errors.broker_server}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trading_login" className="text-slate-300 font-semibold text-xs">Trading Account Login</Label>
                    <Input
                      id="trading_login"
                      placeholder="e.g., 8373738"
                      value={formData.trading_login}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, trading_login: value });
                      }}
                      className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.trading_login && "border-red-500")}
                    />
                    {errors.trading_login && <p className="text-xs text-red-400">{errors.trading_login}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="trading_password" className="text-slate-300 font-semibold text-xs">Trading Account Password</Label>
                    <Input
                      id="trading_password"
                      type="password"
                      placeholder="Your trading password"
                      value={formData.trading_password}
                      onChange={(e) => setFormData({ ...formData, trading_password: e.target.value })}
                      className={cn("bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 focus:border-purple-500", errors.trading_password && "border-red-500")}
                    />
                    {errors.trading_password && <p className="text-xs text-red-400">{errors.trading_password}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account_size" className="text-slate-300 font-semibold text-xs">Account Size</Label>
                  <Select
                    value={formData.account_size}
                    onValueChange={(value) => setFormData({ ...formData, account_size: value })}
                  >
                    <SelectTrigger className={cn("bg-white/[0.05] border-white/10 text-white focus:border-purple-500", errors.account_size && "border-red-500")}>
                      <SelectValue placeholder="Select account size" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#14172a] border border-white/10 text-white z-50">
                      <SelectItem value="$100">$100</SelectItem>
                      <SelectItem value="$1,000">$1,000</SelectItem>
                      <SelectItem value="$10,000">$10,000</SelectItem>
                      <SelectItem value="$50,000">$50,000</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.account_size && <p className="text-xs text-red-400">{errors.account_size}</p>}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-12 text-sm font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all mt-4" 
                  size="lg" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Application
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Live Performance */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-white mb-2">Live Performance</h2>
            <p className="text-slate-400 text-sm">Track our verified trading results</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-white/10 bg-[#0f1222]/80 p-4 text-center">
              <div className="text-3xl font-black text-emerald-400">98%</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Win Rate</div>
            </Card>
            <Card className="border border-white/10 bg-[#0f1222]/80 p-4 text-center">
              <div className="text-3xl font-black text-purple-400">500+</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Active Clients</div>
            </Card>
            <Card className="border border-white/10 bg-[#0f1222]/80 p-4 text-center">
              <div className="text-3xl font-black text-amber-400">$2M+</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Total Managed</div>
            </Card>
            <Card className="border border-white/10 bg-[#0f1222]/80 p-4 text-center">
              <div className="text-3xl font-black text-indigo-400">3+ Years</div>
              <div className="text-xs font-semibold text-slate-400 mt-1">Experience</div>
            </Card>
          </div>
          
          {performanceData && performanceData.length > 0 && (
            <Card className="border border-white/10 bg-[#0f1222]/80 overflow-hidden text-white">
              <CardHeader className="bg-white/[0.02] border-b border-white/10">
                <CardTitle className="text-base font-bold text-white">Recent Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {performanceData.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-semibold text-sm text-white">{new Date(item.date).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400">{item.period}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">+{item.profit_percentage}%</div>
                        <div className="text-xs text-slate-400">
                          {item.winning_trades}/{item.total_trades} trades
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>

        {/* Trust Indicators */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8 border-t border-white/10">
          <div className="flex items-center gap-3 p-3">
            <Shield className="h-7 w-7 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">Secure Funds</div>
              <div className="text-[11px] text-slate-400">100% Protected</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3">
            <Clock className="h-7 w-7 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">24/7 Support</div>
              <div className="text-[11px] text-slate-400">Always Available</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3">
            <MessageCircle className="h-7 w-7 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">WhatsApp Updates</div>
              <div className="text-[11px] text-slate-400">Daily Reports</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3">
            <FileText className="h-7 w-7 text-purple-400 shrink-0" />
            <div>
              <div className="font-bold text-xs text-white">Full Transparency</div>
              <div className="text-[11px] text-slate-400">Verified Results</div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default AccountManagement;
