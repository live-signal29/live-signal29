import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Check, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Premium = () => {
  const [selectedCategory, setSelectedCategory] = useState("COMMODITY");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{code: string, discount: number} | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [selectedCrypto, setSelectedCrypto] = useState("USDT_TRC20");

  // Fixed wallet addresses
  const cryptoAddresses = {
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

  // Coupon codes
  const coupons: Record<string, number> = {
    "DIWALI65": 65,
    "WELCOME50": 50,
    "SAVE30": 30,
  };

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

  const applyCoupon = () => {
    const upperCode = couponCode.toUpperCase();
    if (coupons[upperCode]) {
      setAppliedCoupon({ code: upperCode, discount: coupons[upperCode] });
      toast.success(`Coupon applied! ${coupons[upperCode]}% discount`);
    } else {
      toast.error("Invalid coupon code");
    }
  };

  const calculateFinalPrice = (basePrice: number) => {
    if (!appliedCoupon) return basePrice;
    return basePrice - (basePrice * appliedCoupon.discount / 100);
  };

  const handleSelectPlan = async (plan: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please login first");
      return;
    }

    setShowPaymentDialog(true);
    setPaymentDetails({ plan, finalPrice: calculateFinalPrice(plan.payOnly) });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Carousel Section */}
        <div className="mb-8">
          <Carousel className="w-full max-w-4xl mx-auto">
            <CarouselContent>
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <h2 className="text-3xl md:text-5xl font-bold mb-2">HAPPY DIWALI</h2>
                    <p className="text-xl md:text-2xl">FESTIVAL OF LIGHTS</p>
                  </div>
                </div>
              </CarouselItem>
              <CarouselItem>
                <div className="relative h-48 md:h-64 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white p-6">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2">DIWALI OFFER</h2>
                    <p className="text-4xl md:text-6xl font-bold text-yellow-300 mb-2">65% OFF</p>
                    <p className="text-xl md:text-2xl font-semibold">TAKE PREMIUM NOW</p>
                  </div>
                </div>
              </CarouselItem>
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>

        {/* Coupon Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="coupon" className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-warning" />
                    Have a coupon code?
                  </Label>
                  <Input
                    id="coupon"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                    className="border-warning/30"
                  />
                </div>
                <Button 
                  onClick={applyCoupon}
                  variant="outline"
                  className="sm:mt-8 border-warning text-warning hover:bg-warning hover:text-black"
                >
                  Apply Coupon
                </Button>
              </div>
              {appliedCoupon && (
                <div className="mt-3 p-2 bg-success/10 border border-success/30 rounded text-sm text-success flex items-center justify-between">
                  <span>✓ {appliedCoupon.discount}% discount applied!</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setAppliedCoupon(null)}
                    className="h-6 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Selector */}
        <div className="max-w-4xl mx-auto mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Choose Your Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
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

        {/* Pricing Plans */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            {selectedCategory} Pricing Plans
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const originalPrice = plan.payOnly;
              const finalPrice = calculateFinalPrice(originalPrice);
              const savings = originalPrice - finalPrice;

              return (
                <Card key={plan.name} className={`relative ${plan.popular ? 'border-primary border-2' : ''}`}>
                  {plan.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                      Most Popular
                    </Badge>
                  )}
                  
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                    <div className="space-y-1">
                      <p className="text-3xl font-bold text-primary">${plan.pricePerMonth}</p>
                      <p className="text-sm text-muted-foreground">per month</p>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2 py-4 border-t border-b">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Actual Price:</span>
                        <span className="line-through">${plan.totalPrice}</span>
                      </div>
                      {appliedCoupon ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discounted:</span>
                            <span className="line-through text-muted-foreground">${originalPrice}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Final Price:</span>
                            <span className="text-success text-lg">${finalPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-success text-center">
                            You save ${savings.toFixed(2)} with coupon!
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm font-semibold">
                          <span>Pay Only:</span>
                          <span className="text-primary text-lg">${originalPrice}</span>
                        </div>
                      )}
                      {plan.discount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">Discount:</span>
                          <Badge variant="secondary">{plan.discount}</Badge>
                        </div>
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
                        <span className="text-sm">{plan.duration} validity</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full bg-warning hover:bg-warning/90 text-black font-semibold" 
                      size="lg"
                      onClick={() => handleSelectPlan(plan)}
                    >
                      SELECT
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Payment Methods Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              💳 We accept cryptocurrency payments
            </p>
            <p className="text-xs text-muted-foreground">
              Secure payment processing • BTC, ETH, USDT (TRC20), and BNB accepted
            </p>
          </div>
        </div>
      </main>

      <BrokerAccountButton />
      <Footer />

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Payment</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">📋 How to Complete Payment:</h3>
              <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                <li>Select your preferred cryptocurrency below</li>
                <li>Copy the wallet address shown</li>
                <li>Open your crypto wallet app</li>
                <li>Send the exact amount (${paymentDetails?.finalPrice?.toFixed(2)} USD equivalent)</li>
                <li>Contact support with your transaction ID for activation</li>
              </ol>
            </div>

            <div>
              <Label>Select Cryptocurrency</Label>
              <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                <SelectTrigger>
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

            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm mb-2">Plan: <strong>{paymentDetails?.plan?.name}</strong></p>
              <p className="text-sm mb-2">Category: <strong>{selectedCategory}</strong></p>
              <p className="text-2xl font-bold text-primary mb-3">
                Amount: ${paymentDetails?.finalPrice?.toFixed(2)} USD
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Wallet Address</Label>
                <div className="p-3 bg-muted rounded border mt-1 break-all font-mono text-sm">
                  {cryptoAddresses[selectedCrypto as keyof typeof cryptoAddresses]}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(cryptoAddresses[selectedCrypto as keyof typeof cryptoAddresses]);
                    toast.success("Address copied to clipboard!");
                  }}
                >
                  📋 Copy Address
                </Button>
              </div>

              <div className="p-3 bg-warning/10 border border-warning/30 rounded">
                <p className="text-xs font-semibold text-warning mb-1">
                  ⚠️ Important
                </p>
                <p className="text-xs text-muted-foreground">
                  After sending payment, please contact our support with your transaction ID to activate your subscription.
                </p>
              </div>
            </div>

            <Button 
              variant="outline"
              className="w-full"
              onClick={() => {
                setShowPaymentDialog(false);
                setPaymentDetails(null);
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Premium;
