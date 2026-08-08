import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import SEO from "@/components/SEO";
import { getProductStructuredData, getBreadcrumbStructuredData } from "@/components/StructuredData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
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
import { cn } from "@/lib/utils";

const Premium = () => {
  const [selectedCategory, setSelectedCategory] = useState("COMMODITY");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [selectedCrypto, setSelectedCrypto] = useState("USDT_TRC20");
  const [planCarouselApi, setPlanCarouselApi] = useState<CarouselApi>();
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  // Track carousel slide changes
  useEffect(() => {
    if (!planCarouselApi) return;

    const onSelect = () => {
      setCurrentPlanIndex(planCarouselApi.selectedScrollSnap());
    };

    planCarouselApi.on("select", onSelect);
    onSelect();

    // Auto-scroll to popular plan (Quarterly - index 1) on mobile
    const isMobile = window.innerWidth < 640;
    if (isMobile) {
      setTimeout(() => {
        planCarouselApi.scrollTo(1, false);
      }, 100);
    }

    return () => {
      planCarouselApi.off("select", onSelect);
    };
  }, [planCarouselApi]);

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
    <div className="min-h-screen flex flex-col bg-[#080a12] text-white relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

      <SEO
        title="Premium Trading Signals Plans - TREND IS FRIEND"
        description="Choose from flexible monthly, quarterly, half-yearly, and yearly premium plans. Get unlimited trading signals for Forex, Crypto, Commodities, and Indices with up to 50% off annual plans."
        keywords="premium trading signals, subscription plans, forex signals subscription, crypto signals premium, trading signals pricing, annual trading plans"
        url="https://yourdomain.com/premium"
        structuredData={structuredData}
      />
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl relative z-10 space-y-8">
        {/* Banner Carousel */}
        <div className="mb-8">
          <Carousel 
            className="w-full max-w-5xl mx-auto"
            plugins={[autoplayPlugin]}
            opts={{ loop: true }}
          >
            <CarouselContent>
              {/* Default Banner 1 */}
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-purple-500/10 backdrop-blur-3xl"></div>
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black mb-3 drop-shadow-lg tracking-tight bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">HAPPY NEW YEAR 🎊</h2>
                    <p className="text-lg md:text-2xl font-bold text-slate-300">2026 Special Offer</p>
                  </div>
                </div>
              </CarouselItem>

              {/* Default Banner 2 */}
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-amber-950 via-purple-950 to-slate-950 border border-amber-500/30 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-2xl md:text-4xl font-extrabold mb-2 text-amber-400">LIMITED TIME OFFER</h2>
                    <p className="text-4xl md:text-6xl font-black text-white mb-2 tracking-tight">UP TO 50% OFF</p>
                    <p className="text-sm md:text-lg font-semibold text-slate-300">GET VIP SIGNALS NOW!</p>
                  </div>
                </div>
              </CarouselItem>

              {/* Dynamic Special Offers */}
              {specialOffers && specialOffers.map((offer, index) => (
                <CarouselItem key={offer.id}>
                  <div className="relative h-48 md:h-64 rounded-2xl border border-white/10 bg-[#0f1222]/90 backdrop-blur-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                    <div className="text-center text-white p-6 relative z-10">
                      <div className="mb-2">
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs px-3 py-1 font-bold">
                          🎁 SPECIAL OFFER
                        </Badge>
                      </div>
                      <h2 className="text-3xl md:text-5xl font-black mb-2 text-white">
                        {offer.title}
                      </h2>
                      {offer.description && (
                        <p className="text-sm md:text-xl text-slate-300 font-medium">
                          {offer.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 border-white/10 bg-[#14172a] text-white hover:bg-purple-900" />
            <CarouselNext className="right-2 border-white/10 bg-[#14172a] text-white hover:bg-purple-900" />
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
                    <Card className="border border-purple-500/30 bg-[#0f1222]/90 backdrop-blur-xl shadow-xl">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="bg-purple-500/20 p-3 rounded-xl text-purple-400 border border-purple-500/30">
                              <Tag className="h-6 w-6" />
                            </div>
                            <div className="text-left">
                              <h3 className="text-base md:text-lg font-bold text-white mb-1">
                                🎉 Special Discount Available!
                              </h3>
                              <p className="text-xs md:text-sm text-slate-300">
                                Use code <span className="font-mono font-bold text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded border border-amber-500/20">{coupon.code}</span> for{" "}
                                <span className="font-bold text-emerald-400">
                                  {coupon.discount_type === "percentage" 
                                    ? `${coupon.discount_value}% OFF` 
                                    : `$${coupon.discount_value} OFF`}
                                </span>
                              </p>
                            </div>
                          </div>
                          <Button 
                            onClick={() => {
                              setCouponCode(coupon.code);
                              applyCoupon();
                            }}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold hover:scale-[1.02] transition-transform whitespace-nowrap"
                          >
                            Apply Code
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
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

        {/* Coupon Input Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border border-white/10 bg-[#0f1222]/80 backdrop-blur-xl text-white">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="coupon" className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <Tag className="h-4 w-4 text-purple-400" />
                    Have a promo coupon?
                  </Label>
                  <Input
                    id="coupon"
                    placeholder="ENTER COUPON CODE"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500 uppercase font-mono tracking-wider focus:border-purple-500"
                    disabled={validatingCoupon}
                  />
                </div>
                <Button 
                  onClick={applyCoupon}
                  disabled={validatingCoupon}
                  className="sm:mt-7 bg-purple-600 hover:bg-purple-700 text-white font-bold"
                >
                  {validatingCoupon ? "Validating..." : "Apply Coupon"}
                </Button>
              </div>
              {appliedCoupon && (
                <Alert className="mt-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <AlertDescription className="flex items-center justify-between text-xs md:text-sm">
                    <span className="font-semibold">
                      ✓ Coupon "{appliedCoupon.code}" applied! 
                      {appliedCoupon.discount_type === "percentage" ? ` ${appliedCoupon.discount_value}% ` : ` $${appliedCoupon.discount_value} `}
                      discount
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setAppliedCoupon(null)}
                      className="h-6 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
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
          <Card className="border border-white/10 bg-[#0f1222]/90 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-white">Choose Your Trading Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-12 bg-white/[0.05] border-white/10 text-white font-bold text-base focus:border-purple-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#14172a] border border-white/10 text-white z-50">
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-sm font-semibold hover:bg-purple-600/20">
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
          <h2 className="text-3xl md:text-4xl font-black text-center mb-8 bg-gradient-to-r from-white via-slate-200 to-purple-400 bg-clip-text text-transparent">
            {selectedCategory} VIP Premium Plans
          </h2>
          
          <Carousel 
            className="w-full"
            opts={{
              align: "center",
              loop: true,
            }}
            setApi={setPlanCarouselApi}
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
                    className="pl-3 md:pl-4 basis-[92%] sm:basis-1/2 lg:basis-1/4 flex justify-center"
                  >
                    <Card 
                      className={cn(
                        "relative overflow-hidden group cursor-pointer transition-all duration-500 ease-out h-full w-full max-w-[340px] sm:max-w-none min-h-[440px] border border-white/10 bg-[#0f1222]/90 backdrop-blur-2xl text-white",
                        "hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.25)]",
                        plan.popular && "ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.3)]"
                      )}
                      onClick={() => handleSelectPlan(plan)}
                    >
                      {/* Popular badge */}
                      {plan.popular && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10">
                          <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs px-3.5 py-1 shadow-lg border border-purple-400/40">
                            ⭐ Popular
                          </Badge>
                        </div>
                      )}
                      
                      {/* Discount badge */}
                      {plan.discount && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full text-xs font-bold">
                            {plan.discount}
                          </div>
                        </div>
                      )}
                      
                      <CardHeader className="text-center pb-4 pt-7 px-5 relative z-10">
                        <CardTitle className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">
                          {plan.name}
                        </CardTitle>
                        
                        <div className="space-y-1 mt-2">
                          <p className="text-4xl md:text-5xl font-black text-white tracking-tight font-mono">
                            ${plan.pricePerMonth}
                          </p>
                          <p className="text-xs text-slate-400 font-medium">/month • {plan.duration}</p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4 px-5 pb-5 relative z-10">
                        {/* Pricing breakdown */}
                        <div className="space-y-2 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-medium">Original</span>
                            <span className="line-through text-slate-500">${plan.totalPrice}</span>
                          </div>
                          
                          {appliedCoupon && isPlanApplicable ? (
                            <>
                              <div className="h-px bg-white/10" />
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-300">Final</span>
                                <span className="text-xl font-bold text-emerald-400 font-mono">
                                  ${finalPrice.toFixed(0)}
                                </span>
                              </div>
                              <div className="bg-emerald-500/10 rounded-lg px-2.5 py-1 border border-emerald-500/20">
                                <p className="text-emerald-400 text-center font-bold text-xs">
                                  💰 Save ${savings.toFixed(0)}
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="h-px bg-white/10" />
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-xs text-slate-300">Total Pay</span>
                                <span className="text-xl font-bold text-purple-400 font-mono">
                                  ${originalPrice}
                                </span>
                              </div>
                            </>
                          )}

                          {appliedCoupon && !isPlanApplicable && (
                            <div className="bg-amber-500/10 rounded-lg px-2.5 py-1 border border-amber-500/20">
                              <p className="text-amber-400 text-center text-xs flex items-center justify-center gap-1 font-semibold">
                                <AlertCircle className="h-3 w-3" />
                                Coupon not applicable
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Features list */}
                        <div className="space-y-2">
                          {features.slice(0, 4).map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                              <span className="text-xs md:text-sm text-slate-300 font-medium">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* CTA Button */}
                        <Button 
                          className="w-full h-11 text-xs md:text-sm font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] transition-all mt-2" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPlan(plan);
                          }}
                        >
                          SELECT PLAN
                        </Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex border-white/10 bg-[#14172a] text-white hover:bg-purple-900" />
            <CarouselNext className="hidden sm:flex border-white/10 bg-[#14172a] text-white hover:bg-purple-900" />
          </Carousel>
          
          {/* Dot indicators for mobile */}
          <div className="flex justify-center gap-2 mt-4 sm:hidden">
            {plans.map((_, index) => (
              <button
                key={index}
                onClick={() => planCarouselApi?.scrollTo(index)}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  currentPlanIndex === index 
                    ? 'bg-purple-500 w-6' 
                    : 'bg-white/20 hover:bg-white/40'
                }`}
                aria-label={`Go to plan ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Affiliate Banner Carousel */}
        <div className="max-w-5xl mx-auto">
          <AffiliateBannerCarousel />
        </div>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f1222] border border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-white">Complete Your Payment</DialogTitle>
            </DialogHeader>
            
            {paymentDetails && (
              <div className="space-y-6 pt-2">
                {/* Order Summary */}
                <Card className="bg-white/[0.03] border-white/10 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-bold text-purple-300">Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Plan:</span>
                      <span className="font-semibold text-white">{paymentDetails.plan.name} - {selectedCategory}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Duration:</span>
                      <span className="font-semibold text-white">{paymentDetails.plan.duration}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Coupon Applied:</span>
                        <span className="font-bold">{appliedCoupon.code}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <div className="flex justify-between text-base font-black text-white">
                        <span>Total Payable Amount:</span>
                        <span className="text-purple-400 font-mono">${paymentDetails.finalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Instructions */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-slate-300 mb-2 block">Step 1: Select Cryptocurrency</Label>
                    <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                      <SelectTrigger className="h-11 bg-white/[0.05] border-white/10 text-white focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#14172a] border border-white/10 text-white z-50">
                        {cryptoOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-300 mb-2 block">Step 2: Copy Wallet Address</Label>
                    <div className="flex gap-2">
                      <Input
                        value={cryptoAddresses[selectedCrypto]}
                        readOnly
                        className="font-mono text-xs md:text-sm bg-white/[0.05] border-white/10 text-white"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(cryptoAddresses[selectedCrypto])}
                        className="border-white/10 bg-white/[0.05] hover:bg-purple-600 hover:text-white shrink-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <Alert className="border-purple-500/30 bg-purple-500/10 text-slate-300">
                    <AlertCircle className="h-4 w-4 text-purple-400" />
                    <AlertDescription>
                      <div className="space-y-1 text-xs">
                        <p className="font-bold text-white">Step 3: Send & Contact</p>
                        <p>Send <span className="font-bold text-purple-300">${paymentDetails.finalPrice.toFixed(2)}</span> in {cryptoOptions.find(o => o.value === selectedCrypto)?.label}.</p>
                        <p>After payment, send your transaction ID / screenshot to our WhatsApp support team for instant activation.</p>
                      </div>
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
