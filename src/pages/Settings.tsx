import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotificationSettings from "@/components/NotificationSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ExternalLink } from "lucide-react";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=co.median.android.odrkwln";

// Keep in sync with APP_VERSION in SideDrawer.tsx
const APP_VERSION = "1.7.9";
const LAST_UPDATED = "Sep 5, 2026";

const Settings = () => {
  const handleRateUs = () => {
    window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8 sm:py-12 max-w-4xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">
          Settings
        </h1>

        <div className="space-y-6">
          {/* Notification Settings */}
          <NotificationSettings />

          {/* Rate Us */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Rate Us
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-medium">
                    Enjoying our app?
                  </p>

                  <p className="text-sm text-muted-foreground mt-1">
                    Your honest feedback helps us improve the app and provide
                    a better experience for everyone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRateUs}
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  <Star className="h-4 w-4" />
                  Rate Us
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  App Version
                </span>
                <span className="font-medium">{APP_VERSION}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">
                  Last Updated
                </span>
                <span className="font-medium">{LAST_UPDATED}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">
                  Platform
                </span>
                <span className="font-medium">
                  Web App
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
