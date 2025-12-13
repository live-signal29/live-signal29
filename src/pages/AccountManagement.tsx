import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    color: "from-emerald-500 to-green-500",
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
    color: "from-purple-500 to-violet-500",
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
    color: "from-amber-500 to-orange-500",
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 space-y-16">
        {/* Hero Section */}
        <section className="text-center py-12 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Professional Account Management
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Account Management Service
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Managed by Professional Traders — Safe, Transparent & Result-Focused.
          </p>
        </section>

        {/* Trading Strategy */}
        <section className="max-w-3xl mx-auto text-center">
          <Card className="border-border/50 bg-gradient-to-br from-muted/30 to-muted/10">
            <CardContent className="p-8">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Trading Strategy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We trade using a <span className="text-foreground font-semibold">hybrid system: AI-based signals + manual chart analysis</span>. 
                Our strategy focuses on low-risk entries, strong risk management, and high-probability setups 
                to ensure stable daily growth.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Account Plans */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">Select the account size that fits your investment goals</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              return (
                <Card 
                  key={index}
                  className={cn(
                    "relative overflow-hidden border-border/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl",
                    plan.popular && "ring-2 ring-primary"
                  )}
                >
                  {plan.popular && (
                    <div className="absolute top-0 right-0">
                      <Badge className="rounded-none rounded-bl-lg bg-primary text-primary-foreground">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="pb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-3",
                      plan.color
                    )}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{plan.title}</CardTitle>
                    <CardDescription>
                      <span className="text-3xl font-bold text-foreground">{plan.amount}</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="space-y-2 pb-4 border-b border-border/50">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Profit Sharing</span>
                        <span className="font-semibold text-primary">{plan.profitSharing}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Daily Return</span>
                        <span className="font-semibold text-emerald-500">{plan.dailyReturn}</span>
                      </div>
                    </div>
                    
                    <ul className="space-y-2.5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      className="w-full mt-4" 
                      variant={plan.popular ? "default" : "outline"}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, account_size: plan.amount }));
                        document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      Select Plan
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">How It Works</h2>
            <p className="text-muted-foreground">Simple 3-step process to get started</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <Card key={index} className="border-border/50 text-center p-6 hover:shadow-lg transition-shadow">
                  <div className="relative mx-auto mb-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-sm">
                      {index + 1}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Apply Now Form */}
        <section id="apply-form" className="max-w-2xl mx-auto space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Apply Now</h2>
            <p className="text-muted-foreground">Fill in your details and we'll contact you shortly</p>
          </div>
          
          <Card className="border-border/50">
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder="e.g., Exness, XM, IC Markets"
                      value={formData.preferred_broker}
                      onChange={(e) => setFormData({ ...formData, preferred_broker: e.target.value })}
                      className={errors.preferred_broker ? "border-destructive" : ""}
                    />
                    {errors.preferred_broker && <p className="text-xs text-destructive">{errors.preferred_broker}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="platform_type">Platform Type</Label>
                    <Select
                      value={formData.platform_type}
                      onValueChange={(value) => setFormData({ ...formData, platform_type: value })}
                    >
                      <SelectTrigger className={errors.platform_type ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border border-border z-50">
                        <SelectItem value="MT4">MT4</SelectItem>
                        <SelectItem value="MT5">MT5</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.platform_type && <p className="text-xs text-destructive">{errors.platform_type}</p>}
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
                  {errors.broker_server && <p className="text-xs text-destructive">{errors.broker_server}</p>}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trading_login">Trading Account Login</Label>
                    <Input
                      id="trading_login"
                      placeholder="e.g., 8373738"
                      value={formData.trading_login}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, trading_login: value });
                      }}
                      className={errors.trading_login ? "border-destructive" : ""}
                    />
                    {errors.trading_login && <p className="text-xs text-destructive">{errors.trading_login}</p>}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="trading_password">Trading Account Password</Label>
                    <Input
                      id="trading_password"
                      type="password"
                      placeholder="Your trading password"
                      value={formData.trading_password}
                      onChange={(e) => setFormData({ ...formData, trading_password: e.target.value })}
                      className={errors.trading_password ? "border-destructive" : ""}
                    />
                    {errors.trading_password && <p className="text-xs text-destructive">{errors.trading_password}</p>}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="account_size">Account Size</Label>
                  <Select
                    value={formData.account_size}
                    onValueChange={(value) => setFormData({ ...formData, account_size: value })}
                  >
                    <SelectTrigger className={errors.account_size ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select account size" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectItem value="$100">$100</SelectItem>
                      <SelectItem value="$1,000">$1,000</SelectItem>
                      <SelectItem value="$10,000">$10,000</SelectItem>
                      <SelectItem value="$50,000">$50,000</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.account_size && <p className="text-xs text-destructive">{errors.account_size}</p>}
                </div>
                
                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
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
            <h2 className="text-3xl font-bold mb-2">Live Performance</h2>
            <p className="text-muted-foreground">Track our verified trading results</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/50 p-4 text-center">
              <div className="text-3xl font-bold text-emerald-500">98%</div>
              <div className="text-sm text-muted-foreground">Win Rate</div>
            </Card>
            <Card className="border-border/50 p-4 text-center">
              <div className="text-3xl font-bold text-primary">500+</div>
              <div className="text-sm text-muted-foreground">Active Clients</div>
            </Card>
            <Card className="border-border/50 p-4 text-center">
              <div className="text-3xl font-bold text-amber-500">$2M+</div>
              <div className="text-sm text-muted-foreground">Total Managed</div>
            </Card>
            <Card className="border-border/50 p-4 text-center">
              <div className="text-3xl font-bold text-purple-500">3+ Years</div>
              <div className="text-sm text-muted-foreground">Experience</div>
            </Card>
          </div>
          
          {performanceData && performanceData.length > 0 && (
            <Card className="border-border/50 overflow-hidden">
              <CardHeader className="bg-muted/30">
                <CardTitle className="text-lg">Recent Performance</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {performanceData.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium">{new Date(item.date).toLocaleDateString()}</div>
                        <div className="text-sm text-muted-foreground">{item.period}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-emerald-500">+{item.profit_percentage}%</div>
                        <div className="text-sm text-muted-foreground">
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
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
          <div className="flex items-center gap-3 p-4">
            <Shield className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-sm">Secure Funds</div>
              <div className="text-xs text-muted-foreground">100% Protected</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <Clock className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-sm">24/7 Support</div>
              <div className="text-xs text-muted-foreground">Always Available</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <MessageCircle className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-sm">WhatsApp Updates</div>
              <div className="text-xs text-muted-foreground">Daily Reports</div>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4">
            <FileText className="h-8 w-8 text-primary shrink-0" />
            <div>
              <div className="font-semibold text-sm">Full Transparency</div>
              <div className="text-xs text-muted-foreground">Verified Results</div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default AccountManagement;
