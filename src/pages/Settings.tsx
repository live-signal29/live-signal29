import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

const Settings = () => {
  const [notifications, setNotifications] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleNotificationToggle = (checked: boolean) => {
    setNotifications(checked);
    toast.success(checked ? "Notifications enabled" : "Notifications disabled");
  };

  const handleEmailToggle = (checked: boolean) => {
    setEmailAlerts(checked);
    toast.success(checked ? "Email alerts enabled" : "Email alerts disabled");
  };

  const handleSoundToggle = (checked: boolean) => {
    setSoundEnabled(checked);
    toast.success(checked ? "Sound enabled" : "Sound disabled");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Settings</h1>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="notifications">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new signals
                    </p>
                  </div>
                  <Switch
                    id="notifications"
                    checked={notifications}
                    onCheckedChange={handleNotificationToggle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="email">Email Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Get signal updates via email
                    </p>
                  </div>
                  <Switch
                    id="email"
                    checked={emailAlerts}
                    onCheckedChange={handleEmailToggle}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound">Sound Alerts</Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when new signals arrive
                    </p>
                  </div>
                  <Switch
                    id="sound"
                    checked={soundEnabled}
                    onCheckedChange={handleSoundToggle}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">App Version</span>
                  <span className="font-medium">2.0.0</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="font-medium">Today</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <BrokerAccountButton />
      <Footer />
    </div>
  );
};

export default Settings;
