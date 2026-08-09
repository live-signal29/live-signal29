import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CountdownTimer from "@/components/CountdownTimer";
import SEO from "@/components/SEO";

import {
  getProductStructuredData,
  getBreadcrumbStructuredData,
} from "@/components/StructuredData";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";

import {
  Check,
  Tag,
  Copy,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [transactionId, setTransactionId] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);

  const [bannerApi, setBannerApi] = useState<CarouselApi>();
  const [couponApi, setCouponApi] = useState<CarouselApi>();
  const [planCarouselApi, setPlanCarouselApi] = useState<CarouselApi>();
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);

  /* Auto Play logic without plugin dependency */
  useEffect(() => {
    if (!bannerApi) return;
    const timer = setInterval(() => {
      bannerApi.scrollNext();
    }, 3500);
    return () => clearInterval(timer);
  }, [bannerApi]);

  useEffect(() => {
    if (!couponApi) return;
    const timer = setInterval(() => {
      couponApi.scrollNext();
    }, 4500);
    return () => clearInterval(timer);
  }, [couponApi]);

  useEffect(() => {
    if (!planCarouselApi) return;

    const onSelect = () => {
      setCurrentPlanIndex(planCarouselApi.selectedScrollSnap());
    };

    planCarouselApi.on("select", onSelect);
    onSelect();

    return () => {
      planCarouselApi.off("select", onSelect);
    };
  }, [planCarouselApi]);

  /* SEO */
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      getProductStructuredData("Premium Trading Signals", 180, "USD"),
      getBreadcrumbStructuredData([
        { name: "Home", url: "https://livesignals29.online" },
        { name: "Premium Plans", url: "https://livesignals29.online/premium" },
      ]),
    ],
  };

  const cryptoAddresses: Record<string, string> = {
    USDT_TRC20: "TEeeH4G5uKcW41UXkLC7DDq9da8DPr7vH3",
    BTC: "1MFC63PWiPGWG1Z852t7oJ3pX8hGZYtPAU",
    BNB: "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",
    ETH: "0xf499d2ba461aaaad0a2f74c4fcfc16fc4fcaf365",
  };

  const cryptoOptions = [
    { value: "USDT_TRC20", label: "USDT (TRC20)" },
    { value: "BTC", label: "Bitcoin (BTC)" },
    { value: "BNB", label: "Binance Coin (BNB)" },
    { value: "ETH", label: "Ethereum (ETH)" },
  ];

  const categories = ["FOREX", "COMMODITY", "INDEX", "CRYPTO"];

  const { data: specialOffers } = useQuery({
    queryKey: ["special-offers-carousel"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.from("special_offers" as any) as any)
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) return [];
        return (data || []) as any[];
      } catch {
        return [];
      }
    },
  });

  const { data: activeOffer } = useQuery({
    queryKey: ["active-special-offer"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.from("special_offers" as any) as any)
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) return null;
        return data && data.length > 0 ? (data[0] as any) : null;
      } catch {
        return null;
      }
    },
  });

  const { data: activeCoupons } = useQuery({
    queryKey: ["active-coupons-banner"],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase.from("coupons" as any) as any)
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) return [];

        return ((data || []) as any[]).filter((coupon) => {
          if (!coupon.expiry_date) return true;
          return new Date(coupon.expiry_date) > new Date();
        });
      } catch {
        return [];
      }
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

  const applyCoupon = async (codeOverride?: string) => {
    const upperCode = (codeOverride ?? couponCode).toUpperCase().trim();

    if (!upperCode) {
      toast.error("Please enter a coupon code");
      return;
    }

    setValidatingCoupon(true);

    try {
      const { data: coupons, error } = await (supabase.from("coupons" as any) as any)
        .select("*")
        .eq("code", upperCode)
        .eq("is_active", true)
        .limit(1);

      const coupon = coupons && coupons.length > 0 ? coupons[0] : null;

      if (error || !coupon) {
        setAppliedCoupon(null);
        toast.error("Invalid or expired coupon code");
        return;
      }

      setCouponCode(coupon.code);
      setAppliedCoupon(coupon);

      toast.success("Coupon applied!");
    } catch (error) {
      toast.error("Failed to validate coupon");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const calculateFinalPrice = (basePrice: number, planName: string) => {
    if (!appliedCoupon) return basePrice;

    if (
      appliedCoupon.applicable_plans &&
      appliedCoupon.applicable_plans.length > 0
    ) {
      if (!appliedCoupon.applicable_plans.includes(planName)) {
        return basePrice;
      }
    }

    if (appliedCoupon.discount_type === "percentage") {
      return Math.max(
        0,
        basePrice - (basePrice * Number(appliedCoupon.discount_value)) / 100
      );
    }

    return Math.max(0, basePrice - Number(appliedCoupon.discount_value));
  };

  const handleSelectPlan = async (plan: any) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Please login first");
      return;
    }

    const finalPrice = calculateFinalPrice(plan.payOnly, plan.name);

    setPaymentSubmitted(false);
    setTransactionId("");

    setPaymentDetails({
      plan,
      finalPrice,
      originalPrice: plan.payOnly,
    });

    setShowPaymentDialog(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Wallet address copied!");
    } catch {
      toast.error("Failed to copy address");
    }
  };

  const handleSubmitPayment = async () => {
    const txId = transactionId.trim();

    if (!txId) {
      toast.error("Please enter your transaction ID");
      return;
    }

    if (!paymentDetails) {
      toast.error("Payment details are missing");
      return;
    }

    setSubmittingPayment(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please login first");
        return;
      }

      const { error } = await (supabase.from("payment_submissions" as any) as any).insert({
        user_id: user.id,
        plan_name: paymentDetails.plan.name,
        category: selectedCategory,
        duration: paymentDetails.plan.duration,
        amount: paymentDetails.finalPrice,
        cryptocurrency: selectedCrypto,
        wallet_address: cryptoAddresses[selectedCrypto],
        transaction_id: txId,
        coupon_code: appliedCoupon?.code || null,
        status: "pending",
      });

      if (error) throw error;

      setPaymentSubmitted(true);
      toast.success("Payment submitted successfully!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title="Premium Trading Signals Plans - TREND IS FRIEND"
        description="Choose from flexible monthly, quarterly, half-yearly, and yearly premium plans."
        keywords="premium trading signals, subscription plans"
        url="https://livesignals29.online/premium"
        structuredData={structuredData}
      />

      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* BANNER CAROUSEL */}
        <div className="mb-8">
          <Carousel
            className="w-full max-w-5xl mx-auto"
            setApi={setBannerApi}
            opts={{ loop: true }}
          >
            <CarouselContent>
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-4xl md:text-6xl font-bold mb-3 drop-shadow-lg">
                      HAPPY NEW YEAR 🎊
                    </h2>
                    <p className="text-xl md:text-3xl font-semibold">
                      2026 Special Offer
                    </p>
                  </div>
                </div>
              </CarouselItem>

              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-yellow-500 via-red-500 to-pink-500 rounded-xl flex items-center justify-center overflow-hidden">
                  <div className="text-center text-white p-6 relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold mb-3">
                      LIMITED TIME OFFER
                    </h2>
                    <p className="text-5xl md:text-7xl font-bold text-yellow-300 mb-3">
                      UP TO 50% OFF
                    </p>
                  </div>
                </div>
              </CarouselItem>

              {specialOffers?.map((offer: any, index: number) => (
                <CarouselItem key={offer.id || index}>
                  <div className="relative h-48 md:h-64 bg-gradient-to-br from-green-500 via-teal-500 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
                    <div className="text-center text-white p-6 relative z-10">
                      <Badge className="mb-4 bg-white/20 text-white">
                        🎁 SPECIAL OFFER
                      </Badge>
                      <h2 className="text-3xl md:text-6xl font-extrabold mb-3">
                        {offer.title}
                      </h2>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>
        </div>

        {/* COUPON BANNER */}
        {activeCoupons && activeCoupons.length > 0 && (
          <div className="max-w-5xl mx-auto mb-8">
            <Carousel className="w-full" setApi={setCouponApi} opts={{ loop: true }}>
              <CarouselContent>
                {activeCoupons.map((coupon: any) => (
                  <CarouselItem key={coupon.id}>
                    <Card className="border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/5">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-4 flex-1">
                            <Tag className="h-6 w-6 text-primary" />
                            <div>
                              <h3 className="text-lg font-bold text-primary">
                                🎉 Discount Available!
                              </h3>
                              <p className="text-sm">
                                Code: <span className="font-bold">{coupon.code}</span>
                              </p>
                            </div>
                          </div>
                          <Button onClick={() => applyCoupon(coupon.code)}>
                            Apply Now
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

        {/* COUNTDOWN */}
        {activeOffer && (
          <CountdownTimer
            endDate={new Date(activeOffer.end_date)}
            title={activeOffer.title}
            description={activeOffer.description || undefined}
          />
        )}

        {/* COUPON INPUT */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="coupon">Have a coupon code?</Label>
                  <Input
                    id="coupon"
                    placeholder="Enter coupon"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button onClick={() => applyCoupon()} className="sm:mt-8">
                  Apply Coupon
                </Button>
              </div>

              {appliedCoupon && (
                <Alert className="mt-4 border-emerald-500 bg-emerald-500/10">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="flex items-center justify-between">
                    <span>Coupon "{appliedCoupon.code}" applied!</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponCode("");
                      }}
                    >
                      Remove
                    </Button>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CATEGORY */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Choose Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-12 text-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        {/* PRICING */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            {selectedCategory} Plans
          </h2>

          <Carousel className="w-full" setApi={setPlanCarouselApi} opts={{ loop: true }}>
            <CarouselContent className="-ml-2 md:-ml-4">
              {plans.map((plan) => {
                const originalPrice = plan.payOnly;
                const finalPrice = calculateFinalPrice(originalPrice, plan.name);

                return (
                  <CarouselItem
                    key={plan.name}
                    className="pl-3 md:pl-4 basis-[90%] sm:basis-1/2 lg:basis-1/4"
                  >
                    <Card
                      className="cursor-pointer hover:shadow-xl transition-all"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      <CardHeader className="text-center">
                        <CardTitle>{plan.name}</CardTitle>
                        <p className="text-4xl font-extrabold">${plan.pricePerMonth}</p>
                        <p className="text-xs text-muted-foreground">/{plan.duration}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center text-sm">
                          <span>Total</span>
                          <span className="font-bold text-lg">${finalPrice}</span>
                        </div>

                        <div className="space-y-1">
                          {features.map((f, i) => (
                            <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                              <Check className="h-3 w-3 text-emerald-500" /> {f}
                            </p>
                          ))}
                        </div>

                        <Button className="w-full">Select Plan</Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                );
              })}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex" />
            <CarouselNext className="hidden sm:flex" />
          </Carousel>
        </div>

        {/* AFFILIATE */}
        <div className="max-w-5xl mx-auto mt-8">
          <AffiliateBannerCarousel />
        </div>

        {/* PAYMENT DIALOG */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Complete Payment</DialogTitle>
            </DialogHeader>

            {paymentDetails && !paymentSubmitted && (
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-bold">{paymentDetails.plan.name} Plan</p>
                  <p className="text-xl font-black text-primary">
                    ${paymentDetails.finalPrice}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Crypto Method</Label>
                  <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cryptoOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <div className="flex gap-2">
                    <Input value={cryptoAddresses[selectedCrypto]} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(cryptoAddresses[selectedCrypto])}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Transaction ID (TxID)</Label>
                  <Input
                    placeholder="Enter TxID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmitPayment}
                  disabled={submittingPayment || !transactionId}
                >
                  {submittingPayment ? "Submitting..." : "Submit Payment"}
                </Button>
              </div>
            )}

            {paymentSubmitted && (
              <div className="text-center py-6 space-y-3">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <h3 className="text-lg font-bold">Payment Submitted!</h3>
                <p className="text-sm text-muted-foreground">
                  Verification usually takes a few minutes.
                </p>
                <Button onClick={() => setShowPaymentDialog(false)}>Close</Button>
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
