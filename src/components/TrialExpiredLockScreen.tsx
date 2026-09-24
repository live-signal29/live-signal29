import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock } from "lucide-react";

const TrialExpiredLockScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-warning/50 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-warning/10 p-4 rounded-full">
              <Lock className="h-12 w-12 text-warning" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            🔒 Trial Expired
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground text-lg">
            Your free trial has expired. Unlock premium access to continue receiving live trading signals.
          </p>
          
          <div className="space-y-3">
            <Button 
              onClick={() => navigate("/premium#plans-section")}
              className="w-full bg-warning hover:bg-warning/90 text-black font-semibold text-lg py-6"
              size="lg"
            >
              🚀 Buy Premium Access
            </Button>
            
            <p className="text-xs text-muted-foreground">
              Get unlimited access to all trading signals
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrialExpiredLockScreen;
