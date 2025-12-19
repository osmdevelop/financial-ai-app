import { useNotifications, AppNotification } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    case "warning":
      return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    default:
      return <Info className="h-3.5 w-3.5 text-blue-500" />;
  }
}

export function NotificationBell() {
  const { recentNotifications, unreadCount, markAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          data-testid="notif-bell"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center font-medium"
              data-testid="notif-count"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[300px]">
          {recentNotifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">
              No notifications yet
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notif) => (
                <NotificationItem
                  key={notif.id}
                  notification={notif}
                  onMarkRead={() => markAsRead(notif.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t">
          <Link href="/notifications">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-center"
              data-testid="link-view-all-notifications"
            >
              View all
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: () => void;
}

function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  return (
    <div
      className={cn(
        "p-3 hover:bg-muted/50 cursor-pointer transition-colors",
        !notification.read && "bg-primary/5"
      )}
      onClick={onMarkRead}
      data-testid={`notif-item-${notification.id}`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5">{getSeverityIcon(notification.severity)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn("text-sm font-medium truncate", !notification.read && "text-primary")}>
              {notification.title}
            </span>
            {!notification.read && (
              <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {notification.read ? null : (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onMarkRead();
            }}
          >
            <Check className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
