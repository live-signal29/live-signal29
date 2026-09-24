import {
  Bell,
  CheckCheck,
  Gift,
  BarChart3,
  Info,
  ArrowUpRight,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function NotificationsInbox() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAllAsRead,
    handleNotificationClick,
  } = useNotifications();

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

  return (
    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/60 bg-muted/20 px-4 py-3 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Bell className="h-[18px] w-[18px] text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold">
                  Notifications
                </CardTitle>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Account, signal and system updates
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-primary transition hover:bg-primary/10"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[min(560px,70vh)]">
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
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        iconData.bg
                      )}
                    >
                      <Icon className={cn("h-4 w-4", iconData.className)} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 text-xs font-bold sm:text-sm">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>

                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
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
          <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              Showing latest 50 notifications
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
