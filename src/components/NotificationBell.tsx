import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Gift,
  BarChart3,
  Info,
  ArrowUpRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  /* ---------------------------------------------
     NEW NOTIFICATION MINI TOAST
  --------------------------------------------- */

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
    }

    setPopupNotification(newNotification);

    const rafId = requestAnimationFrame(() => {
      setPopupVisible(true);
    });

    hideTimerRef.current = setTimeout(() => {
      setPopupVisible(false);

      setTimeout(() => {
        setPopupNotification(null);
      }, 250);
    }, 3000);

    return () => {
      cancelAnimationFrame(rafId);

      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
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
    }, 250);
  };

  const handlePopupClick = () => {
    if (!popupNotification) return;

    const notification = popupNotification;

    closePopup();

    handleNotificationClick(notification);
  };

  /* ---------------------------------------------
     OPEN / CLOSE NOTIFICATION PANEL
  --------------------------------------------- */

  const openNotifications = () => {
    setOpen(true);

    // Notification open hote hi automatically read
    if (unreadCount > 0) {
      void markAllAsRead();
    }
  };

  const closeNotifications = () => {
    setOpen(false);
  };

  const handleNotificationItemClick = (
    notification: (typeof notifications)[number]
  ) => {
    handleNotificationClick(notification);
    setOpen(false);
  };

  const popupIconData = popupNotification
    ? getNotificationIcon(popupNotification.type)
    : null;

  const PopupIcon = popupIconData?.icon;

  return (
    <>
      {/* =====================================================
          SMALL LIVE NOTIFICATION TOAST
      ===================================================== */}

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
                  <PopupIcon
                    className={cn(
                      "h-4 w-4",
                      popupIconData.className
                    )}
                  />
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
                      {
                        addSuffix: true,
                      }
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

      {/* =====================================================
          BELL BUTTON
      ===================================================== */}

      <Button
        variant="ghost"
        size="icon"
        onClick={open ? closeNotifications : openNotifications}
        className={cn(
          "relative !h-8 !w-8 rounded-full transition-all",
          open
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted"
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-[18px] w-[18px]" />

        {unreadCount > 0 && !open && (
          <Badge
            variant="destructive"
            className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full px-1 text-[9px] font-bold shadow-sm"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* =====================================================
          NOTIFICATION OVERLAY
          Dashboard / Footer par kahin bhi tap = CLOSE
      ===================================================== */}

      {open && (
        <>
          {/* Invisible click layer */}
          <div
            className="fixed inset-0 z-[80] bg-black/[0.025]"
            onPointerDown={closeNotifications}
            aria-hidden="true"
          />

          {/* =================================================
              NOTIFICATION PANEL
          ================================================= */}

          <div
            className={cn(
              "fixed z-[90]",
              "left-3 right-3 bottom-[78px]",
              "mx-auto w-auto max-w-[650px]",
              "overflow-hidden rounded-[24px]",
              "border border-emerald-100/80 dark:border-emerald-900/40",
              "bg-[#f7fbfa] dark:bg-slate-950/95",
              "shadow-[0_18px_55px_rgba(15,23,42,0.16)]",
              "backdrop-blur-xl",
              "animate-in slide-in-from-bottom-4 fade-in duration-200"
            )}
            onPointerDown={(event) => {
              // Panel ke andar tap karne se overlay close na ho
              event.stopPropagation();
            }}
          >
            {/* ==============================================
                PANEL HEADER
            ============================================== */}

            <div className="flex items-center justify-between border-b border-emerald-100/70 bg-emerald-50/45 px-4 py-3.5 dark:border-emerald-900/30 dark:bg-emerald-950/10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Bell className="h-[19px] w-[19px] text-emerald-600 dark:text-emerald-400" />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
                      Notifications
                    </h3>

                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Live
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Your latest account & signal updates
                  </p>
                </div>
              </div>

              {/* X button */}
              <button
                type="button"
                onClick={closeNotifications}
                aria-label="Close notifications"
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* ==============================================
                NOTIFICATION LIST
            ============================================== */}

            <ScrollArea className="h-[min(470px,62vh)]">
              {isLoading ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10">
                    <Bell className="h-6 w-6 text-emerald-500/60" />
                  </div>

                  <p className="text-sm font-semibold">
                    All caught up
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    No notifications yet.
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => {
                    const iconData = getNotificationIcon(
                      notification.type
                    );

                    const Icon = iconData.icon;

                    return (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() =>
                          handleNotificationItemClick(notification)
                        }
                        className={cn(
                          "group mb-1 flex w-full gap-3 rounded-xl p-3 text-left",
                          "transition-all duration-150",
                          "hover:bg-white/80 dark:hover:bg-white/[0.04]",
                          "active:scale-[0.995]",
                          !notification.read &&
                            "bg-emerald-500/[0.035]"
                        )}
                      >
                        {/* Icon */}
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                            iconData.bg
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-[17px] w-[17px]",
                              iconData.className
                            )}
                          />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-[12px] font-bold text-slate-900 dark:text-white sm:text-[13px]">
                              {notification.title}
                            </p>

                            {!notification.read && (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            )}
                          </div>

                          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 sm:text-xs">
                            {notification.message}
                          </p>

                          <div className="mt-1.5 flex items-center gap-1 text-[9px] text-slate-400">
                            {formatDistanceToNow(
                              new Date(notification.created_at),
                              {
                                addSuffix: true,
                              }
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

            {/* ==============================================
                FOOTER
            ============================================== */}

            {notifications.length > 0 && (
              <div className="flex items-center justify-between border-t border-emerald-100/70 bg-white/50 px-4 py-2.5 dark:border-emerald-900/30 dark:bg-white/[0.02]">
                <p className="text-[10px] text-slate-400">
                  Showing latest 50 notifications
                </p>

                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  All read
                </span>
              </div>
            )}
          </div>
        </>
      )}

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

export default NotificationBell;
