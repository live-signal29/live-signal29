import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsInbox() {
  const { notifications, unreadCount, isLoading, markAllAsRead, handleNotificationClick } =
    useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "coupon":
        return "🎉";
      case "signal":
        return "📊";
      case "system":
        return "🔔";
      default:
        return "ℹ️";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notifications</CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount} unread
              </Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[520px]">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-10 text-center">
              <Bell className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={
                    "w-full text-left p-4 hover:bg-muted/50 transition-colors " +
                    (!notification.read ? "bg-primary/5" : "")
                  }
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm">{notification.title}</p>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{notification.message}</p>
                      <p className="text-xs text-muted-foreground/70 mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 text-center">
              <p className="text-xs text-muted-foreground">Showing last 50 notifications</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
