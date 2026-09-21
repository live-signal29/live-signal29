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
          className: "text-amber-400",
          bg: "bg-amber-500/15",
        };

      case "signal":
        return {
          icon: BarChart3,
          emoji: "📊",
          className: "text-emerald-400",
          bg: "bg-emerald-500/15",
        };

      case "system":
        return {
          icon: Bell,
          emoji: "🔔",
          className: "text-blue-400",
          bg: "bg-blue-500/15",
        };

      default:
        return {
          icon: Info,
          emoji: "ℹ️",
          className: "text-sky-400",
          bg: "bg-sky-500/15",
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

    // ⬇️ TIME REDUCED: 5s → 3s
    hideTimerRef.current = setTimeout(() => {
      setPopupVisible(false);
      setTimeout(() => {
        setPopupNotification(null);
      }, 300);
    }, 3000);

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
      {/* FLOATING AUTO NOTIFICATION - Smaller + Below Menu Bar */}
      {popupNotification && popupIconData && (
        <div
          className={cn(
            "fixed top-14 left-3 z-[9999] w-[75%] max-w-[220px]", // ⬅️ Smaller + below menu
            "transition-all duration-300 ease-out",
            popupVisible
              ? "translate-x-0 opacity-100 scale-100"
              : "-translate-x-4 opacity-0 scale-95 pointer-events-none"
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-lg border border-slate-700/80", // ⬅️ rounded-lg
              "bg-slate-900/95 text-slate-100 backdrop-blur-md shadow-xl", // ⬅️ shadow-xl
              "cursor-pointer transition-all hover:border-slate-600"
            )}
            onClick={handlePopupClick}
          >
            <div className="flex items-center gap-1.5 p-2"> {/* ⬅️ Smaller padding */}
              <div
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-md", // ⬅️ Smaller
                  popupIconData.bg
                )}
              >
                {PopupIcon ? (
                  <PopupIcon
                    className={cn("h-2.5 w-2.5", popupIconData.className)} // ⬅️ Smaller
                  />
                ) : (
                  <span className="text-[9px]">{popupIconData.emoji}</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-emerald-400">
                    New
                  </span>
                  <span className="text-[8px] text-slate-400 shrink-0">
                    {formatDistanceToNow(
                      new Date(popupNotification.created_at),
                      { addSuffix: false }
                    )}
                  </span>
                </div>

                <p className="text-[10px] font-semibold text-slate-100 truncate leading-snug"> {/* ⬅️ Smaller */}
                  {popupNotification.title}{" "}
                  <span className="font-normal text-slate-400">
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
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <X className="h-2.5 w-2.5" /> {/* ⬅️ Smaller */}
              </button>
            </div>

            <div className="h-[1.5px] w-full bg-slate-800"> {/* ⬅️ Thinner */}
              <div
                className={cn(
                  "h-full bg-emerald-500",
                  popupVisible
                    ? "animate-[notification-progress_3s_linear_forwards]" // ⬅️ 3s
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
            className="relative !h-8 !w-8"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />

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
