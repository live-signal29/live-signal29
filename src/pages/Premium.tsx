import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import SEO from "@/components/SEO";
import { getProductStructuredData, getBreadcrumbStructuredData } from "@/components/StructuredData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Check, Tag, Copy, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Autoplay from "embla-carousel-autoplay";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AffiliateBannerCarousel } from "@/components/AffiliateBannerCarousel";

const Premium = () => {
  const [selectedCategory, setSelectedCategory] = useState("COMMODITY");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [selectedCrypto, setSelectedCrypto] = useState("USDT_TRC20");

  const autoplayPlugin = Autoplay({ delay: 3000, stopOnInteraction: true });

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getProductStructuredData("Premium Trading Signals", 180, "USD"),
      getBreadcrumbStructuredData([
        { name: "Home", url: "https://yourdomain.com" },
        { name: "Premium Plans", url: "https://yourdomain.com/premium" }
      ])
    ]
  };

  // Fixed wallet addresses
  const cryptoAddresses: Record<string, string> = {
    "USDT_TRC20": "TEeeH4G5uKcW41UXkLC7DDq9da8DPr7vH3",
    "BTC": "1MFC63PWiPGWG1Z852t7oJ3pX8hGZYtPAU",
    "BNB": "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",
    "ETH": "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365"
  };

  const cryptoOptions = [
    { value: "USDT_TRC20", label: "USDT (TRC20)" },
    { value: "BTC", label: "Bitcoin (BTC)" },
    { value: "BNB", label: "Binance Coin (BNB)" },
    { value: "ETH", label: "Ethereum (ETH)" }
  ];

  const categories = ["FOREX", "COMMODITY", "INDEX", "CRYPTO"];

  // Fetch active special offers for carousel
  const { data: specialOffers } = useQuery({
    queryKey: ["special-offers-carousel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data || [];
    },
  });

  // Fetch first active special offer for countdown
  const { data: activeOffer } = useQuery({
    queryKey: ["active-special-offer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("special_offers")
        .select("*")
        .eq("is_active", true)
        .single();
      if (error) return null;
      return data;
    },
  });

  // Fetch active coupons for banner display
  const { data: activeCoupons } = useQuery({
    queryKey: ["active-coupons-banner"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) return [];
      
      // Filter out expired coupons
      const validCoupons = data.filter(coupon => {
        if (!coupon.expiry_date) return true;
        return new Date(coupon.expiry_date) > new Date();
      });
      
      return validCoupons;
    },
  });

  const plans = [
    {
      name: "Monthly",
      duration: "month",
      pricePerMonth: 30,
      totalPrice: 30,
      payOnly: 30,
      discount: null,
      popular: false,
    },
    {
      name: "Quarterly",
      duration: "3 months",
      pricePerMonth: 25,
      totalPrice: 90,
      payOnly: 75,
      discount: "17% Off",
      popular: true,
    },
    {
      name: "Half-Yearly",
      duration: "6 months",
      pricePerMonth: 20,
      totalPrice: 180,
      payOnly: 120,
      discount: "33% Off",
      popular: false,
    },
    {
      name: "Yearly",
      duration: "12 months",
      pricePerMonth: 15,
      totalPrice: 360,
      payOnly: 180,
      discount: "50% Off",
      popular: false,
    },
  ];

  const features = [
    `All ${selectedCategory.toLowerCase()} signals`,
    "Daily 2-5 signals",
    "Instant notifications",
    "Ad-free signals",
    "Customer support",
  ];

  const applyCoupon = async () => {
    const upperCode = couponCode.toUpperCase().trim();
    
    if (!upperCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);

    try {
      const { data: coupon, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", upperCode)
        .eq("is_active", true)
        .single();

      if (error || !coupon) {
        toast.error("Invalid or expired coupon code");
        setValidatingCoupon(false);
        return;
      }

      // Check expiry
      if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
        toast.error("This coupon has expired");
        setValidatingCoupon(false);
        return;
      }

      // Check usage limit
      if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
        toast.error("This coupon has reached its usage limit");
        setValidatingCoupon(false);
        return;
      }

      setAppliedCoupon(coupon);
      toast.success(`Coupon applied! ${coupon.discount_type === "percentage" ? coupon.discount_value + "%" : "$" + coupon.discount_value} discount`);
    } catch (error: any) {
      toast.error("Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const calculateFinalPrice = (basePrice: number, planName: string) => {
    if (!appliedCoupon) return basePrice;

    // Check if coupon applies to this plan
    if (appliedCoupon.applicable_plans && appliedCoupon.applicable_plans.length > 0) {
      if (!appliedCoupon.applicable_plans.includes(planName)) {
        return basePrice;
      }
    }

    if (appliedCoupon.discount_type === "percentage") {
      return basePrice - (basePrice * appliedCoupon.discount_value / 100);
    } else {
      return Math.max(0, basePrice - appliedCoupon.discount_value);
    }
  };

  const handleSelectPlan = async (plan: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login first");
      return;
    }

    const finalPrice = calculateFinalPrice(plan.payOnly, plan.name);
    setShowPaymentDialog(true);
    setPaymentDetails({ plan, finalPrice, originalPrice: plan.payOnly });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Address copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Premium Trading Signals Plans - TREND IS FRIEND"
        description="Choose from flexible monthly, quarterly, half-yearly, and yearly premium plans. Get unlimited trading signals for Forex, Crypto, Commodities, and Indices with up to 50% off annual plans."
        keywords="premium trading signals, subscription plans, forex signals subscription, crypto signals premium, trading signals pricing, annual trading plans"
        url="https://yourdomain.com/premium"
        structuredData={structuredData}
      />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Banner Carousel - Auto-sliding with Special Offers */}
        <div className="mb-8">
          <Carousel 
            className="w-full max-w-5xl mx-auto"
            plugins={[autoplayPlugin]}
            opts={{ loop: true }}
          >
            <CarouselContent>
              {/* Default Happy New Year Banner */}
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-3 drop-shadow-lg animate-pulse">HAPPY NEW YEAR 🎊</h2>
                    <p className="text-xl md:text-3xl font-semibold drop-shadow-md">2026 Special Offer</p>
                  </div>
                </div>
              </CarouselItem>

              {/* Default Limited Time Offer Banner */}
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/30"></div>
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold mb-3 drop-shadow-lg">LIMITED TIME OFFER</h2>
                    <p className="text-5xl md:text-7xl font-bold text-yellow-300 mb-3 drop-shadow-lg animate-bounce">UP TO 50% OFF</p>
                    <p className="text-xl md:text-3xl font-semibold drop-shadow-md">TAKE PREMIUM NOW!</p>
                  </div>
                </div>
              </CarouselItem>

              {/* Dynamic Special Offers from Admin Panel */}
              {specialOffers && specialOffers.map((offer, index) => (
                <CarouselItem key={offer.id}>
                  <div 
                    className={`relative h-48 md:h-64 rounded-xl flex items-center justify-center overflow-hidden group ${
                      index % 4 === 0 ? 'bg-gradient-to-br from-green-500 via-teal-500 to-blue-600' :
                      index % 4 === 1 ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-600' :
                      index % 4 === 2 ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600' :
                      'bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-600'
                    } shadow-2xl hover:shadow-3xl transition-all duration-300`}
                  >
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20 animate-pulse"></div>
                    
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"></div>
                    
                    {/* Glow Effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Floating Particles */}
                    <div className="absolute top-4 left-4 w-2 h-2 bg-white/40 rounded-full animate-[float_3s_ease-in-out_infinite]"></div>
                    <div className="absolute top-8 right-8 w-3 h-3 bg-white/30 rounded-full animate-[float_4s_ease-in-out_infinite_0.5s]"></div>
                    <div className="absolute bottom-6 left-12 w-2 h-2 bg-white/50 rounded-full animate-[float_5s_ease-in-out_infinite_1s]"></div>
                    <div className="absolute bottom-10 right-16 w-2 h-2 bg-white/40 rounded-full animate-[float_3.5s_ease-in-out_infinite_1.5s]"></div>
                    
                    {/* Sparkle Stars */}
                    <div className="absolute top-1/4 left-1/4 text-white/60 animate-[spin_4s_linear_infinite]">✨</div>
                    <div className="absolute top-1/3 right-1/4 text-white/50 animate-[spin_5s_linear_infinite_reverse]">⭐</div>
                    <div className="absolute bottom-1/4 left-1/3 text-white/40 animate-[spin_6s_linear_infinite]">💫</div>
                    
                    {/* Content */}
                    <div className="text-center text-white p-6 relative z-10 transform group-hover:scale-105 transition-transform duration-300">
                      <div className="mb-4">
                        <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30 text-xs px-3 py-1 animate-bounce">
                          🎁 SPECIAL OFFER
                        </Badge>
                      </div>
                      <h2 className="text-3xl md:text-6xl font-extrabold mb-3 drop-shadow-2xl animate-fade-in bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent">
                        {offer.title}
                      </h2>
                      {offer.description && (
                        <p className="text-lg md:text-2xl font-semibold drop-shadow-lg animate-fade-in backdrop-blur-sm bg-black/20 rounded-lg px-4 py-2 inline-block">
                          {offer.description}
                        </p>
                      )}
                      <div className="mt-4 flex justify-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-200"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-ping animation-delay-400"></div>
                      </div>
                    </div>
                    
                    {/* Corner Decorations */}
                    <div className="absolute top-0 left-0 w-16 h-16 border-t-4 border-l-4 border-white/30 rounded-tl-xl"></div>
                    <div className="absolute top-0 right-0 w-16 h-16 border-t-4 border-r-4 border-white/30 rounded-tr-xl"></div>
                    <div className="absolute bottom-0 left-0 w-16 h-16 border-b-4 border-l-4 border-white/30 rounded-bl-xl"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 border-b-4 border-r-4 border-white/30 rounded-br-xl"></div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

        {/* Active Coupons Banner */}
        {activeCoupons && activeCoupons.length > 0 && (
          <div className="max-w-5xl mx-auto mb-8">
            <Carousel 
              className="w-full"
              plugins={[Autoplay({ delay: 4000, stopOnInteraction: true })]}
              opts={{ loop: true }}
            >
              <CarouselContent>
                {activeCoupons.map((coupon) => (
                  <CarouselItem key={coupon.id}>
                    <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/5 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-primary/20 p-3 rounded-full animate-pulse">
                              <Tag className="h-6 w-6 text-primary" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-lg md:text-xl font-bold text-primary mb-1">
                                🎉 New Discount Available!
                              </h3>
                              <p className="text-sm md:text-base text-muted-foreground">
                                Use code <span className="font-mono font-bold text-primary text-lg px-2 py-0.5 bg-primary/10 rounded">{coupon.code}</span> for{" "}
                                <span className="font-bold text-success">
                                  {coupon.discount_type === "percentage" 
                                    ? `${coupon.discount_value}% OFF` 
                                    : `$${coupon.discount_value} OFF`}
                                </span>
                              </p>
                              {coupon.expiry_date && (
                                <p className="text-xs text-muted-foreground/70 mt-1">
                                  Valid until {new Date(coupon.expiry_date).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <Button 
                            onClick={() => {
                              setCouponCode(coupon.code);
                              applyCoupon();
                            }}
                            className="bg-primary hover:bg-primary/90 font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                          >
                            Apply Now
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {activeCoupons.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          </div>
        )}

        {/* Countdown Timer */}
        {activeOffer && (
          <CountdownTimer 
            endDate={new Date(activeOffer.end_date)}
            title={activeOffer.title}
            description={activeOffer.description || undefined}
          />
        )}

        {/* Coupon Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="coupon" className="flex items-center gap-2 text-base">
                    <Tag className="h-5 w-5 text-primary" />
                    Have a coupon code?
                  </Label>
                  <Input
                    id="coupon"
                    placeholder="Enter your coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="border-primary/30 text-lg"
                    disabled={validatingCoupon}
                  />
                </div>
                <Button 
                  onClick={applyCoupon}
                  disabled={validatingCoupon}
                  className="sm:mt-8 bg-primary hover:bg-primary/90 font-semibold"
                >
                  {validatingCoupon ? "Validating..." : "Apply Coupon"}
                </Button>
              </div>
              {appliedCoupon && (
                <Alert className="mt-4 border-success bg-success/10">
                  <Check className="h-4 w-4 text-success" />
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-success font-semibold">
                      ✓ Coupon "{appliedCoupon.code}" applied! 
                      {appliedCoupon.discount_type === "percentage" ? ` ${appliedCoupon.discount_value}% ` : ` $${appliedCoupon.discount_value} `}
                      discount
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAppliedCoupon(null)}
                      className="h-7 text-xs text-success hover:text-success"
                    >
                      Remove
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Selector */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Choose Your Trading Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-lg">
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* Pricing Plans Carousel */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 gradient-text">
            {selectedCategory} Premium Plans
          </h2>
          
          <Carousel 
            className="w-full"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {plans.map((plan, index) => {
                const originalPrice = plan.payOnly;
                const finalPrice = calculateFinalPrice(originalPrice, plan.name);
                const savings = originalPrice - finalPrice;
                const isPlanApplicable = !appliedCoupon || 
                  !appliedCoupon.applicable_plans || 
                  appliedCoupon.applicable_plans.length === 0 || 
                  appliedCoupon.applicable_plans.includes(plan.name);

                return (
                  <CarouselItem 
                    key={plan.name} 
                    className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                  >
                    <Card 
                      className={`
                        relative h-full overflow-hidden group
                        transition-all duration-500 ease-out
                        hover:scale-[1.02] hover:shadow-2xl
                        animate-fade-in
                        ${plan.popular 
                          ? 'border-primary/50 bg-gradient-to-br from-primary/5 via-background to-background shadow-xl shadow-primary/10' 
                          : 'border-border/50 hover:border-primary/30'
                        }
                      `}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Gradient overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                      
                      {/* Popular badge with animation */}
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 animate-bounce">
                          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-1.5 text-sm font-bold shadow-lg">
                            ⭐ Most Popular
                          </Badge>
                        </div>
                      )}
                      
                      {/* Discount corner badge */}
                      {plan.discount && (
                        <div className="absolute top-4 right-4 z-10">
                          <div className="bg-gradient-to-br from-success to-success/80 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg animate-pulse">
                            {plan.discount}
                          </div>
                        </div>
                      )}
                      
                      <CardHeader className="text-center pb-6 pt-8 relative z-10">
                        <CardTitle className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">
                          {plan.name}
                        </CardTitle>
                        
                        {/* Price display with gradient */}
                        <div className="space-y-2">
                          <div className="relative inline-block">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary/50 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                            <p className="relative text-5xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              ${plan.pricePerMonth}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">per month</p>
                          <p className="text-xs text-muted-foreground/70">{plan.duration}</p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-6 relative z-10">
                        {/* Pricing breakdown with modern design */}
                        <div className="space-y-3 p-4 rounded-lg bg-muted/30 backdrop-blur-sm border border-border/50">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground font-medium">Original Price</span>
                            <span className="line-through text-muted-foreground">${plan.totalPrice}</span>
                          </div>
                          
                          {appliedCoupon && isPlanApplicable ? (
                            <>
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground font-medium">Before Coupon</span>
                                <span className="line-through text-muted-foreground">${originalPrice}</span>
                              </div>
                              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-base">Final Price</span>
                                <span className="text-2xl font-black bg-gradient-to-r from-success to-success/70 bg-clip-text text-transparent">
                                  ${finalPrice.toFixed(2)}
                                </span>
                              </div>
                              <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-success/10 to-success/5 p-3 border border-success/20">
                                <div className="absolute inset-0 bg-gradient-to-r from-success/5 to-transparent animate-pulse" />
                                <p className="relative text-success text-center font-bold text-sm flex items-center justify-center gap-2">
                                  <span className="text-lg">💰</span>
                                  You save ${savings.toFixed(2)}!
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-base">Pay Only</span>
                                <span className="text-2xl font-black bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                                  ${originalPrice}
                                </span>
                              </div>
                            </>
                          )}

                          {appliedCoupon && !isPlanApplicable && (
                            <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-warning/10 to-warning/5 p-3 border border-warning/20">
                              <p className="text-warning text-center text-xs font-medium flex items-center justify-center gap-2">
                                <AlertCircle className="h-3.5 w-3.5" />
                                Coupon not applicable
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Features list with animations */}
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Includes:</p>
                          {features.map((feature, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-start gap-3 group/item"
                              style={{ animationDelay: `${(index * 100) + (idx * 50)}ms` }}
                            >
                              <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center group-hover/item:bg-success/20 transition-colors">
                                <Check className="h-3 w-3 text-success" />
                              </div>
                              <span className="text-sm leading-relaxed group-hover/item:text-foreground transition-colors">
                                {feature}
                              </span>
                            </div>
                          ))}
                          <div 
                            className="flex items-start gap-3 group/item"
                            style={{ animationDelay: `${(index * 100) + (features.length * 50)}ms` }}
                          >
                            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-success/10 flex items-center justify-center group-hover/item:bg-success/20 transition-colors">
                              <Check className="h-3 w-3 text-success" />
                            </div>
                            <span className="text-sm font-semibold leading-relaxed group-hover/item:text-foreground transition-colors">
                              {plan.duration} validity
                            </span>
                          </div>
                        </div>

                        {/* CTA Button with gradient */}
                        <Button 
                          className="
                            w-full h-12 font-bold text-base
                            bg-gradient-to-r from-primary to-primary/80
                            hover:from-primary/90 hover:to-primary/70
                            shadow-lg shadow-primary/25
                            hover:shadow-xl hover:shadow-primary/40
                            transition-all duration-300
                            group-hover:scale-[1.02]
                            relative overflow-hidden
                          " 
                          onClick={() => handleSelectPlan(plan)}
                        >
                          <span className="relative z-10">SELECT PLAN</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        </Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        </div>

        {/* Affiliate Banner Carousel */}
        <div className="max-w-5xl mx-auto">
          <AffiliateBannerCarousel />
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">Complete Your Payment</DialogTitle>
            </DialogHeader>
            
            {paymentDetails && (
              <div className="space-y-6">
                {/* Order Summary */}
                <Card className="bg-muted/30">
                  <CardHeader>
                    <CardTitle className="text-lg">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Plan:</span>
                      <span>{paymentDetails.plan.name} - {selectedCategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Duration:</span>
                      <span>{paymentDetails.plan.duration}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-success">
                        <span className="font-semibold">Coupon Applied:</span>
                        <span>{appliedCoupon.code}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 mt-2">
                      {paymentDetails.originalPrice !== paymentDetails.finalPrice && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Original:</span>
                          <span className="line-through">${paymentDetails.originalPrice}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xl font-bold text-primary">
                        <span>Total Amount:</span>
                        <span>${paymentDetails.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Instructions */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base mb-2">Step 1: Select Cryptocurrency</Label>
                    <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                      <SelectTrigger className="h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cryptoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-base mb-2">Step 2: Copy Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        value={cryptoAddresses[selectedCrypto]}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(cryptoAddresses[selectedCrypto])}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold">Step 3: Send Payment</p>
                        <p>Send <span className="font-bold text-primary">${paymentDetails.finalPrice.toFixed(2)}</span> worth of {cryptoOptions.find(o => o.value === selectedCrypto)?.label} to the above address.</p>
                        <p className="font-semibold">Step 4: Contact Support</p>
                        <p>After payment, contact our support team with your transaction ID to activate your premium subscription.</p>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <Alert className="border-warning bg-warning/10">
                    <AlertCircle className="h-4 w-4 text-warning" />
                    <AlertDescription className="text-warning">
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Double-check the wallet address before sending</li>
                        <li>Send only the selected cryptocurrency</li>
                        <li>Keep your transaction ID for verification</li>
                        <li>Activation may take 10-30 minutes after verification</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>

      <Footer />
    </div>
  );
};

export default Premium;
