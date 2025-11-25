import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BrokerAccountButton } from "@/components/BrokerAccountButton";
import NotificationSettings from "@/components/NotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Settings = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Settings</h1>

        <div className="space-y-6">
          {/* Notification Settings */}
          <NotificationSettings />

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">App Version</span>
                <span className="font-medium">2.1.0</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">Today</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium">Web App</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <BrokerAccountButton />
      <Footer />
    </div>
  );
};

export default Settings;
