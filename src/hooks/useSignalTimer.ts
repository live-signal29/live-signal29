import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TimerState {
  timeRemaining: number; // in seconds
  isExpired: boolean;
  formattedTime: string;
}

export const useSignalTimer = (signalId: string, expiryTime: string | null) => {
  const [timerState, setTimerState] = useState<TimerState>({
    timeRemaining: 0,
    isExpired: false,
    formattedTime: "--:--:--",
  });

  const formatTime = useCallback((seconds: number): string => {
    if (seconds <= 0) return "00:00:00";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const markSignalExpired = useCallback(async () => {
    try {
      // Update signal status to CLOSE when timer expires
      const { error } = await supabase
        .from("signals")
        .update({ signal_status: "CLOSE", auto_closed: true })
        .eq("id", signalId)
        .eq("signal_status", "OPEN"); // Only close if still open

      if (error) {
        console.error("Error marking signal expired:", error);
      }
    } catch (err) {
      console.error("Error in markSignalExpired:", err);
    }
  }, [signalId]);

  useEffect(() => {
    if (!expiryTime) {
      setTimerState({
        timeRemaining: 0,
        isExpired: false,
        formattedTime: "--:--:--",
      });
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryTime).getTime();
      const remaining = Math.floor((expiry - now) / 1000);
      
      return Math.max(0, remaining);
    };

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      const isExpired = remaining <= 0;
      
      setTimerState({
        timeRemaining: remaining,
        isExpired,
        formattedTime: formatTime(remaining),
      });

      if (isExpired) {
        markSignalExpired();
      }
    };

    // Initial calculation
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiryTime, formatTime, markSignalExpired]);

  return timerState;
};

// Hook to get all active signal timers
export const useActiveSignalTimers = (signals: Array<{ id: string; expiry_time?: string }>) => {
  const [timers, setTimers] = useState<Record<string, TimerState>>({});

  useEffect(() => {
    const updateAllTimers = () => {
      const newTimers: Record<string, TimerState> = {};
      
      signals.forEach((signal) => {
        if (signal.expiry_time) {
          const now = new Date().getTime();
          const expiry = new Date(signal.expiry_time).getTime();
          const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
          
          const hours = Math.floor(remaining / 3600);
          const minutes = Math.floor((remaining % 3600) / 60);
          const secs = remaining % 60;
          
          newTimers[signal.id] = {
            timeRemaining: remaining,
            isExpired: remaining <= 0,
            formattedTime: remaining > 0
              ? `${hours.toString().padStart(2, "0")}:${minutes
                  .toString()
                  .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
              : "EXPIRED",
          };
        }
      });
      
      setTimers(newTimers);
    };

    updateAllTimers();
    const interval = setInterval(updateAllTimers, 1000);

    return () => clearInterval(interval);
  }, [signals]);

  return timers;
};
