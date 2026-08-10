import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Check,
  X,
  Gift,
  BarChart3,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useNotifications } from "@/hooks/useNotifications";
import { format } from "date-fns"; // 'formatDistanceToNow' ki jagah 'format' import kiya hai
import { cn } from "@/lib/utils";

// Helper function: Exact time format (e.g., 05:02 PM)
const formatExactTime = (dateString: string | Date) => {
  if (!dateString) return "";
  try {
    return format(new Date(dateString), "hh:mm a");
  } catch (error) {
    return "";
  }
};

export const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  /*
   * ============================================================
   * AUTO POPUP STATE
   * ============================================================
   */

  const [popupNotification, setPopupNotification] =
    useState<(typeof notifications)[number] | null>(null);

  const [popupVisible, setPopupVisible] = useState(false);

  /*
   * IDs already shown as floating popup.
   *
   * Ref is used instead of state so it does NOT cause
   * unnecessary component re-renders.
   */
  const shownPopupIds = useRef<Set<string>>(new Set());

  /*
   * Timer reference so multiple timers don't run together.
   */
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
   * First load protection.
   *
   * Existing old notifications should NOT suddenly fly onto
   * the screen when the page initially loads.
   */
  const initializedRef = useRef(false);

  /*
   * ============================================================
   * NOTIFICATION ICON
   * ============================================================
   */

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "coupon":
        return {
          icon: Gift,
          emoji: "🎉",
          className: "text-amber-500",
          bg: "bg-amber-500/10",
        };

      case "signal":
        return {
          icon: BarChart3,
          emoji: "📊",
          className: "text-emerald-500",
          bg: "bg-emerald-500/10",
        };

      case "system":
        return {
          icon: Bell,
          emoji: "🔔",
          className: "text-blue-500",
          bg: "bg-blue-500/10",
        };

      default:
        return {
          icon: Info,
          emoji: "ℹ️",
          className: "text-primary",
          bg: "bg-primary/10",
        };
    }
  };

  /*
   * ============================================================
   * AUTO FLOATING NOTIFICATION
   * ============================================================
   */

  useEffect(() => {
    /*
     * Wait until notifications have loaded.
     */
    if (isLoading) {
      return;
    }

    /*
     * First load:
     * Mark existing notifications as already seen by popup.
     *
     * This prevents 50 old notifications from appearing
     * when the user opens/reloads the dashboard.
     */
    if (!initializedRef.current) {
      notifications.forEach((notification) => {
        shownPopupIds.current.add(notification.id);
      });

      initializedRef.current = true;
      return;
    }

    /*
     * Find the newest unread notification that hasn't
     * already been displayed as a popup.
     */
    const newNotification = notifications.find(
      (notification) =>
        !notification.read &&
        !shownPopupIds.current.has(notification.id)
    );

    if (!newNotification) {
      return;
    }

    /*
     * Mark it locally as displayed.
     */
    shownPopupIds.current.add(newNotification.id);

    /*
     * Clear previous hide timer if another notification
     * arrives quickly.
     */
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    /*
     * Show popup.
     */
    setPopupNotification(newNotification);

    /*
     * Small timeout lets CSS transition animate smoothly.
     */
    requestAnimationFrame(() => {
      setPopupVisible(true);
    });

    /*
     * Automatically hide after 5 seconds.
     *
     * IMPORTANT:
     * We do NOT mark the notification as read here.
     * It remains unread until the user opens/clicks it.
     */
    hideTimerRef.current = setTimeout(() => {
      setPopupVisible(false);

      /*
       * Wait for slide-out animation before removing it.
       */
      setTimeout(() => {
        setPopupNotification(null);
      }, 300);
    }, 5000);

    /*
     * Cleanup.
     */
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [notifications, isLoading]);

  /*
   * ============================================================
   * COMPONENT UNMOUNT CLEANUP
   * ============================================================
   */

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  /*
   * ============================================================
   * CLOSE POPUP
   * ============================================================
   */

  const closePopup = () => {
    setPopupVisible(false);

    window.setTimeout(() => {
      setPopupNotification(null);
    }, 300);
  };

  /*
   * ============================================================
   * POPUP CLICK
   * ============================================================
   */

  const handlePopupClick = () => {
    if (!popupNotification) {
      return;
    }

    const notification = popupNotification;

    closePopup();

    /*
     * Existing notification navigation/action.
     */
    handleNotificationClick(notification);
  };

  /*
   * ============================================================
   * POPUP DATA
   * ============================================================
   */

  const popupIconData = popupNotification
    ? getNotificationIcon(popupNotification.type)
    : null;

  const PopupIcon = popupIconData?.icon;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <>
      {/* ======================================================
          FLOATING AUTO NOTIFICATION
          ====================================================== */}

      {popupNotification && popupIconData && (
        <div
          className={cn(
            "fixed top-3 right-3 z-[9999] w-[min(360px,calc(100vw-24px))]",
            "transition-all duration-300 ease-out",
            popupVisible
              ? "translate-x-0 opacity-100"
              : "translate-x-[calc(100%+20px)] opacity-0 pointer-events-none"
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden",
              "rounded-2xl border border-border/60",
              "bg-background/95 backdrop-blur-xl",
              "shadow-2xl",
              "cursor-pointer"
            )}
            onClick={handlePopupClick}
          >
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-[2px] bg-primary" />

            <div className="flex items-start gap-3 p-3.5">
              {/* Notification Icon */}
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center",
                  "rounded-xl",
                  popupIconData.bg
                )}
              >
                {PopupIcon ? (
                  <PopupIcon
                    className={cn(
                      "h-5 w-5",
                      popupIconData.className
                    )}
                  />
                ) : (
                  <span className="text-lg">
                    {popupIconData.emoji}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      New Notification
                    </p>

                    <h4 className="mt-0.5 line-clamp-1 text-sm font-bold text-foreground">
                      {popupNotification.title}
                    </h4>
                  </div>

                  {/* Close */}
                  <button
                    type="button"
                    aria-label="Close notification"
                    onClick={(event) => {
                      event.stopPropagation();
                      closePopup();
                    }}
                    className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {popupNotification.message}
                </p>

                {/* EXACT TIME DISPLAY (e.g. 05:02 PM) */}
                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  {formatExactTime(
                    (popupNotification as any).updated_at ||
                      popupNotification.created_at
                  )}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-[2px] w-full overflow-hidden bg-muted">
              <div
                className={cn(
                  "h-full bg-primary",
                  popupVisible
                    ? "animate-[notification-progress_5s_linear_forwards]"
                    : "w-0"
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          HEADER BELL
          ====================================================== */}

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />

            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className={cn(
                  "absolute -top-1 -right-1",
                  "h-5 min-w-5 px-1",
                  "flex items-center justify-center",
                  "text-[10px]",
                  "animate-pulse"
                )}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[min(380px,calc(100vw-24px))] p-0"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-semibold">
                Notifications
              </h3>

              {unreadCount > 0 && (
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {unreadCount} unread
                </p>
              )}
            </div>

            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-8 text-xs"
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notification List */}
          <ScrollArea className="h-[400px]">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Bell className="h-6 w-6 text-muted-foreground/50" />
                </div>

                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => {
                  const iconData =
                    getNotificationIcon(
                      notification.type
                    );

                  const Icon =
                    iconData.icon;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() =>
                        handleNotificationClick(
                          notification
                        )
                      }
                      className={cn(
                        "w-full text-left p-4",
                        "transition-colors",
                        "hover:bg-muted/50",
                        !notification.read &&
                          "bg-primary/5"
                      )}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            iconData.bg
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4",
                              iconData.className
                            )}
                          />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">
                              {notification.title}
                            </p>

                            {!notification.read && (
                              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                            )}
                          </div>

                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {notification.message}
                          </p>

                          {/* EXACT TIME DISPLAY (e.g. 05:02 PM) */}
                          <p className="mt-2 text-xs text-muted-foreground/70">
                            {formatExactTime(
                              (notification as any).updated_at ||
                                notification.created_at
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {notifications.length > 0 && (
            <>
              <Separator />

              <div className="p-2 text-center">
                <p className="text-xs text-muted-foreground">
                  Showing last 50 notifications
                </p>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      {/* ======================================================
          ANIMATION
          ====================================================== */}

      <style>{`
        @keyframes notification-progress {
          from {
            width: 100%;
          }

          to {
            width: 0%;
          }
        }
      `}</style>
    </>
  );
};
