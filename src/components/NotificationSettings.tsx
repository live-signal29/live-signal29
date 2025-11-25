import { Bell, BellOff, Volume2, VolumeX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSignalNotifications } from "@/hooks/useSignalNotifications";

const NotificationSettings = () => {
  const { permission, settings, requestPermission, updateSettings, isSupported } = useSignalNotifications();

  if (!isSupported) {
    return (
      <Alert>
        <AlertDescription>
          Your browser doesn't support push notifications.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Get real-time alerts for signal updates
            </CardDescription>
          </div>
          <Badge variant={permission === "granted" ? "default" : "secondary"}>
            {permission === "granted" ? "Enabled" : permission === "denied" ? "Blocked" : "Not Set"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {permission === "default" && (
          <Alert>
            <AlertDescription className="flex items-center justify-between">
              <span>Enable notifications to receive real-time signal alerts</span>
              <Button onClick={requestPermission} size="sm">
                Enable Notifications
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {permission === "denied" && (
          <Alert variant="destructive">
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings.
            </AlertDescription>
          </Alert>
        )}

        {permission === "granted" && (
          <>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="notifications-enabled" className="text-base">
                    Enable Notifications
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Master toggle for all notifications
                  </p>
                </div>
                <Switch
                  id="notifications-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => updateSettings({ enabled: checked })}
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <p className="font-medium text-sm">Notification Types</p>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="new-signal" className="text-sm">
                      New Signal Posted
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when a new signal is published
                    </p>
                  </div>
                  <Switch
                    id="new-signal"
                    checked={settings.newSignal}
                    onCheckedChange={(checked) => updateSettings({ newSignal: checked })}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="tp-hit" className="text-sm">
                      Take Profit Hit
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when TP levels are reached
                    </p>
                  </div>
                  <Switch
                    id="tp-hit"
                    checked={settings.tpHit}
                    onCheckedChange={(checked) => updateSettings({ tpHit: checked })}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sl-hit" className="text-sm">
                      Stop Loss Hit
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when stop loss is triggered
                    </p>
                  </div>
                  <Switch
                    id="sl-hit"
                    checked={settings.slHit}
                    onCheckedChange={(checked) => updateSettings({ slHit: checked })}
                    disabled={!settings.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="signal-closed" className="text-sm">
                      Signal Closed
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Alert when a signal is closed
                    </p>
                  </div>
                  <Switch
                    id="signal-closed"
                    checked={settings.signalClosed}
                    onCheckedChange={(checked) => updateSettings({ signalClosed: checked })}
                    disabled={!settings.enabled}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sound-enabled" className="text-base flex items-center gap-2">
                      {settings.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                      Sound Alerts
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound with notifications
                    </p>
                  </div>
                  <Switch
                    id="sound-enabled"
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) => updateSettings({ soundEnabled: checked })}
                    disabled={!settings.enabled}
                  />
                </div>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Test Notifications</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    new Notification("🆕 Test: New Signal", {
                      body: "BUY EUR/USD @ 1.0850",
                      icon: "/favicon.svg",
                    });
                  }}
                  disabled={!settings.enabled}
                >
                  Test New Signal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    new Notification("🎯 Test: TP Hit", {
                      body: "EUR/USD - TP1 reached!",
                      icon: "/favicon.svg",
                    });
                  }}
                  disabled={!settings.enabled}
                >
                  Test TP Hit
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationSettings;
