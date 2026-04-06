import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, Copy, RefreshCw } from "lucide-react";

const CryptoDeposit = () => {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCurrencies, setLoadingCurrencies] = useState(true);
  const [amount, setAmount] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    if (paymentData?.payment_id) {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentData]);

  const fetchCurrencies = async () => {
    try {
      setLoadingCurrencies(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke('nowpayments-currencies');

      if (error) throw error;

      if (data?.currencies) {
        // Filter for popular cryptocurrencies
        const popularCryptos = ['btc', 'eth', 'usdt', 'usdttrc20', 'bnb', 'ltc', 'doge', 'trx'];
        const filtered = data.currencies.filter((c: string) => 
          popularCryptos.includes(c.toLowerCase())
        );
        setCurrencies(filtered);
      }
    } catch (error) {
      console.error("Error fetching currencies:", error);
      toast.error("Failed to load cryptocurrencies");
    } finally {
      setLoadingCurrencies(false);
    }
  };

  const createPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!selectedCrypto) {
      toast.error("Please select a cryptocurrency");
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke('nowpayments-create-payment', {
        body: {
          price_amount: amount,
          pay_currency: selectedCrypto,
        },
      });

      if (error) throw error;

      setPaymentData(data);
      toast.success("✅ Payment created successfully! Please send your deposit.");
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("Failed to create payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentData?.payment_id) return;

    try {
      setChecking(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('nowpayments-check-payment', {
        body: {
          payment_id: paymentData.payment_id,
        },
      });

      if (error) throw error;

      if (data.payment_status === 'finished') {
        toast.success("🎉 Deposit confirmed! Your balance has been updated.");
        setTimeout(() => {
          navigate("/profile");
        }, 2000);
      } else if (data.payment_status === 'failed' || data.payment_status === 'expired') {
        toast.error("Payment failed or expired. Please try again.");
        setPaymentData(null);
      }
    } catch (error) {
      console.error("Error checking payment:", error);
    } finally {
      setChecking(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Crypto Deposit</CardTitle>
              <CardDescription>
                Fund your account with cryptocurrency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!paymentData ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (USD)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="1"
                      step="0.01"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crypto">Select Cryptocurrency</Label>
                    {loadingCurrencies ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : (
                      <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose cryptocurrency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Button
                    onClick={createPayment}
                    disabled={loading || loadingCurrencies}
                    className="w-full bg-warning hover:bg-warning/90 text-black font-semibold"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Payment...
                      </>
                    ) : (
                      "Proceed to Pay"
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-success/10 border border-success/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                      <div>
                        <p className="font-semibold text-success">Payment Created Successfully!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Please send your deposit to the address below
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Payment Address</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-3 bg-muted rounded text-sm break-all">
                          {paymentData.pay_address}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(paymentData.pay_address)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground">Amount to Send</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="flex-1 p-3 bg-muted rounded text-sm">
                          {paymentData.pay_amount} {selectedCrypto.toUpperCase()}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(paymentData.pay_amount)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={checkPaymentStatus}
                      disabled={checking}
                      variant="outline"
                      className="flex-1"
                    >
                      {checking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Checking...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Check Status
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setPaymentData(null)}
                      variant="ghost"
                    >
                      New Payment
                    </Button>
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    Status will auto-refresh every 30 seconds
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CryptoDeposit;