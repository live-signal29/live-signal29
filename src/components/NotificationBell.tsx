import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCheck,
  X,
  Gift,
  BarChart3,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const [open, setOpen] = useState(false);
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
          className: "text-amber-500",
          bg: "bg-amber-500/10",
        };
      case "signal":
        return {
          icon: BarChart3,
          className: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-500/10",
        };
      case "system":
        return {
          icon: Bell,
          className: "text-blue-500",
          bg: "bg-blue-500/10",
        };
      default:
        return {
          icon: Info,
          className: "text-sky-500",
          bg: "bg-sky-500/10",
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

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setPopupNotification(newNotification);
    const rafId = requestAnimationFrame(() => setPopupVisible(true));

    hideTimerRef.current = setTimeout(() => {
      setPopupVisible(false);
      setTimeout(() => setPopupNotification(null), 250);
    }, 3000);

    return () => {
      cancelAnimationFrame(rafId);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [notifications, isLoading]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const closePopup = () => {
    setPopupVisible(false);
    window.setTimeout(() => setPopupNotification(null), 250);
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

  const handlePopoverChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    // Opening the inbox means the user has seen the notifications.
    if (nextOpen && unreadCount > 0) {
      void markAllAsRead();
    }
  };

  return (
    <>
      {/* Small, unobtrusive live notification toast */}
      {popupNotification && popupIconData && (
        <div
          className={cn(
            "fixed left-3 top-14 z-[9999] w-[min(330px,calc(100vw-24px))]",
            "transition-all duration-300 ease-out",
            popupVisible
              ? "translate-x-0 scale-100 opacity-100"
              : "-translate-x-4 scale-95 opacity-0 pointer-events-none"
          )}
        >
          <div
            onClick={handlePopupClick}
            className="relative cursor-pointer overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/95 text-slate-100 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 p-3">
              <div
                className={cn(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                  popupIconData.bg
                )}
              >
                {PopupIcon && (
                  <PopupIcon className={cn("h-4 w-4", popupIconData.className)} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    New notification
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {formatDistanceToNow(
                      new Date(popupNotification.created_at),
                      { addSuffix: true }
                    )}
                  </span>
                </div>
                <p className="truncate text-xs font-semibold">
                  {popupNotification.title}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {popupNotification.message}
                </p>
              </div>

              <button
                type="button"
                aria-label="Close notification"
                onClick={(event) => {
                  event.stopPropagation();
                  closePopup();
                }}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="h-0.5 w-full bg-white/10">
              <div
                className={cn(
                  "h-full bg-emerald-500",
                  popupVisible &&
                    "animate-[notification-progress_3s_linear_forwards]"
                )}
              />
            </div>
          </div>
        </div>
      )}

      <Popover open={open} onOpenChange={handlePopoverChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative !h-8 !w-8 rounded-full hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="h-[18px] w-[18px]" />

            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[9px] font-bold shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={10}
          className="w-[min(410px,calc(100vw-20px))] overflow-hidden rounded-2xl border border-border/70 bg-background/95 p-0 shadow-2xl backdrop-blur-xl"
        >
          {/* Professional compact header */}
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/25 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-[18px] w-[18px] text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight">
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Your latest account & signal updates
                </p>
              </div>
            </div>

            {/* Close button: user no longer needs to click the bell again */}
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[min(430px,65vh)]">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                  <Bell className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-semibold">All caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No notifications yet.
                </p>
              </div>
            ) : (
              <div className="p-2">
                {notifications.map((notification) => {
                  const iconData = getNotificationIcon(notification.type);
                  const Icon = iconData.icon;

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className={cn(
                        "group mb-1 flex w-full gap-3 rounded-xl p-3 text-left transition-all",
                        "hover:bg-muted/70 active:scale-[0.99]",
                        !notification.read && "bg-primary/[0.045]"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          iconData.bg
                        )}
                      >
                        <Icon className={cn("h-4 w-4", iconData.className)} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-xs font-bold">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>

                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
                          {notification.message}
                        </p>

                        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(
                            new Date(notification.created_at),
                            { addSuffix: true }
                          )}
                          <ArrowUpRight className="h-3 w-3 opacity-0 transition group-hover:opacity-60" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5">
              <p className="text-[10px] text-muted-foreground">
                Showing latest 50 notifications
              </p>
              {unreadCount > 0 ? (
                <span className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <CheckCheck className="h-3.5 w-3.5" />
                  Seen automatically
                </span>
              ) : (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                  All read
                </span>
              )}
            </div>
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

export default NotificationBell;
