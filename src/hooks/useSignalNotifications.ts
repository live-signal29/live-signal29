import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationSettings {
  enabled: boolean;
  newSignal: boolean;
  signalClosed: boolean;
  tpHit: boolean;
  slHit: boolean;
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  newSignal: true,
  signalClosed: true,
  tpHit: true,
  slHit: true,
  soundEnabled: true,
};

export const useSignalNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const previousSignalsRef = useRef<Map<string, any>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("notification_settings");
    if (stored) {
      try {
        setSettings(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to load notification settings:", error);
      }
    }
  }, []);

  // Save settings to localStorage
  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem("notification_settings", JSON.stringify(updated));
  };

  // Check notification permission
  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const requestPermission = async () => {
    if (!("Notification" in window)) {
      toast.error("This browser doesn't support notifications");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notifications enabled!");
        return true;
      } else if (result === "denied") {
        toast.error("Notification permission denied");
        return false;
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast.error("Failed to request notification permission");
      return false;
    }
    return false;
  };

  // Play notification sound
  const playNotificationSound = (type: "success" | "alert" | "info") => {
    if (!settings.soundEnabled) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Different sounds for different notification types
      switch (type) {
        case "success": // TP Hit
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case "alert": // SL Hit
          oscillator.frequency.value = 400;
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.5);
          break;
        case "info": // New Signal, Closed
          oscillator.frequency.value = 600;
          gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
      }
    } catch (error) {
      console.error("Error playing notification sound:", error);
    }
  };

  // Show browser notification
  const showNotification = (title: string, body: string, type: "success" | "alert" | "info") => {
    if (!settings.enabled || permission !== "granted") return;

    try {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: `signal-${Date.now()}`,
        requireInteraction: type === "alert",
      });

      playNotificationSound(type);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto close after 5 seconds (except alerts)
      if (type !== "alert") {
        setTimeout(() => notification.close(), 5000);
      }
    } catch (error) {
      console.error("Error showing notification:", error);
    }
  };

  // Monitor signals for changes (deferred to not block initial load)
  useEffect(() => {
    if (!settings.enabled || permission !== "granted") return;

    const timeoutId = setTimeout(() => {
      const channel = supabase
        .channel("signal-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "signals",
            filter: "published=eq.true",
          },
          (payload) => {
            if (settings.newSignal) {
              const signal = payload.new;
              showNotification(
                "🆕 New Signal Available!",
                `${signal.type} ${signal.pair} @ ${signal.entry}`,
                "info"
              );
              toast.success(`New ${signal.type} signal: ${signal.pair}`);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "signals",
            filter: "published=eq.true",
          },
          (payload) => {
            const oldSignal = payload.old;
            const newSignal = payload.new;

            // Check for TP hits
            if (settings.tpHit) {
              if (!oldSignal.tp1_hit && newSignal.tp1_hit) {
                showNotification(
                  "🎯 Take Profit 1 Hit!",
                  `${newSignal.pair} - TP1 reached at ${newSignal.tp1}`,
                  "success"
                );
                toast.success(`TP1 hit on ${newSignal.pair}!`);
              }
              if (!oldSignal.tp2_hit && newSignal.tp2_hit) {
                showNotification(
                  "🎯 Take Profit 2 Hit!",
                  `${newSignal.pair} - TP2 reached at ${newSignal.tp2}`,
                  "success"
                );
                toast.success(`TP2 hit on ${newSignal.pair}!`);
              }
              if (!oldSignal.tp3_hit && newSignal.tp3_hit) {
                showNotification(
                  "🎯 Take Profit 3 Hit!",
                  `${newSignal.pair} - TP3 reached at ${newSignal.tp3}`,
                  "success"
                );
                toast.success(`TP3 hit on ${newSignal.pair}!`);
              }
            }

            // Check for SL hit
            if (settings.slHit && !oldSignal.sl_hit && newSignal.sl_hit) {
              showNotification(
                "⚠️ Stop Loss Hit!",
                `${newSignal.pair} - SL hit at ${newSignal.sl}`,
                "alert"
              );
              toast.error(`Stop loss hit on ${newSignal.pair}`);
            }

            // Check for signal closed
            if (
              settings.signalClosed &&
              oldSignal.signal_status !== "CLOSE" &&
              newSignal.signal_status === "CLOSE"
            ) {
              showNotification(
                "✅ Signal Closed",
                `${newSignal.pair} signal has been closed`,
                "info"
              );
              toast.info(`${newSignal.pair} signal closed`);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, 3000); // Defer by 3 seconds

    return () => clearTimeout(timeoutId);
  }, [settings, permission]);

  return {
    permission,
    settings,
    requestPermission,
    updateSettings,
    isSupported: "Notification" in window,
  };
};
