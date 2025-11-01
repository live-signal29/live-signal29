import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Payment confirmation will be handled by webhook
    // This page is just a success confirmation for the user
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-success/50 shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-success/10 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-success" />
              </div>
            </div>
            <CardTitle className="text-2xl">
              Payment Successful! 🎉
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground text-lg">
              Your premium subscription has been activated. You now have full access to all trading signals!
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate("/signals")}
                className="w-full bg-success hover:bg-success/90"
                size="lg"
              >
                View Trading Signals
              </Button>
              
              <Button 
                onClick={() => navigate("/profile")}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Go to Profile
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Check your email for payment confirmation and receipt
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default PaymentSuccess;
