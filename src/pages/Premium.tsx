import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import CountdownTimer from "@/components/CountdownTimer";
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

const Premium = () => {
  const [selectedCategory, setSelectedCategory] = useState("COMMODITY");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [selectedCrypto, setSelectedCrypto] = useState("USDT_TRC20");

  const autoplayPlugin = Autoplay({ delay: 3000, stopOnInteraction: true });

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

  // Fetch active special offer
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
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Banner Carousel - Auto-sliding */}
        <div className="mb-8">
          <Carousel 
            className="w-full max-w-5xl mx-auto"
            plugins={[autoplayPlugin]}
            opts={{ loop: true }}
          >
            <CarouselContent>
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-20"></div>
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-3 drop-shadow-lg animate-pulse">HAPPY NEW YEAR 🎊</h2>
                    <p className="text-xl md:text-3xl font-semibold drop-shadow-md">2025 Special Offer</p>
                  </div>
                </div>
              </CarouselItem>
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
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

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
              {plans.map((plan) => {
                const originalPrice = plan.payOnly;
                const finalPrice = calculateFinalPrice(originalPrice, plan.name);
                const savings = originalPrice - finalPrice;
                const isPlanApplicable = !appliedCoupon || 
                  !appliedCoupon.applicable_plans || 
                  appliedCoupon.applicable_plans.length === 0 || 
                  appliedCoupon.applicable_plans.includes(plan.name);

                return (
                  <CarouselItem key={plan.name} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                    <Card className={`relative h-full ${plan.popular ? 'border-primary border-2 shadow-lg shadow-primary/20' : ''}`}>
                      {plan.popular && (
                        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                          ⭐ Most Popular
                        </Badge>
                      )}
                      
                      <CardHeader className="text-center pb-4 pt-6">
                        <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                        <div className="space-y-1">
                          <p className="text-4xl font-bold text-primary">${plan.pricePerMonth}</p>
                          <p className="text-sm text-muted-foreground">per month</p>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="space-y-2 py-4 border-t border-b">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Actual Price:</span>
                            <span className="line-through">${plan.totalPrice}</span>
                          </div>
                          
                          {appliedCoupon && isPlanApplicable ? (
                            <>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Base Price:</span>
                                <span className="line-through text-muted-foreground">${originalPrice}</span>
                              </div>
                              <div className="flex justify-between text-base font-bold">
                                <span>Final Price:</span>
                                <span className="text-success text-xl">${finalPrice.toFixed(2)}</span>
                              </div>
                              <Alert className="border-success bg-success/10 py-2">
                                <AlertDescription className="text-success text-center font-semibold text-sm">
                                  💰 You save ${savings.toFixed(2)}!
                                </AlertDescription>
                              </Alert>
                            </>
                          ) : (
                            <div className="flex justify-between text-base font-bold">
                              <span>Pay Only:</span>
                              <span className="text-primary text-xl">${originalPrice}</span>
                            </div>
                          )}
                          
                          {plan.discount && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground text-sm">Base Discount:</span>
                              <Badge variant="secondary" className="font-semibold">{plan.discount}</Badge>
                            </div>
                          )}

                          {appliedCoupon && !isPlanApplicable && (
                            <Alert className="border-warning bg-warning/10 py-2">
                              <AlertCircle className="h-4 w-4 text-warning" />
                              <AlertDescription className="text-warning text-xs">
                                Coupon not applicable to this plan
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>

                        <div className="space-y-2">
                          {features.map((feature, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                              <span className="text-sm">{feature}</span>
                            </div>
                          ))}
                          <div className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                            <span className="text-sm font-semibold">{plan.duration} validity</span>
                          </div>
                        </div>

                        <Button 
                          className="w-full bg-primary hover:bg-primary/90 font-semibold text-base h-11" 
                          onClick={() => handleSelectPlan(plan)}
                        >
                          SELECT PLAN
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

      <BrokerAccountButton />
      <Footer />
    </div>
  );
};

export default Premium;
