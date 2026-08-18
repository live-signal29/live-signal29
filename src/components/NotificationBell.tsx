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
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export const NotificationBell = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

  const [popupNotification, setPopupNotification] =
    useState<(typeof notifications)[number] | null>(null);

  const [popupVisible, setPopupVisible] = useState(false);

  const shownPopupIds = useRef<Set<string>>(new Set());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

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

  useEffect(() => {
    if (isLoading) return;

    if (!initializedRef.current) {
      notifications.forEach((notification) => {
        shownPopupIds.current.add(notification.id);
      });
      initializedRef.current = true;
      return;
    }

    const newNotification = notifications.find(
      (notification) =>
        !notification.read &&
        !shownPopupIds.current.has(notification.id)
    );

    if (!newNotification) return;

    shownPopupIds.current.add(newNotification.id);

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    setPopupNotification(newNotification);

    const rafId = requestAnimationFrame(() => {
      setPopupVisible(true);
    });

    hideTimerRef.current = setTimeout(() => {
      setPopupVisible(false);
      setTimeout(() => {
        setPopupNotification(null);
      }, 300);
    }, 5000);

    return () => {
      cancelAnimationFrame(rafId);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [notifications, isLoading]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const closePopup = () => {
    setPopupVisible(false);
    window.setTimeout(() => {
      setPopupNotification(null);
    }, 300);
  };

  const handlePopupClick = () => {
    if (!popupNotification) return;
    const notification = popupNotification;
    closePopup();
    handleNotificationClick(notification);
  };

  const popupIconData = popupNotification
    ? getNotificationIcon(popupNotification.type)
    : null;

  const PopupIcon = popupIconData?.icon;

  return (
    <>
      {/* FLOATING AUTO NOTIFICATION (Compact & Sleek) */}
      {popupNotification && popupIconData && (
        <div
          className={cn(
            "fixed top-4 left-1/2 -translate-x-1/2 z-[9999] w-[92%] max-w-sm",
            "transition-all duration-300 ease-out",
            popupVisible
              ? "translate-y-0 opacity-100 scale-100"
              : "-translate-y-4 opacity-0 scale-95 pointer-events-none"
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/80",
              "bg-background/95 backdrop-blur-md shadow-lg",
              "cursor-pointer transition-all hover:border-primary/40"
            )}
            onClick={handlePopupClick}
          >
            <div className="flex items-center gap-2.5 p-2.5">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  popupIconData.bg
                )}
              >
                {PopupIcon ? (
                  <PopupIcon className={cn("h-3.5 w-3.5", popupIconData.className)} />
                ) : (
                  <span className="text-xs">{popupIconData.emoji}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    New Notification
                  </span>
                  <span className="text-[10px] text-muted-foreground/80 shrink-0">
                    {formatDistanceToNow(new Date(popupNotification.created_at), {
                      addSuffix: false,
                    })}
                  </span>
                </div>

                <p className="text-xs font-semibold text-foreground truncate leading-snug">
                  {popupNotification.title}{" "}
                  <span className="font-normal text-muted-foreground">
                    — {popupNotification.message}
                  </span>
                </p>
              </div>

              <button
                type="button"
                aria-label="Close notification"
                onClick={(event) => {
                  event.stopPropagation();
                  closePopup();
                }}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="h-[2px] w-full bg-muted/50">
              <div
                className={cn(
                  "h-full bg-primary/80",
                  popupVisible
                    ? "animate-[notification-progress_5s_linear_forwards]"
                    : "w-0"
                )}
              />
            </div>
          </div>
        </div>
      )}

      {/* HEADER BELL */}
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
          <div className="flex items-center justify-between border-b p-4">
            <div>
              <h3 className="font-semibold">Notifications</h3>
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
                  const iconData = getNotificationIcon(notification.type);
                  const Icon = iconData.icon;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "w-full text-left p-4 transition-colors hover:bg-muted/50",
                        !notification.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            iconData.bg
                          )}
                        >
                          <Icon className={cn("h-4 w-4", iconData.className)} />
                        </div>

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

                          <p className="mt-2 text-xs text-muted-foreground/70">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              { addSuffix: true }
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

      <style>{`
        @keyframes notification-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
};
